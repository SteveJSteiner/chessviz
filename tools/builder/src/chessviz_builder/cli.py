"""Command line interface for chessviz-builder."""

from __future__ import annotations

import argparse
import importlib
import os
import platform

import chess

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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="chessviz-builder")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("env-check", help="Validate builder runtime environment")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "env-check":
        return run_env_check()

    parser.error(f"unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
