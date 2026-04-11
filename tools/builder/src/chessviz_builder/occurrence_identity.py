"""Stable occurrence identity implementation."""

from __future__ import annotations

from hashlib import blake2s
from typing import Sequence

from .contracts import OccurrenceRecord


class StableOccurrenceIdentity:
    """Keep occurrence identity separate from board-state identity."""

    def identify(self, state_key: str, path: Sequence[str]) -> OccurrenceRecord:
        canonical_path = tuple(path)
        digest = blake2s(
            f"{state_key}|{'/'.join(canonical_path)}".encode("utf-8"),
            digest_size=8,
        ).hexdigest()
        return OccurrenceRecord(
            occurrence_id=f"occ-{digest}",
            state_key=state_key,
            path=canonical_path,
        )