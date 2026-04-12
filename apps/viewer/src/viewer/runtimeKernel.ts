import type {
  BuilderBootstrapManifest,
  BuilderDepartureRuleRecord,
  BuilderOccurrenceRecord,
  BuilderRepeatedStateRelationRecord,
  BuilderTerminalAnchorRecord,
  BuilderTransitionRecord,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationCacheStats,
  RuntimeNeighborhoodEdge,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  RuntimeOccurrenceLine,
  RuntimeTransitionSurfaceSnapshot,
  ViewerSceneManifest
} from './contracts';
import { buildRuntimeCarrierSurface } from './carrierSurface.ts';

type NeighborhoodCacheEntry = {
  focusOccurrenceId: string;
  radius: number;
  orderedOccurrenceIds: string[];
  distanceByOccurrenceId: Map<string, number>;
};

type NeighborhoodRequest = {
  radius: number;
  refinementBudget: number;
};

type CarrierSurfaceRequest = {
  refinementBudget: number;
};

export type RuntimeExplorationKernel = {
  inspectNeighborhood: (
    focusOccurrenceId: string,
    request: NeighborhoodRequest
  ) => RuntimeNeighborhoodSnapshot;
  inspectTransitionSurface: (
    occurrenceIds: string[]
  ) => RuntimeTransitionSurfaceSnapshot;
  inspectCarrierSurface: (
    occurrenceIds: string[],
    request: CarrierSurfaceRequest
  ) => RuntimeCarrierSurfaceSnapshot;
  resolveOccurrence: (occurrenceId: string) => BuilderOccurrenceRecord | undefined;
  resolveTransition: (
    sourceOccurrenceId: string,
    targetOccurrenceId: string
  ) => BuilderTransitionRecord | undefined;
  resolveDepartureRule: (
    sourceOccurrenceId: string,
    targetOccurrenceId: string
  ) => BuilderDepartureRuleRecord | undefined;
  describeOccurrenceLine: (occurrenceId: string) => RuntimeOccurrenceLine | undefined;
  getFocusOptions: () => BuilderOccurrenceRecord[];
  getCacheStats: () => RuntimeExplorationCacheStats;
};

