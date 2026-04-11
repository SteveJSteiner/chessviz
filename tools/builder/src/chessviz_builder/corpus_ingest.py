"""Placeholder corpus ingestion seam for the builder package."""

from __future__ import annotations

from .contracts import CorpusDeclaration, OccurrenceIdentityProvider, OccurrenceRecord


class PlaceholderCorpusIngestor:
    def __init__(self, identity_provider: OccurrenceIdentityProvider) -> None:
        self._identity_provider = identity_provider

    def ingest(self, declaration: CorpusDeclaration) -> tuple[OccurrenceRecord, ...]:
        seed_path = ("corpus", declaration.source_name.lower().replace(" ", "-"))
        return (self._identity_provider.identify("startpos", seed_path),)