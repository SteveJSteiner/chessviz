"""Command line interface for chessviz-builder."""

from __future__ import annotations

import argparse
import importlib
import os
import platform

from chessviz_builder.config import ARTIFACT_ROOT_ENV, load_builder_workspace
from chessviz_builder.contracts import CorpusDeclaration
from chessviz_builder.pipeline import create_placeholder_pipeline

REQUIRED_IMPORTS = ("chess", "chess.pgn", "chess.engine")


def run_env_check() -> int:
    """Run environment checks for N00a bootstrap validation."""
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
    dry_run = pipeline.dry_run(
        CorpusDeclaration(
            source_name="bootstrap-placeholder",
            version="N00",
            location="artifacts/README.md",
        )
    )

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
        "placeholder pipeline: "
        f"{len(dry_run.occurrences)} occurrence(s), "
        f"{len(dry_run.dag.edges)} edge(s), "
        f"{len(dry_run.labels)} label(s), "
        f"{len(dry_run.embedding.coordinates)} coordinate(s)"
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