export function createRuntimeExplorationKernel(
  builderBootstrapManifest: BuilderBootstrapManifest,
  viewerSceneManifest: ViewerSceneManifest
): RuntimeExplorationKernel {
  if (
    builderBootstrapManifest.graphObjectId !== viewerSceneManifest.runtime.graphObjectId
  ) {
    throw new Error('graph object mismatch between builder and viewer manifests');
  }

  const occurrenceById = new Map(
    builderBootstrapManifest.occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence
    ])
  );
  const occurrenceIdByPathKey = new Map(
    builderBootstrapManifest.occurrences.map((occurrence) => [
      pathKey(occurrence.path),
      occurrence.occurrenceId
    ])
  );
  const adjacencyByOccurrenceId = buildAdjacency(builderBootstrapManifest);
  const transitionByKey = new Map(
    builderBootstrapManifest.transitions.map((transition) => [
      transitionKey(transition.sourceOccurrenceId, transition.targetOccurrenceId),
      transition
    ])
  );
  const departureRuleByKey = new Map(
    builderBootstrapManifest.departureRules.map((rule) => [
      transitionKey(rule.sourceOccurrenceId, rule.targetOccurrenceId),
      rule
    ])
  );
  const repeatedStateRelations = builderBootstrapManifest.repeatedStateRelations;
  const terminalAnchors = builderBootstrapManifest.terminalAnchors;
  const cache = new Map<string, NeighborhoodCacheEntry>();
  const cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  return {
    inspectNeighborhood(focusOccurrenceId, request) {
      const focusOccurrence = occurrenceById.get(focusOccurrenceId);
      if (!focusOccurrence) {
        throw new Error(`unknown occurrence: ${focusOccurrenceId}`);
      }

      const radius = clamp(
        request.radius,
        0,
        viewerSceneManifest.runtime.maxNeighborhoodRadius
      );
      const refinementBudget = clamp(
        request.refinementBudget,
        1,
        viewerSceneManifest.runtime.maxRefinementBudget
      );
      const cacheKey = `${focusOccurrenceId}|${radius}`;
      let cacheEntry = cache.get(cacheKey);
      let cacheState: 'hit' | 'miss' = 'hit';

      if (cacheEntry) {
        cacheStats.hits += 1;
        cache.delete(cacheKey);
        cache.set(cacheKey, cacheEntry);
      } else {
        cacheState = 'miss';
        cacheStats.misses += 1;
        cacheEntry = buildNeighborhoodCacheEntry(
          focusOccurrenceId,
          radius,
          occurrenceById,
          adjacencyByOccurrenceId,
          builderBootstrapManifest.priorityFrontierOccurrenceIds
        );
        cache.set(cacheKey, cacheEntry);

        if (cache.size > viewerSceneManifest.runtime.cacheCapacity) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey !== undefined) {
            cache.delete(oldestKey);
            cacheStats.evictions += 1;
          }
        }
      }

      // Zoom/refinement budget changes presentation detail, not neighborhood ontology.
      const selectedOccurrenceIds = cacheEntry.orderedOccurrenceIds;
      const selectedOccurrenceIdSet = new Set(selectedOccurrenceIds);

      return {
        graphObjectId: builderBootstrapManifest.graphObjectId,
        focusOccurrenceId,
        radius,
        refinementBudget,
        objectIdentityStable: true,
        cacheState,
        cacheStats: {
          ...cacheStats,
          entryCount: cache.size
        },
        occurrences: selectedOccurrenceIds
          .map((occurrenceId) => {
            const occurrence = occurrenceById.get(occurrenceId);
            if (!occurrence) {
              return null;
            }
            return {
              ...occurrence,
              distance: cacheEntry.distanceByOccurrenceId.get(occurrenceId) ?? 0,
              isFocus: occurrenceId === focusOccurrenceId
            } satisfies RuntimeNeighborhoodOccurrence;
          })
          .filter(
            (occurrence): occurrence is RuntimeNeighborhoodOccurrence => occurrence !== null
          ),
        edges: builderBootstrapManifest.edges
          .filter(
            (edge) =>
              selectedOccurrenceIdSet.has(edge.sourceOccurrenceId) &&
              selectedOccurrenceIdSet.has(edge.targetOccurrenceId)
          )
          .map(
            (edge) =>
              ({
                ...edge,
                distance: Math.min(
                  cacheEntry.distanceByOccurrenceId.get(edge.sourceOccurrenceId) ?? 0,
                  cacheEntry.distanceByOccurrenceId.get(edge.targetOccurrenceId) ?? 0
                )
              }) satisfies RuntimeNeighborhoodEdge
          ),
        repeatedStateRelations: selectRepeatedStateRelations(
          repeatedStateRelations,
          selectedOccurrenceIdSet
        ),
        terminalAnchors: selectTerminalAnchors(
          terminalAnchors,
          selectedOccurrenceIdSet
        ),
        priorityFrontierOccurrenceIds:
          builderBootstrapManifest.priorityFrontierOccurrenceIds.filter((occurrenceId) =>
            selectedOccurrenceIdSet.has(occurrenceId)
          )
      };
    },
    inspectTransitionSurface(occurrenceIds) {
      const selectedOccurrenceIds = [...new Set(occurrenceIds)];
      const selectedOccurrenceIdSet = new Set(selectedOccurrenceIds);

      return {
        graphObjectId: builderBootstrapManifest.graphObjectId,
        occurrenceIds: selectedOccurrenceIds,
        transitions: builderBootstrapManifest.transitions.filter(
          (transition) =>
            selectedOccurrenceIdSet.has(transition.sourceOccurrenceId) &&
            selectedOccurrenceIdSet.has(transition.targetOccurrenceId)
        ),
        departureRules: builderBootstrapManifest.departureRules.filter(
          (rule) =>
            selectedOccurrenceIdSet.has(rule.sourceOccurrenceId) &&
            selectedOccurrenceIdSet.has(rule.targetOccurrenceId)
        )
      };
    },
    inspectCarrierSurface(occurrenceIds, request) {
      const selectedOccurrenceIds = [...new Set(occurrenceIds)];
      const selectedOccurrenceIdSet = new Set(selectedOccurrenceIds);
      const refinementBudget = clamp(
        request.refinementBudget,
        1,
        viewerSceneManifest.runtime.maxRefinementBudget
      );

      return buildRuntimeCarrierSurface({
        builderBootstrapManifest,
        occurrenceById,
        transitionByKey,
        selectedOccurrenceIds,
        selectedOccurrenceIdSet,
        refinementBudget,
        maxRefinementBudget: viewerSceneManifest.runtime.maxRefinementBudget
      });
    },
    resolveOccurrence(occurrenceId) {
      return occurrenceById.get(occurrenceId);
    },
    resolveTransition(sourceOccurrenceId, targetOccurrenceId) {
      return transitionByKey.get(transitionKey(sourceOccurrenceId, targetOccurrenceId));
    },
    resolveDepartureRule(sourceOccurrenceId, targetOccurrenceId) {
      return departureRuleByKey.get(
        transitionKey(sourceOccurrenceId, targetOccurrenceId)
      );
    },
    describeOccurrenceLine(occurrenceId) {
      const occurrence = occurrenceById.get(occurrenceId);
      if (!occurrence) {
        return undefined;
      }

      return {
        occurrenceId,
        rootGameId:
          occurrence.path[0]?.replace(/^game:/, '') ?? occurrence.embedding.rootGameId,
        moves: occurrence.path.slice(1).map((pathStep, index) => {
          const targetPath = occurrence.path.slice(0, index + 2);
          const sourcePath = targetPath.slice(0, -1);
          const targetOccurrenceId = occurrenceIdByPathKey.get(pathKey(targetPath));
          const sourceOccurrenceId = occurrenceIdByPathKey.get(pathKey(sourcePath)) ?? null;
          const transition =
            sourceOccurrenceId && targetOccurrenceId
              ? transitionByKey.get(
                  transitionKey(sourceOccurrenceId, targetOccurrenceId)
                )
              : undefined;

          return {
            ply: index + 1,
            uci: pathStep.split(':').at(-1) ?? pathStep,
            san: transition?.moveFacts.san ?? null,
            sourceOccurrenceId,
            targetOccurrenceId: targetOccurrenceId ?? occurrenceId
          };
        })
      } satisfies RuntimeOccurrenceLine;
    },
    getFocusOptions() {
      return viewerSceneManifest.runtime.focusCandidateOccurrenceIds
        .map((occurrenceId) => occurrenceById.get(occurrenceId))
        .filter(
          (occurrence): occurrence is BuilderOccurrenceRecord => occurrence !== undefined
        );
    },
    getCacheStats() {
      return {
        ...cacheStats,
        entryCount: cache.size
      };
    }
  };
}

