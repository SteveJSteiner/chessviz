"""Workspace boundary configuration for the builder package."""

from __future__ import annotations

import os
from pathlib import Path

from .contracts import BuilderWorkspace

ARTIFACT_ROOT_ENV = "CHESSVIZ_ARTIFACT_ROOT"
STOCKFISH_ENV = "CHESSVIZ_STOCKFISH_BIN"
SYZYGY_ENV = "CHESSVIZ_SYZYGY_DIR"

DEFAULT_ARTIFACT_ROOT = Path("artifacts")
DEFAULT_BUILDER_MANIFEST = Path("artifacts/builder/bootstrap.json")
DEFAULT_VIEWER_SCENE_MANIFEST = Path("artifacts/viewer/scene-manifest.json")


def find_repository_root(start: Path | None = None) -> Path:
    candidate = (start or Path(__file__).resolve()).resolve()
    current = candidate if candidate.is_dir() else candidate.parent

    for path in (current, *current.parents):
        if (path / "pnpm-workspace.yaml").exists() and (
            path / "plan" / "continuation.md"
        ).exists():
            return path

    raise RuntimeError("could not locate chessviz repository root")


def load_builder_workspace() -> BuilderWorkspace:
    repository_root = find_repository_root()
    artifact_root = _resolve_path(
        repository_root, os.getenv(ARTIFACT_ROOT_ENV), DEFAULT_ARTIFACT_ROOT
    )

    return BuilderWorkspace(
        repository_root=repository_root,
        artifact_root=artifact_root,
        builder_manifest=_resolve_path(
            repository_root,
            None,
            DEFAULT_BUILDER_MANIFEST,
        ),
        viewer_scene_manifest=_resolve_path(
            repository_root,
            None,
            DEFAULT_VIEWER_SCENE_MANIFEST,
        ),
        stockfish_bin=_resolve_optional_path(repository_root, os.getenv(STOCKFISH_ENV)),
        syzygy_dir=_resolve_optional_path(repository_root, os.getenv(SYZYGY_ENV)),
    )


def _resolve_path(repository_root: Path, value: str | None, default: Path) -> Path:
    raw_path = Path(value) if value else default
    return raw_path if raw_path.is_absolute() else repository_root / raw_path


def _resolve_optional_path(repository_root: Path, value: str | None) -> Path | None:
    if not value:
        return None

    raw_path = Path(value)
    return raw_path if raw_path.is_absolute() else repository_root / raw_path