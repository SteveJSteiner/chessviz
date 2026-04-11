"""Placeholder builder pipeline wiring."""

from __future__ import annotations

from dataclasses import dataclass

from .config import load_builder_workspace
from .contracts import (
    BuilderWorkspace,
    CorpusDeclaration,
    DagArtifact,
    EmbeddingArtifact,
    IngestedCorpus,
    OccurrenceLabelQuerySurface,
    OccurrenceRecord,
    RepeatedStateQuerySurface,
    TerminalLabelQuerySurface,
)
from .corpus_ingest import DeclaredCorpusIngestor
from .dag import OccurrenceDagBuilder
from .embedding import PlaceholderEmbeddingBuilder
from .labeling import PhaseMaterialOccurrenceLabeler
from .occurrence_identity import StableOccurrenceIdentity
from .repeated_state import RepeatedStateQuerySurfaceBuilder
from .state_key import CanonicalStateKeyProvider
from .terminal_labeling import TerminalOutcomeLabeler


@dataclass(frozen=True)
class PipelineDryRun:
    ingested_corpus: IngestedCorpus
    occurrences: tuple[OccurrenceRecord, ...]
    repeated_state_query_surface: RepeatedStateQuerySurface
    dag: DagArtifact
    labels: OccurrenceLabelQuerySurface
    terminal_labels: TerminalLabelQuerySurface
    embedding: EmbeddingArtifact


@dataclass(frozen=True)
class BuilderPipeline:
    workspace: BuilderWorkspace
    state_key_provider: CanonicalStateKeyProvider
    identity_provider: StableOccurrenceIdentity
    corpus_ingestor: DeclaredCorpusIngestor
    repeated_state_query_builder: RepeatedStateQuerySurfaceBuilder
    dag_builder: OccurrenceDagBuilder
    labeler: PhaseMaterialOccurrenceLabeler
    terminal_labeler: TerminalOutcomeLabeler
    embedding_builder: PlaceholderEmbeddingBuilder

    def dry_run(self, declaration: CorpusDeclaration) -> PipelineDryRun:
        ingested_corpus = self.corpus_ingestor.ingest(declaration)
        repeated_state_query_surface = self.repeated_state_query_builder.build(
            ingested_corpus
        )
        dag = self.dag_builder.build(
            declaration,
            ingested_corpus,
            repeated_state_query_surface,
        )
        labels = self.labeler.label(dag)
        terminal_labels = self.terminal_labeler.label(ingested_corpus)
        embedding = self.embedding_builder.build(dag)
        return PipelineDryRun(
            ingested_corpus=ingested_corpus,
            occurrences=ingested_corpus.occurrences,
            repeated_state_query_surface=repeated_state_query_surface,
            dag=dag,
            labels=labels,
            terminal_labels=terminal_labels,
            embedding=embedding,
        )


def create_placeholder_pipeline(
    workspace: BuilderWorkspace | None = None,
) -> BuilderPipeline:
    resolved_workspace = workspace or load_builder_workspace()
    state_key_provider = CanonicalStateKeyProvider()
    identity_provider = StableOccurrenceIdentity()
    repeated_state_query_builder = RepeatedStateQuerySurfaceBuilder()
    return BuilderPipeline(
        workspace=resolved_workspace,
        state_key_provider=state_key_provider,
        identity_provider=identity_provider,
        corpus_ingestor=DeclaredCorpusIngestor(
            resolved_workspace.repository_root,
            state_key_provider,
            identity_provider,
        ),
        repeated_state_query_builder=repeated_state_query_builder,
        dag_builder=OccurrenceDagBuilder(),
        labeler=PhaseMaterialOccurrenceLabeler(),
        terminal_labeler=TerminalOutcomeLabeler(),
        embedding_builder=PlaceholderEmbeddingBuilder(),
    )