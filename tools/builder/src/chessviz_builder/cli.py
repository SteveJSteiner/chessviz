"""Command line interface for chessviz-builder."""

from __future__ import annotations

import argparse
import importlib
import os
import platform
from pathlib import Path
from typing import Sequence

import chess

from chessviz_builder.artifact_manifest import (
    write_endgame_table_assets,
    write_fixture_artifacts,
    write_opening_table_assets,
    write_web_corpus_artifacts,
)
from chessviz_builder.config import ARTIFACT_ROOT_ENV, load_builder_workspace
from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline

REQUIRED_IMPORTS = ("chess", "chess.pgn", "chess.engine")


def run_env_check() -> int:
    """Run builder environment and fixture-ingestion checks."""
    print(f"Python version: {platform.python_version()}")

    failed_imports: list[str] = []
    for module_name in REQUIRED_IMPORTS:
        try:
            importlib.import_module(module_name)
            print(f"import ok: {module_name}")
        except ImportError:
            failed_imports.append(module_name)
            print(f"import failed: {module_name}")

    workspace = load_builder_workspace()
    pipeline = create_placeholder_pipeline(workspace)
    declaration = initial_corpus_declaration()
    dry_run = pipeline.dry_run(declaration)

    artifact_root = os.getenv(ARTIFACT_ROOT_ENV)
    stockfish_bin = os.getenv("CHESSVIZ_STOCKFISH_BIN")
    syzygy_dir = os.getenv("CHESSVIZ_SYZYGY_DIR")

    print(
        "CHESSVIZ_ARTIFACT_ROOT: "
        + (artifact_root if artifact_root else f"{workspace.artifact_root} (default)")
    )
    print(f"builder manifest: {workspace.builder_manifest}")
    print(f"viewer manifest: {workspace.viewer_scene_manifest}")
    print(f"opening table manifest: {workspace.opening_table_manifest}")
    print(f"endgame table manifest: {workspace.endgame_table_manifest}")
    print(f"web corpus manifest: {workspace.web_corpus_manifest}")
    print(
        "declared corpus: "
        f"{declaration.source_name} {declaration.version} @ {declaration.location}"
    )
    print(
        "sample start-state key: "
        + pipeline.state_key_provider.key_for_board(chess.Board())
    )
    print(
        "fixture ingestion: "
        f"{len(dry_run.ingested_corpus.games)} game(s), "
        f"{len(dry_run.occurrences)} occurrence(s), "
        f"{len(dry_run.ingested_corpus.transitions)} transition(s), "
        f"{len(dry_run.departure_rules.records)} departure rule(s), "
        f"{len(dry_run.labels.records)} label record(s), "
        f"{len(dry_run.labels.phases)} phase band(s), "
        f"{len(dry_run.labels.material_signatures)} material signature(s), "
        f"{len(dry_run.terminal_labels.records)} terminal label(s), "
        f"{len(dry_run.terminal_labels.anchors)} terminal anchor(s), "
        f"{len(dry_run.salience.records)} salience record(s), "
        f"top_frontier={len(dry_run.salience.priority_frontier)}, "
        f"{len(dry_run.embedding.coordinates)} coordinate(s)"
    )
    print(
        "repeated-state surface: "
        f"{len(dry_run.repeated_state_query_surface.repeated_relations)} repeated relation(s), "
        f"{len(dry_run.repeated_state_query_surface.singleton_relations)} singleton relation(s)"
    )
    print(
        "dag metrics: "
        f"{dry_run.dag.metrics.node_count} node(s), "
        f"{dry_run.dag.metrics.edge_count} edge(s), "
        f"roots={dry_run.dag.metrics.root_count}, "
        f"leaves={dry_run.dag.metrics.leaf_count}, "
        f"max_out={dry_run.dag.metrics.max_out_degree}, "
        f"max_in={dry_run.dag.metrics.max_in_degree}, "
        f"max_state_convergence={dry_run.dag.metrics.max_state_convergence}"
    )
    print(
        "embedding config: "
        f"seed={dry_run.embedding.config.seed}, "
        f"max_radius={dry_run.embedding.config.max_radius}, "
        f"radial_scale={dry_run.embedding.config.radial_scale}"
    )

    print(
        "CHESSVIZ_STOCKFISH_BIN: "
        + ("set" if stockfish_bin else "unset (optional for N00a)")
    )
    print(
        "CHESSVIZ_SYZYGY_DIR: "
        + ("set" if syzygy_dir else "unset (optional for N00a)")
    )

    return 0 if not failed_imports else 1


