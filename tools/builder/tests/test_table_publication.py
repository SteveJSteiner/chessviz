"""Fixture-backed checks for N11d table asset publication."""

from __future__ import annotations

import io
import json
import os
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from chessviz_builder.artifact_manifest import (
    PUBLISHED_ASSET_SCHEMA_VERSION,
    write_web_corpus_artifacts,
)
from chessviz_builder.cli import main
from chessviz_builder.config import ARTIFACT_ROOT_ENV, load_builder_workspace
from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.labeling import ENDGAME_PHASE, OPENING_PHASE
from chessviz_builder.pipeline import create_placeholder_pipeline


class TablePublicationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.dry_run = self.pipeline.dry_run(initial_corpus_declaration())

    def test_web_corpus_publication_is_deterministic_and_project_owned(self) -> None:
        with TemporaryDirectory() as source_dir, TemporaryDirectory() as first_artifact_dir:
            opening_source, endgame_source = self._write_import_sources(Path(source_dir))
            (
                first_corpus_manifest,
                first_opening_manifest,
                first_endgame_manifest,
                opening_shard_payload,
                endgame_shard_payload,
                first_hashes,
            ) = (
                self._publish_assets(
                    Path(first_artifact_dir),
                    opening_source,
                    endgame_source,
                )
            )

            self.assertEqual(
                first_corpus_manifest["schemaVersion"],
                PUBLISHED_ASSET_SCHEMA_VERSION,
            )
            self.assertEqual(
                first_opening_manifest["schemaVersion"],
                PUBLISHED_ASSET_SCHEMA_VERSION,
            )
            self.assertEqual(
                first_endgame_manifest["schemaVersion"],
                PUBLISHED_ASSET_SCHEMA_VERSION,
            )
            self.assertEqual(
                {asset["regimeId"] for asset in first_corpus_manifest["publishedTableAssets"]},
                {"opening-table", "endgame-table"},
            )
            self.assertEqual(first_opening_manifest["regimeId"], "opening-table")
            self.assertEqual(first_endgame_manifest["regimeId"], "endgame-table")
            self.assertGreaterEqual(first_opening_manifest["positionCount"], 2)
            self.assertGreaterEqual(first_endgame_manifest["positionCount"], 2)
            self.assertEqual(len(first_opening_manifest["shards"]), first_opening_manifest["shardCount"])
            self.assertEqual(len(first_endgame_manifest["shards"]), first_endgame_manifest["shardCount"])

            opening_entry = opening_shard_payload["entries"][0]
            endgame_entry = endgame_shard_payload["entries"][0]
            self.assertIn("positionKey", opening_entry)
            self.assertIn("moves", opening_entry)
            self.assertIn("weight", opening_entry["moves"][0])
            self.assertIn("frequency", opening_entry["moves"][0])
            self.assertNotIn("board_state", opening_entry)
            self.assertNotIn("book_weight", opening_entry["moves"][0])
            self.assertNotIn("sample_count", opening_entry["moves"][0])
            self.assertNotIn("next_board_state", opening_entry["moves"][0])

            self.assertIn("positionKey", endgame_entry)
            self.assertIn("materialSignature", endgame_entry)
            self.assertIn("terminalPayload", endgame_entry)
            self.assertIn("score", endgame_entry)
            self.assertNotIn("board_state", endgame_entry)
            self.assertNotIn("material_class", endgame_entry)
            self.assertNotIn("wdl_code", endgame_entry)
            self.assertNotIn("dtz", endgame_entry)
            self.assertNotIn("table_score", endgame_entry)

            with TemporaryDirectory() as second_artifact_dir:
                (
                    second_corpus_manifest,
                    _,
                    _,
                    _,
                    _,
                    second_hashes,
                ) = self._publish_assets(
                    Path(second_artifact_dir),
                    opening_source,
                    endgame_source,
                )

            self.assertEqual(first_corpus_manifest, second_corpus_manifest)
            self.assertEqual(first_hashes, second_hashes)

    def test_cli_commands_publish_individual_and_combined_assets(self) -> None:
        with TemporaryDirectory() as source_dir, TemporaryDirectory() as artifact_dir:
            opening_source, endgame_source = self._write_import_sources(Path(source_dir))
            stdout = io.StringIO()

            with patch.dict(
                os.environ,
                {ARTIFACT_ROOT_ENV: str(Path(artifact_dir))},
                clear=False,
            ):
                with redirect_stdout(stdout):
                    self.assertEqual(
                        main(["import-opening-book", "--source", str(opening_source)]),
                        0,
                    )
                    self.assertEqual(
                        main(["import-endgame-table", "--source", str(endgame_source)]),
                        0,
                    )
                    self.assertEqual(
                        main(
                            [
                                "build-web-corpus",
                                "--opening-source",
                                str(opening_source),
                                "--endgame-source",
                                str(endgame_source),
                            ]
                        ),
                        0,
                    )

                workspace = load_builder_workspace()
                self.assertTrue(workspace.opening_table_manifest.exists())
                self.assertTrue(workspace.endgame_table_manifest.exists())
                self.assertTrue(workspace.web_corpus_manifest.exists())

            command_output = stdout.getvalue()
            self.assertIn("opening table manifest written", command_output)
            self.assertIn("endgame table manifest written", command_output)
            self.assertIn("web corpus manifest written", command_output)

    def _publish_assets(
        self,
        artifact_root: Path,
        opening_source: Path,
        endgame_source: Path,
    ) -> tuple[
        dict[str, object],
        dict[str, object],
        dict[str, object],
        dict[str, object],
        dict[str, object],
        tuple[str, str, str],
    ]:
        with patch.dict(
            os.environ,
            {ARTIFACT_ROOT_ENV: str(artifact_root)},
            clear=False,
        ):
            workspace = load_builder_workspace()
            opening_assets, endgame_assets, web_corpus_path, web_corpus_hash = (
                write_web_corpus_artifacts(
                    workspace,
                    self.dry_run,
                    opening_source,
                    endgame_source,
                )
            )

        web_corpus_manifest = json.loads(web_corpus_path.read_text(encoding="utf-8"))
        opening_manifest = json.loads(
            opening_assets.manifest_path.read_text(encoding="utf-8")
        )
        endgame_manifest = json.loads(
            endgame_assets.manifest_path.read_text(encoding="utf-8")
        )
        opening_shard_payload = json.loads(
            (
                opening_assets.manifest_path.parent
                / opening_manifest["shards"][0]["relativePath"]
            ).read_text(encoding="utf-8")
        )
        endgame_shard_payload = json.loads(
            (
                endgame_assets.manifest_path.parent
                / endgame_manifest["shards"][0]["relativePath"]
            ).read_text(encoding="utf-8")
        )
        return (
            web_corpus_manifest,
            opening_manifest,
            endgame_manifest,
            opening_shard_payload,
            endgame_shard_payload,
            (
                opening_assets.manifest_hash,
                endgame_assets.manifest_hash,
                web_corpus_hash,
            ),
        )

    def _write_import_sources(self, source_root: Path) -> tuple[Path, Path]:
        opening_source = source_root / "opening-import.json"
        endgame_source = source_root / "endgame-import.json"

        opening_source.write_text(
            json.dumps(self._opening_import_payload(), indent=2) + "\n",
            encoding="utf-8",
        )
        endgame_source.write_text(
            json.dumps(self._endgame_import_payload(), indent=2) + "\n",
            encoding="utf-8",
        )
        return opening_source, endgame_source

    def _opening_import_payload(self) -> dict[str, object]:
        occurrence_by_id = {
            occurrence.occurrence_id: occurrence for occurrence in self.dry_run.occurrences
        }
        records: list[dict[str, object]] = []
        seen_edges: set[tuple[str, str, str]] = set()

        for transition in self.dry_run.ingested_corpus.transitions:
            parent = occurrence_by_id[transition.parent_occurrence_id]
            child = occurrence_by_id[transition.child_occurrence_id]
            parent_label = self.dry_run.labels.by_occurrence_id(parent.occurrence_id)
            if parent_label is None or parent_label.phase != OPENING_PHASE:
                continue

            edge = (parent.state_key, transition.move_uci, child.state_key)
            if edge in seen_edges:
                continue
            seen_edges.add(edge)
            records.append(
                {
                    "board_state": parent.state_key,
                    "reply_uci": transition.move_uci,
                    "reply_san": transition.move_facts.san,
                    "book_weight": 40 + len(records),
                    "sample_count": 8 + len(records),
                    "next_board_state": child.state_key,
                    "coverage_ply": parent.ply,
                }
            )
            if len(records) >= 8:
                break

        return {
            "source_name": "fixture-opening-slice",
            "source_version": "2026-04-12.n11d.test",
            "source_location": "imports/opening/fixture-opening-slice.json",
            "source_format": "foreign-opening-book-json",
            "records": records,
        }

    def _endgame_import_payload(self) -> dict[str, object]:
        records: list[dict[str, object]] = []
        seen_state_keys: set[str] = set()
        outcomes = ["white-win", "draw", "black-win", "draw"]
        scores = [1.0, 0.0, -1.0, 0.25]

        for occurrence in self.dry_run.occurrences:
            label_record = self.dry_run.labels.by_occurrence_id(occurrence.occurrence_id)
            if label_record is None or label_record.phase != ENDGAME_PHASE:
                continue
            if occurrence.state_key in seen_state_keys:
                continue

            seen_state_keys.add(occurrence.state_key)
            index = len(records)
            records.append(
                {
                    "board_state": occurrence.state_key,
                    "material_class": label_record.material_signature,
                    "wdl_code": outcomes[index % len(outcomes)],
                    "table_score": scores[index % len(scores)],
                    "dtz": index + 1,
                }
            )
            if len(records) >= 4:
                break

        return {
            "source_name": "fixture-endgame-slice",
            "source_version": "2026-04-12.n11d.test",
            "source_location": "imports/endgame/fixture-endgame-slice.json",
            "source_format": "foreign-endgame-table-json",
            "records": records,
        }


if __name__ == "__main__":
    unittest.main()