function buildAdjacency(builderBootstrapManifest: BuilderBootstrapManifest) {
  const adjacencyByOccurrenceId = new Map<string, Set<string>>();

  for (const occurrence of builderBootstrapManifest.occurrences) {
    adjacencyByOccurrenceId.set(occurrence.occurrenceId, new Set());
  }

  for (const edge of builderBootstrapManifest.edges) {
    adjacencyByOccurrenceId.get(edge.sourceOccurrenceId)?.add(edge.targetOccurrenceId);
    adjacencyByOccurrenceId.get(edge.targetOccurrenceId)?.add(edge.sourceOccurrenceId);
  }

  return adjacencyByOccurrenceId;
}

function buildNeighborhoodCacheEntry(
  focusOccurrenceId: string,
  radius: number,
  occurrenceById: Map<string, BuilderOccurrenceRecord>,
  adjacencyByOccurrenceId: Map<string, Set<string>>,
  priorityFrontierOccurrenceIds: string[]
): NeighborhoodCacheEntry {
  const distanceByOccurrenceId = new Map<string, number>([[focusOccurrenceId, 0]]);
  const queue = [focusOccurrenceId];

  while (queue.length > 0) {
    const currentOccurrenceId = queue.shift();
    if (!currentOccurrenceId) {
      continue;
    }
    const currentDistance = distanceByOccurrenceId.get(currentOccurrenceId) ?? 0;
    if (currentDistance >= radius) {
      continue;
    }

    const neighbors = adjacencyByOccurrenceId.get(currentOccurrenceId);
    if (!neighbors) {
      continue;
    }

    for (const neighborOccurrenceId of neighbors) {
      if (distanceByOccurrenceId.has(neighborOccurrenceId)) {
        continue;
      }
      distanceByOccurrenceId.set(neighborOccurrenceId, currentDistance + 1);
      queue.push(neighborOccurrenceId);
    }
  }

  const priorityFrontierSet = new Set(priorityFrontierOccurrenceIds);
  const orderedOccurrenceIds = [...distanceByOccurrenceId.keys()].sort((left, right) => {
    if (left === focusOccurrenceId) {
      return -1;
    }
    if (right === focusOccurrenceId) {
      return 1;
    }

    const leftDistance = distanceByOccurrenceId.get(left) ?? Number.POSITIVE_INFINITY;
    const rightDistance = distanceByOccurrenceId.get(right) ?? Number.POSITIVE_INFINITY;
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const leftOccurrence = occurrenceById.get(left);
    const rightOccurrence = occurrenceById.get(right);
    const leftRank = leftOccurrence?.salience.priorityHint.priorityRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank =
      rightOccurrence?.salience.priorityHint.priorityRank ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftPriority = priorityFrontierSet.has(left) ? 0 : 1;
    const rightPriority = priorityFrontierSet.has(right) ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });

  return {
    focusOccurrenceId,
    radius,
    orderedOccurrenceIds,
    distanceByOccurrenceId
  };
}

function selectRepeatedStateRelations(
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[],
  selectedOccurrenceIdSet: Set<string>
) {
  return repeatedStateRelations
    .map((relation) => ({
      ...relation,
      occurrenceIds: relation.occurrenceIds.filter((occurrenceId) =>
        selectedOccurrenceIdSet.has(occurrenceId)
      )
    }))
    .filter((relation) => relation.occurrenceIds.length > 0);
}

function selectTerminalAnchors(
  terminalAnchors: BuilderTerminalAnchorRecord[],
  selectedOccurrenceIdSet: Set<string>
) {
  return terminalAnchors
    .map((anchor) => ({
      ...anchor,
      occurrenceIds: anchor.occurrenceIds.filter((occurrenceId) =>
        selectedOccurrenceIdSet.has(occurrenceId)
      )
    }))
    .filter((anchor) => anchor.occurrenceIds.length > 0);
}

function clamp(value: number, lowerBound: number, upperBound: number) {
  return Math.max(lowerBound, Math.min(upperBound, Math.round(value)));
}

function transitionKey(sourceOccurrenceId: string, targetOccurrenceId: string) {
  return `${sourceOccurrenceId}|${targetOccurrenceId}`;
}

function pathKey(path: string[]) {
  return path.join('|');
}