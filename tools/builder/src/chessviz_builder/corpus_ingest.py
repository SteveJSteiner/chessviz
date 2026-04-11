"""Placeholder corpus ingestion seam for the builder package."""

from __future__ import annotations

import chess

from .contracts import (
    CorpusDeclaration,
    OccurrenceIdentityProvider,
    OccurrenceRecord,
    StateKeyProvider,
)


class PlaceholderCorpusIngestor:
    def __init__(
        self,
        state_key_provider: StateKeyProvider,
        identity_provider: OccurrenceIdentityProvider,
    ) -> None:
        self.state_key_provider = state_key_provider
        self.identity_provider = identity_provider

    def ingest(self, declaration: CorpusDeclaration) -> tuple[OccurrenceRecord, ...]:
        board = chess.Board()
        state_key = self.state_key_provider.key_for_board(board)
        seed_path = ("corpus", declaration.source_name.lower().replace(" ", "-"))
        return (self.identity_provider.identify(state_key, seed_path),)