def run_export_fixture_artifacts() -> int:
    """Write builder/runtime fixture manifests for viewer-side exploration."""
    workspace = load_builder_workspace()
    pipeline = create_placeholder_pipeline(workspace)
    dry_run = pipeline.dry_run(initial_corpus_declaration())
    builder_manifest, viewer_scene_manifest = write_fixture_artifacts(
        workspace,
        dry_run,
    )

    print(f"builder manifest written: {builder_manifest}")
    print(f"viewer manifest written: {viewer_scene_manifest}")
    return 0


def run_import_opening_book(source: Path) -> int:
    """Normalize an opening import source into project-owned table assets."""
    workspace = load_builder_workspace()
    dry_run = _load_pipeline_dry_run(workspace)
    published = write_opening_table_assets(workspace, dry_run, source)

    print(f"opening table manifest written: {published.manifest_path}")
    print(f"opening table manifest hash: {published.manifest_hash}")
    return 0


def run_import_endgame_table(source: Path) -> int:
    """Normalize an endgame import source into project-owned table assets."""
    workspace = load_builder_workspace()
    dry_run = _load_pipeline_dry_run(workspace)
    published = write_endgame_table_assets(workspace, dry_run, source)

    print(f"endgame table manifest written: {published.manifest_path}")
    print(f"endgame table manifest hash: {published.manifest_hash}")
    return 0


def run_build_web_corpus(opening_source: Path, endgame_source: Path) -> int:
    """Publish combined opening/endgame table assets and a corpus manifest."""
    workspace = load_builder_workspace()
    dry_run = _load_pipeline_dry_run(workspace)
    opening_assets, endgame_assets, web_corpus_manifest, web_corpus_hash = (
        write_web_corpus_artifacts(
            workspace,
            dry_run,
            opening_source,
            endgame_source,
        )
    )

    print(f"opening table manifest written: {opening_assets.manifest_path}")
    print(f"opening table manifest hash: {opening_assets.manifest_hash}")
    print(f"endgame table manifest written: {endgame_assets.manifest_path}")
    print(f"endgame table manifest hash: {endgame_assets.manifest_hash}")
    print(f"web corpus manifest written: {web_corpus_manifest}")
    print(f"web corpus manifest hash: {web_corpus_hash}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="chessviz-builder")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("env-check", help="Validate builder runtime environment")
    subparsers.add_parser(
        "export-fixture-artifacts",
        help="Write fixture-owned builder and viewer manifests",
    )
    import_opening_parser = subparsers.add_parser(
        "import-opening-book",
        help="Normalize an opening import source into project-owned web shards",
    )
    import_opening_parser.add_argument(
        "--source",
        required=True,
        help="Path to the builder-only opening import source JSON",
    )
    import_endgame_parser = subparsers.add_parser(
        "import-endgame-table",
        help="Normalize an endgame import source into project-owned web shards",
    )
    import_endgame_parser.add_argument(
        "--source",
        required=True,
        help="Path to the builder-only endgame import source JSON",
    )
    build_web_corpus_parser = subparsers.add_parser(
        "build-web-corpus",
        help="Publish opening/endgame project-owned shards and a combined corpus manifest",
    )
    build_web_corpus_parser.add_argument(
        "--opening-source",
        required=True,
        help="Path to the builder-only opening import source JSON",
    )
    build_web_corpus_parser.add_argument(
        "--endgame-source",
        required=True,
        help="Path to the builder-only endgame import source JSON",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "env-check":
        return run_env_check()

    if args.command == "export-fixture-artifacts":
        return run_export_fixture_artifacts()

    if args.command == "import-opening-book":
        return run_import_opening_book(Path(args.source))

    if args.command == "import-endgame-table":
        return run_import_endgame_table(Path(args.source))

    if args.command == "build-web-corpus":
        return run_build_web_corpus(
            Path(args.opening_source),
            Path(args.endgame_source),
        )

    parser.error(f"unknown command: {args.command}")


def _load_pipeline_dry_run(workspace):
    pipeline = create_placeholder_pipeline(workspace)
    return pipeline.dry_run(initial_corpus_declaration())


if __name__ == "__main__":
    raise SystemExit(main())
