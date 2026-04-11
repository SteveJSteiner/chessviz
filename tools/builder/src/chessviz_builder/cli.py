"""Command line interface for chessviz-builder."""

from __future__ import annotations

import argparse
import importlib
import os
import platform

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

    stockfish_bin = os.getenv("CHESSVIZ_STOCKFISH_BIN")
    syzygy_dir = os.getenv("CHESSVIZ_SYZYGY_DIR")

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
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
