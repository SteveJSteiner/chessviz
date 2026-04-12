"""Shared JSON publication helpers for builder-owned artifacts."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any


def canonical_json_bytes(payload: Any) -> bytes:
    return json.dumps(
        payload,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def payload_sha256(payload: Any) -> str:
    return hashlib.sha256(canonical_json_bytes(payload)).hexdigest()


def write_json(path: Path, payload: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return payload_sha256(payload)


def slugify_fragment(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower())
    collapsed = normalized.strip("-")
    return collapsed or "root"


def relative_posix_path(path: Path, start: Path) -> str:
    return path.relative_to(start).as_posix()