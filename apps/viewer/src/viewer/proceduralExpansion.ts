import type {
  BuilderBootstrapManifest,
  BuilderOccurrenceRecord,
  MiddlegameProceduralPolicy,
  RuntimeProceduralResolution,
  ViewerSceneManifest
} from './contracts';

export type MiddlegameProceduralExpansion = {
  policy: MiddlegameProceduralPolicy;
  resolveOccurrence: (
    occurrence: BuilderOccurrenceRecord
  ) => RuntimeProceduralResolution;
};

export const DEFAULT_MIDDLEGAME_PROCEDURAL_POLICY: MiddlegameProceduralPolicy = {
  policyId: 'n11e.adjacency-neighborhood.v1',
  expansionMode: 'adjacency-neighborhood',
  scoringMode: 'builder-salience-priority-frontier',
  pruningMode: 'radius-and-refinement-budget',
  detail:
    'Runtime middlegame fallback expands from the current occurrence over the declared adjacency surface and trims by neighborhood radius plus refinement budget.'
};

export function createMiddlegameProceduralExpansion(
  builderBootstrapManifest: BuilderBootstrapManifest,
  viewerSceneManifest: ViewerSceneManifest
): MiddlegameProceduralExpansion {
  const knownOccurrenceIds = new Set(
    builderBootstrapManifest.occurrences.map((occurrence) => occurrence.occurrenceId)
  );

  return {
    policy: DEFAULT_MIDDLEGAME_PROCEDURAL_POLICY,
    resolveOccurrence(occurrence) {
      if (!knownOccurrenceIds.has(occurrence.occurrenceId)) {
        throw new Error(
          `cannot expand unknown middlegame occurrence: ${occurrence.occurrenceId}`
        );
      }

      return {
        occurrenceId: occurrence.occurrenceId,
        policy: DEFAULT_MIDDLEGAME_PROCEDURAL_POLICY,
        defaultNeighborhoodRadius:
          viewerSceneManifest.runtime.defaultNeighborhoodRadius,
        defaultRefinementBudget:
          viewerSceneManifest.runtime.defaultRefinementBudget
      };
    }
  };
}