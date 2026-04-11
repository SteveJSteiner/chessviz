"""Placeholder builder pipeline wiring for N00."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .config import load_builder_workspace
from .contracts import BuilderWorkspace, CorpusDeclaration, DagArtifact, EmbeddingArtifact, OccurrenceRecord
from .corpus_ingest import PlaceholderCorpusIngestor
from .dag import PlaceholderDagBuilder
from .embedding import PlaceholderEmbeddingBuilder
from .labeling import PlaceholderOccurrenceLabeler
from .occurrence_identity import StableOccurrenceIdentity
from .state_key import CanonicalStateKeyProvider


@dataclass(frozen=True)
class PipelineDryRun:
    occurrences: tuple[OccurrenceRecord, ...]
    dag: DagArtifact
    labels: Mapping[str, str]
    embedding: EmbeddingArtifact


@dataclass(frozen=True)
class BuilderPipeline:
    workspace: BuilderWorkspace
    state_key_provider: CanonicalStateKeyProvider
    identity_provider: StableOccurrenceIdentity
    corpus_ingestor: PlaceholderCorpusIngestor
    dag_builder: PlaceholderDagBuilder
    labeler: PlaceholderOccurrenceLabeler
    embedding_builder: PlaceholderEmbeddingBuilder

    def dry_run(self, declaration: CorpusDeclaration) -> PipelineDryRun:
        occurrences = self.corpus_ingestor.ingest(declaration)
        dag = self.dag_builder.build(declaration, occurrences)
        labels = self.labeler.label(dag)
        embedding = self.embedding_builder.build(dag)
        return PipelineDryRun(
            occurrences=occurrences,
            dag=dag,
            labels=labels,
            embedding=embedding,
        )


def create_placeholder_pipeline(
    workspace: BuilderWorkspace | None = None,
) -> BuilderPipeline:
    resolved_workspace = workspace or load_builder_workspace()
    state_key_provider = CanonicalStateKeyProvider()
    identity_provider = StableOccurrenceIdentity()
    return BuilderPipeline(
        workspace=resolved_workspace,
        state_key_provider=state_key_provider,
        identity_provider=identity_provider,
        corpus_ingestor=PlaceholderCorpusIngestor(state_key_provider, identity_provider),
        dag_builder=PlaceholderDagBuilder(),
        labeler=PlaceholderOccurrenceLabeler(),
        embedding_builder=PlaceholderEmbeddingBuilder(),
    )