import type {
  BuilderAnchorRecord,
  BuilderEdgeRecord,
  BuilderBootstrapManifest,
  BuilderDepartureRuleRecord,
  BuilderOccurrenceRecord,
  BuilderRepeatedStateRelationRecord,
  BuilderTransitionRecord,
  CameraOrbitPreset,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationCacheStats,
  RuntimeGraphViewScope,
  RuntimeNeighborhoodEdge,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  RuntimeOccurrenceLod,
  RuntimeRenderDemandSnapshot,
  RuntimeTransitionSurfaceSnapshot,
  ViewerSceneManifest
} from './contracts';
import { deriveCameraOrbitState } from './cameraOrbit.ts';
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

type WholeGraphRequest = {
  refinementBudget: number;
};

export type RuntimeViewRequest = {
  scope: RuntimeGraphViewScope;
  neighborhoodRadius: number;
  refinementBudget: number;
  cameraDistance: number;
  cameraOrbit: CameraOrbitPreset;
};

type CarrierSurfaceRequest = {
  refinementBudget: number;
};

type QuerySurface = {
  radius: number;
  orderedOccurrenceIds: string[];
  distanceByOccurrenceId: Map<string, number>;
  cacheState: 'hit' | 'miss';
  cacheStats: RuntimeExplorationCacheStats;
};

type ViewSelection = {
  selectedOccurrenceIds: string[];
  selectedEdges: BuilderEdgeRecord[];
  lodByOccurrenceId: Map<string, RuntimeOccurrenceLod>;
  renderDemand: RuntimeRenderDemandSnapshot;
};

type ViewCameraState = {
  distance: number;
  orbit: CameraOrbitPreset;
};

export type RuntimeExplorationKernel = {
  inspectNeighborhood: (
    focusOccurrenceId: string,
    request: NeighborhoodRequest
  ) => RuntimeNeighborhoodSnapshot;
  inspectWholeGraph: (
    focusOccurrenceId: string,
    request: WholeGraphRequest
  ) => RuntimeNeighborhoodSnapshot;
  inspectView: (
    focusOccurrenceId: string,
    request: RuntimeViewRequest
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
  const anchors = builderBootstrapManifest.anchors;
  const allOccurrenceIds = builderBootstrapManifest.occurrences.map(
    (occurrence) => occurrence.occurrenceId
  );
  const defaultViewCameraState: ViewCameraState = {
    distance: Math.max(0.1, Math.hypot(...viewerSceneManifest.camera.position)),
    orbit: deriveCameraOrbitState(viewerSceneManifest.camera.position)
  };
  const priorityFrontierSet = new Set(
    builderBootstrapManifest.priorityFrontierOccurrenceIds
  );
  const outgoingTransitionCountByOccurrenceId =
    builderBootstrapManifest.transitions.reduce<Map<string, number>>((counts, transition) => {
      counts.set(
        transition.sourceOccurrenceId,
        (counts.get(transition.sourceOccurrenceId) ?? 0) + 1
      );
      return counts;
    }, new Map());
  const cache = new Map<string, NeighborhoodCacheEntry>();
  const cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  function currentCacheStats(): RuntimeExplorationCacheStats {
    return {
      ...cacheStats,
      entryCount: cache.size
    };
  }

  function resolveNeighborhoodSurface(
    focusOccurrenceId: string,
    request: NeighborhoodRequest
  ): QuerySurface {
    const focusOccurrence = occurrenceById.get(focusOccurrenceId);
    if (!focusOccurrence) {
      throw new Error(`unknown occurrence: ${focusOccurrenceId}`);
    }

    const radius = clamp(
      request.radius,
      0,
      viewerSceneManifest.runtime.maxNeighborhoodRadius
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

    return {
      radius,
      orderedOccurrenceIds: cacheEntry.orderedOccurrenceIds,
      distanceByOccurrenceId: cacheEntry.distanceByOccurrenceId,
      cacheState,
      cacheStats: currentCacheStats()
    };
  }

  function resolveWholeGraphSurface(
    focusOccurrenceId: string,
    _request: WholeGraphRequest
  ): QuerySurface {
    if (!occurrenceById.has(focusOccurrenceId)) {
      throw new Error(`unknown occurrence: ${focusOccurrenceId}`);
    }

    const distanceByOccurrenceId = buildWholeGraphDistanceMap(
      focusOccurrenceId,
      adjacencyByOccurrenceId,
      allOccurrenceIds
    );
    const orderedOccurrenceIds = sortOccurrenceIds(
      allOccurrenceIds,
      distanceByOccurrenceId,
      focusOccurrenceId,
      occurrenceById,
      priorityFrontierSet
    );

    return {
      radius: resolveWholeGraphRadius(
        distanceByOccurrenceId,
        viewerSceneManifest.runtime.maxNeighborhoodRadius
      ),
      orderedOccurrenceIds,
      distanceByOccurrenceId,
      cacheState: 'miss',
      cacheStats: currentCacheStats()
    };
  }

  return {
    inspectNeighborhood(focusOccurrenceId, request) {
      const refinementBudget = clamp(
        request.refinementBudget,
        1,
        viewerSceneManifest.runtime.maxRefinementBudget
      );
      const querySurface = resolveNeighborhoodSurface(focusOccurrenceId, request);
      const selection = createFullVisibilitySelection({
        builderBootstrapManifest,
        occurrenceById,
        outgoingTransitionCountByOccurrenceId,
        priorityFrontierSet,
        cameraView: defaultViewCameraState,
        scope: 'local-neighborhood',
        focusOccurrenceId,
        requestedNeighborhoodRadius: querySurface.radius,
        refinementBudget,
        maxRefinementBudget: viewerSceneManifest.runtime.maxRefinementBudget,
        orderedOccurrenceIds: querySurface.orderedOccurrenceIds,
        distanceByOccurrenceId: querySurface.distanceByOccurrenceId
      });

      // Zoom/refinement budget changes presentation detail, not neighborhood ontology.
      return buildRuntimeNeighborhoodSnapshot({
        builderBootstrapManifest,
        occurrenceById,
        repeatedStateRelations,
        anchors,
        focusOccurrenceId,
        radius: querySurface.radius,
        refinementBudget,
        objectIdentityStable: true,
        cacheState: querySurface.cacheState,
        cacheStats: querySurface.cacheStats,
        selectedOccurrenceIds: selection.selectedOccurrenceIds,
        selectedEdges: selection.selectedEdges,
        lodByOccurrenceId: selection.lodByOccurrenceId,
        renderDemand: selection.renderDemand,
        distanceByOccurrenceId: querySurface.distanceByOccurrenceId
      });
    },
    inspectWholeGraph(focusOccurrenceId, request) {
      const refinementBudget = clamp(
        request.refinementBudget,
        1,
        viewerSceneManifest.runtime.maxRefinementBudget
      );
      const querySurface = resolveWholeGraphSurface(focusOccurrenceId, request);
      const selection = createFullVisibilitySelection({
        builderBootstrapManifest,
        occurrenceById,
        outgoingTransitionCountByOccurrenceId,
        priorityFrontierSet,
        cameraView: defaultViewCameraState,
        scope: 'whole-object',
        focusOccurrenceId,
        requestedNeighborhoodRadius: querySurface.radius,
        refinementBudget,
        maxRefinementBudget: viewerSceneManifest.runtime.maxRefinementBudget,
        orderedOccurrenceIds: querySurface.orderedOccurrenceIds,
        distanceByOccurrenceId: querySurface.distanceByOccurrenceId
      });

      return buildRuntimeNeighborhoodSnapshot({
        builderBootstrapManifest,
        occurrenceById,
        repeatedStateRelations,
        anchors,
        focusOccurrenceId,
        radius: querySurface.radius,
        refinementBudget,
        objectIdentityStable: true,
        cacheState: querySurface.cacheState,
        cacheStats: querySurface.cacheStats,
        selectedOccurrenceIds: selection.selectedOccurrenceIds,
        selectedEdges: selection.selectedEdges,
        lodByOccurrenceId: selection.lodByOccurrenceId,
        renderDemand: selection.renderDemand,
        distanceByOccurrenceId: querySurface.distanceByOccurrenceId
      });
    },
    inspectView(focusOccurrenceId, request) {
      const refinementBudget = clamp(
        request.refinementBudget,
        1,
        viewerSceneManifest.runtime.maxRefinementBudget
      );
      const querySurface =
        request.scope === 'whole-object'
          ? resolveWholeGraphSurface(focusOccurrenceId, {
              refinementBudget
            })
          : resolveNeighborhoodSurface(focusOccurrenceId, {
              radius: request.neighborhoodRadius,
              refinementBudget
            });
      const selection = createViewSelection({
        builderBootstrapManifest,
        occurrenceById,
        outgoingTransitionCountByOccurrenceId,
        priorityFrontierSet,
        cameraView: {
          distance: request.cameraDistance,
          orbit: request.cameraOrbit
        },
        scope: request.scope,
        focusOccurrenceId,
        requestedNeighborhoodRadius: querySurface.radius,
        refinementBudget,
        maxRefinementBudget: viewerSceneManifest.runtime.maxRefinementBudget,
        orderedOccurrenceIds: querySurface.orderedOccurrenceIds,
        distanceByOccurrenceId: querySurface.distanceByOccurrenceId
      });

      return buildRuntimeNeighborhoodSnapshot({
        builderBootstrapManifest,
        occurrenceById,
        repeatedStateRelations,
        anchors,
        focusOccurrenceId,
        radius: querySurface.radius,
        refinementBudget,
        objectIdentityStable: true,
        cacheState: querySurface.cacheState,
        cacheStats: querySurface.cacheStats,
        selectedOccurrenceIds: selection.selectedOccurrenceIds,
        selectedEdges: selection.selectedEdges,
        lodByOccurrenceId: selection.lodByOccurrenceId,
        renderDemand: selection.renderDemand,
        distanceByOccurrenceId: querySurface.distanceByOccurrenceId
      });
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

  return {
    focusOccurrenceId,
    radius,
    orderedOccurrenceIds: sortOccurrenceIds(
      [...distanceByOccurrenceId.keys()],
      distanceByOccurrenceId,
      focusOccurrenceId,
      occurrenceById,
      new Set(priorityFrontierOccurrenceIds)
    ),
    distanceByOccurrenceId
  };
}

function buildWholeGraphDistanceMap(
  focusOccurrenceId: string,
  adjacencyByOccurrenceId: Map<string, Set<string>>,
  allOccurrenceIds: string[]
) {
  const distanceByOccurrenceId = new Map<string, number>([[focusOccurrenceId, 0]]);
  const queue = [focusOccurrenceId];

  while (queue.length > 0) {
    const currentOccurrenceId = queue.shift();
    if (!currentOccurrenceId) {
      continue;
    }

    const currentDistance = distanceByOccurrenceId.get(currentOccurrenceId) ?? 0;
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

  for (const occurrenceId of allOccurrenceIds) {
    if (!distanceByOccurrenceId.has(occurrenceId)) {
      distanceByOccurrenceId.set(occurrenceId, Number.POSITIVE_INFINITY);
    }
  }

  return distanceByOccurrenceId;
}

function resolveWholeGraphRadius(
  distanceByOccurrenceId: Map<string, number>,
  fallbackRadius: number
) {
  const finiteDistances = [...distanceByOccurrenceId.values()].filter((distance) =>
    Number.isFinite(distance)
  );

  if (finiteDistances.length === 0) {
    return fallbackRadius;
  }

  return Math.max(...finiteDistances);
}

function createFullVisibilitySelection({
  builderBootstrapManifest,
  occurrenceById,
  outgoingTransitionCountByOccurrenceId,
  priorityFrontierSet,
  cameraView,
  scope,
  focusOccurrenceId,
  requestedNeighborhoodRadius,
  refinementBudget,
  maxRefinementBudget,
  orderedOccurrenceIds,
  distanceByOccurrenceId
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  outgoingTransitionCountByOccurrenceId: Map<string, number>;
  priorityFrontierSet: Set<string>;
  cameraView: ViewCameraState;
  scope: RuntimeGraphViewScope;
  focusOccurrenceId: string;
  requestedNeighborhoodRadius: number;
  refinementBudget: number;
  maxRefinementBudget: number;
  orderedOccurrenceIds: string[];
  distanceByOccurrenceId: Map<string, number>;
}): ViewSelection {
  const policy = resolveRenderDemandPolicy({
    scope,
    requestedNeighborhoodRadius,
    refinementBudget,
    maxRefinementBudget,
    cameraDistance: cameraView.distance
  });
  const focusCoordinate =
    occurrenceById.get(focusOccurrenceId)?.embedding.coordinate ?? [0, 0, 0];
  const cameraFacingVector = resolveCameraFacingVector(cameraView.orbit);
  const selectedOccurrenceIds = orderedOccurrenceIds;
  const lodByOccurrenceId = buildOccurrenceLodMap({
    selectedOccurrenceIds,
    focusOccurrenceId,
    distanceByOccurrenceId,
    detailNeighborhoodRadius: policy.detailNeighborhoodRadius
  });
  const selectedEdges = selectViewEdges({
    edges: builderBootstrapManifest.edges,
    selectedOccurrenceIds,
    occurrenceById,
    distanceByOccurrenceId,
    focusCoordinate,
    cameraFacingVector,
    cameraDistance: cameraView.distance,
    priorityFrontierSet,
    focusOccurrenceId,
    visibleEdgeTarget: Number.POSITIVE_INFINITY
  });
  const residency = countVisibleResidency(lodByOccurrenceId);

  return {
    selectedOccurrenceIds,
    selectedEdges,
    lodByOccurrenceId,
    renderDemand: {
      scope,
      policy,
      enumeratedOccurrenceCount: orderedOccurrenceIds.length,
      enumeratedEdgeCount: countEdgesBetweenOccurrenceIds(
        builderBootstrapManifest.edges,
        new Set(orderedOccurrenceIds)
      ),
      visibleOccurrenceCount: selectedOccurrenceIds.length,
      visibleEdgeCount: selectedEdges.length,
      hotOccurrenceCount: residency.hotOccurrenceCount,
      warmOccurrenceCount: residency.warmOccurrenceCount,
      coldOccurrenceCount: Math.max(
        builderBootstrapManifest.occurrences.length - selectedOccurrenceIds.length,
        0
      ),
      frontierExpansionOccurrenceIds: selectFrontierExpansionOccurrenceIds({
        scope,
        focusOccurrenceId,
        selectedOccurrenceIds,
        occurrenceById,
        distanceByOccurrenceId,
        focusCoordinate,
        cameraFacingVector,
        cameraDistance: cameraView.distance,
        outgoingTransitionCountByOccurrenceId,
        priorityFrontierSet,
        requestedNeighborhoodRadius,
        detailNeighborhoodRadius: policy.detailNeighborhoodRadius,
        visibleOccurrenceCount: selectedOccurrenceIds.length,
        visibleLowDetailOccurrenceTarget: policy.visibleLowDetailOccurrenceTarget
      })
    }
  };
}

function createViewSelection({
  builderBootstrapManifest,
  occurrenceById,
  outgoingTransitionCountByOccurrenceId,
  priorityFrontierSet,
  cameraView,
  scope,
  focusOccurrenceId,
  requestedNeighborhoodRadius,
  refinementBudget,
  maxRefinementBudget,
  orderedOccurrenceIds,
  distanceByOccurrenceId
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  outgoingTransitionCountByOccurrenceId: Map<string, number>;
  priorityFrontierSet: Set<string>;
  cameraView: ViewCameraState;
  scope: RuntimeGraphViewScope;
  focusOccurrenceId: string;
  requestedNeighborhoodRadius: number;
  refinementBudget: number;
  maxRefinementBudget: number;
  orderedOccurrenceIds: string[];
  distanceByOccurrenceId: Map<string, number>;
}): ViewSelection {
  const policy = resolveRenderDemandPolicy({
    scope,
    requestedNeighborhoodRadius,
    refinementBudget,
    maxRefinementBudget,
    cameraDistance: cameraView.distance
  });
  const focusCoordinate =
    occurrenceById.get(focusOccurrenceId)?.embedding.coordinate ?? [0, 0, 0];
  const cameraFacingVector = resolveCameraFacingVector(cameraView.orbit);
  const selectedOccurrenceIds =
    scope === 'whole-object'
      ? selectWholeObjectOccurrenceIds({
          orderedOccurrenceIds,
          occurrenceById,
          priorityFrontierSet,
          focusOccurrenceId,
          focusCoordinate,
          cameraFacingVector,
          cameraDistance: cameraView.distance,
          distanceByOccurrenceId,
          detailNeighborhoodRadius: policy.detailNeighborhoodRadius,
          visibleLowDetailOccurrenceTarget: policy.visibleLowDetailOccurrenceTarget
        })
      : orderedOccurrenceIds;
  const lodByOccurrenceId = buildOccurrenceLodMap({
    selectedOccurrenceIds,
    focusOccurrenceId,
    distanceByOccurrenceId,
    detailNeighborhoodRadius: policy.detailNeighborhoodRadius
  });
  const selectedEdges = selectViewEdges({
    edges: builderBootstrapManifest.edges,
    selectedOccurrenceIds,
    occurrenceById,
    distanceByOccurrenceId,
    focusCoordinate,
    cameraFacingVector,
    cameraDistance: cameraView.distance,
    priorityFrontierSet,
    focusOccurrenceId,
    visibleEdgeTarget: policy.visibleEdgeTarget
  });
  const residency = countVisibleResidency(lodByOccurrenceId);

  return {
    selectedOccurrenceIds,
    selectedEdges,
    lodByOccurrenceId,
    renderDemand: {
      scope,
      policy,
      enumeratedOccurrenceCount: orderedOccurrenceIds.length,
      enumeratedEdgeCount: countEdgesBetweenOccurrenceIds(
        builderBootstrapManifest.edges,
        new Set(orderedOccurrenceIds)
      ),
      visibleOccurrenceCount: selectedOccurrenceIds.length,
      visibleEdgeCount: selectedEdges.length,
      hotOccurrenceCount: residency.hotOccurrenceCount,
      warmOccurrenceCount: residency.warmOccurrenceCount,
      coldOccurrenceCount: Math.max(
        builderBootstrapManifest.occurrences.length - selectedOccurrenceIds.length,
        0
      ),
      frontierExpansionOccurrenceIds: selectFrontierExpansionOccurrenceIds({
        scope,
        focusOccurrenceId,
        selectedOccurrenceIds,
        occurrenceById,
        distanceByOccurrenceId,
        focusCoordinate,
        cameraFacingVector,
        cameraDistance: cameraView.distance,
        outgoingTransitionCountByOccurrenceId,
        priorityFrontierSet,
        requestedNeighborhoodRadius,
        detailNeighborhoodRadius: policy.detailNeighborhoodRadius,
        visibleOccurrenceCount: selectedOccurrenceIds.length,
        visibleLowDetailOccurrenceTarget: policy.visibleLowDetailOccurrenceTarget
      })
    }
  };
}

function resolveRenderDemandPolicy({
  scope,
  requestedNeighborhoodRadius,
  refinementBudget,
  maxRefinementBudget,
  cameraDistance
}: {
  scope: RuntimeGraphViewScope;
  requestedNeighborhoodRadius: number;
  refinementBudget: number;
  maxRefinementBudget: number;
  cameraDistance: number;
}) {
  const tier = resolveRenderDemandTier(refinementBudget, maxRefinementBudget);
  const tierDetailRadius =
    tier === 'structure' ? 1 : tier === 'tactical' ? 2 : 3;
  const wholeObjectBudgetScale =
    cameraDistance >= 4.8 ? 1.08 : cameraDistance >= 4.2 ? 1 : 0.82;

  if (scope === 'whole-object') {
    const baseOccurrenceTarget =
      tier === 'structure' ? 48 : tier === 'tactical' ? 30 : 18;
    const baseEdgeTarget =
      tier === 'structure' ? 72 : tier === 'tactical' ? 42 : 24;

    return {
      renderSubsetPolicy: 'whole-object-focus-plus-budgeted-low-detail',
      residencyPolicy: 'hot-detail-visible-context-cold-stored',
      lodPolicy: 'focus-distance-salience-tiered',
      focusLevelPolicy: `${tier}-band-detail-radius-${tierDetailRadius}`,
      detailNeighborhoodRadius: tierDetailRadius,
      visibleLowDetailOccurrenceTarget: Math.max(
        12,
        Math.round(baseOccurrenceTarget * wholeObjectBudgetScale)
      ),
      visibleEdgeTarget: Math.max(
        18,
        Math.round(baseEdgeTarget * wholeObjectBudgetScale)
      )
    };
  }

  return {
    renderSubsetPolicy: 'radius-bounded-full-neighborhood',
    residencyPolicy: 'hot-focus-and-nearby-warm-visible-neighborhood-cold-stored',
    lodPolicy: 'radius-bounded-distance-tiered',
    focusLevelPolicy: `${tier}-band-radius-${requestedNeighborhoodRadius}`,
    detailNeighborhoodRadius: Math.min(requestedNeighborhoodRadius, tierDetailRadius),
    visibleLowDetailOccurrenceTarget: Math.max(12, (requestedNeighborhoodRadius + 1) * 24),
    visibleEdgeTarget: Math.max(18, (requestedNeighborhoodRadius + 1) * 48)
  };
}

function resolveRenderDemandTier(
  refinementBudget: number,
  maxRefinementBudget: number
) {
  const normalizedBudget = maxRefinementBudget <= 0
    ? 1
    : refinementBudget / maxRefinementBudget;

  if (normalizedBudget >= 0.95) {
    return 'contextual' as const;
  }

  if (normalizedBudget >= 0.45) {
    return 'tactical' as const;
  }

  return 'structure' as const;
}

function resolveCameraFacingVector(orbit: CameraOrbitPreset) {
  const planarDistance = Math.cos(orbit.elevation);

  return normalizeDirection([
    Math.sin(orbit.azimuth) * planarDistance,
    Math.sin(orbit.elevation),
    Math.cos(orbit.azimuth) * planarDistance
  ]);
}

function scoreOccurrenceForView({
  occurrenceId,
  occurrenceById,
  focusOccurrenceId,
  focusCoordinate,
  cameraFacingVector,
  cameraDistance,
  distanceByOccurrenceId,
  priorityFrontierSet
}: {
  occurrenceId: string;
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  focusOccurrenceId: string;
  focusCoordinate: BuilderOccurrenceRecord['embedding']['coordinate'];
  cameraFacingVector: [number, number, number];
  cameraDistance: number;
  distanceByOccurrenceId: Map<string, number>;
  priorityFrontierSet: Set<string>;
}) {
  if (occurrenceId === focusOccurrenceId) {
    return 14;
  }

  const occurrence = occurrenceById.get(occurrenceId);
  if (!occurrence) {
    return Number.NEGATIVE_INFINITY;
  }

  const distance = distanceByOccurrenceId.get(occurrenceId) ?? Number.POSITIVE_INFINITY;
  const distanceScore = Number.isFinite(distance) ? Math.max(0, 8 - distance) : 0;
  const viewAlignment = resolveViewAlignment(
    occurrence.embedding.coordinate,
    focusCoordinate,
    cameraFacingVector
  );
  const cameraScore = (viewAlignment + 1) * (cameraDistance >= 4.2 ? 4.4 : 3.8);
  const salienceScore = occurrence.salience.normalizedScore * 3;
  const priorityScore = priorityFrontierSet.has(occurrenceId) ? 0.8 : 0;

  return cameraScore + salienceScore + distanceScore + priorityScore;
}

function resolveViewAlignment(
  coordinate: BuilderOccurrenceRecord['embedding']['coordinate'],
  focusCoordinate: BuilderOccurrenceRecord['embedding']['coordinate'],
  cameraFacingVector: [number, number, number]
) {
  const offset = [
    coordinate[0] - focusCoordinate[0],
    coordinate[1] - focusCoordinate[1],
    coordinate[2] - focusCoordinate[2]
  ] as [number, number, number];
  const normalizedOffset = normalizeDirection(offset);

  return dotProduct(normalizedOffset, cameraFacingVector);
}

function dotProduct(
  left: [number, number, number],
  right: [number, number, number]
) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function normalizeDirection(direction: [number, number, number]) {
  const length = Math.hypot(direction[0], direction[1], direction[2]);

  if (length <= 1e-6) {
    return [0, 0, 1] as [number, number, number];
  }

  return [
    direction[0] / length,
    direction[1] / length,
    direction[2] / length
  ] as [number, number, number];
}

function selectWholeObjectOccurrenceIds({
  orderedOccurrenceIds,
  occurrenceById,
  priorityFrontierSet,
  focusOccurrenceId,
  focusCoordinate,
  cameraFacingVector,
  cameraDistance,
  distanceByOccurrenceId,
  detailNeighborhoodRadius,
  visibleLowDetailOccurrenceTarget
}: {
  orderedOccurrenceIds: string[];
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  priorityFrontierSet: Set<string>;
  focusOccurrenceId: string;
  focusCoordinate: BuilderOccurrenceRecord['embedding']['coordinate'];
  cameraFacingVector: [number, number, number];
  cameraDistance: number;
  distanceByOccurrenceId: Map<string, number>;
  detailNeighborhoodRadius: number;
  visibleLowDetailOccurrenceTarget: number;
}) {
  const selectedOccurrenceIds: string[] = [];
  const selectedOccurrenceIdSet = new Set<string>();

  const addOccurrenceId = (occurrenceId: string) => {
    if (selectedOccurrenceIdSet.has(occurrenceId)) {
      return;
    }

    selectedOccurrenceIdSet.add(occurrenceId);
    selectedOccurrenceIds.push(occurrenceId);
  };

  for (const occurrenceId of orderedOccurrenceIds) {
    const distance = distanceByOccurrenceId.get(occurrenceId) ?? Number.POSITIVE_INFINITY;
    if (
      occurrenceId === focusOccurrenceId ||
      (Number.isFinite(distance) && distance <= detailNeighborhoodRadius)
    ) {
      addOccurrenceId(occurrenceId);
    }
  }

  const viewRankedOccurrenceIds = [...orderedOccurrenceIds].sort((left, right) => {
    const scoreDifference =
      scoreOccurrenceForView({
        occurrenceId: right,
        occurrenceById,
        focusOccurrenceId,
        focusCoordinate,
        cameraFacingVector,
        cameraDistance,
        distanceByOccurrenceId,
        priorityFrontierSet
      }) -
      scoreOccurrenceForView({
        occurrenceId: left,
        occurrenceById,
        focusOccurrenceId,
        focusCoordinate,
        cameraFacingVector,
        cameraDistance,
        distanceByOccurrenceId,
        priorityFrontierSet
      });

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.localeCompare(right);
  });

  for (const occurrenceId of viewRankedOccurrenceIds) {
    if (selectedOccurrenceIds.length >= visibleLowDetailOccurrenceTarget) {
      break;
    }

    addOccurrenceId(occurrenceId);
  }

  return selectedOccurrenceIds;
}

function buildOccurrenceLodMap({
  selectedOccurrenceIds,
  focusOccurrenceId,
  distanceByOccurrenceId,
  detailNeighborhoodRadius
}: {
  selectedOccurrenceIds: string[];
  focusOccurrenceId: string;
  distanceByOccurrenceId: Map<string, number>;
  detailNeighborhoodRadius: number;
}) {
  return selectedOccurrenceIds.reduce<Map<string, RuntimeOccurrenceLod>>(
    (lodByOccurrenceId, occurrenceId) => {
      if (occurrenceId === focusOccurrenceId) {
        lodByOccurrenceId.set(occurrenceId, 'focus');
        return lodByOccurrenceId;
      }

      const distance = distanceByOccurrenceId.get(occurrenceId) ?? Number.POSITIVE_INFINITY;

      if (Number.isFinite(distance) && distance <= detailNeighborhoodRadius) {
        lodByOccurrenceId.set(occurrenceId, 'detail');
      } else if (Number.isFinite(distance) && distance <= detailNeighborhoodRadius + 1) {
        lodByOccurrenceId.set(occurrenceId, 'context');
      } else {
        lodByOccurrenceId.set(occurrenceId, 'distant');
      }

      return lodByOccurrenceId;
    },
    new Map()
  );
}

function selectViewEdges({
  edges,
  selectedOccurrenceIds,
  occurrenceById,
  distanceByOccurrenceId,
  focusCoordinate,
  cameraFacingVector,
  cameraDistance,
  priorityFrontierSet,
  focusOccurrenceId,
  visibleEdgeTarget
}: {
  edges: BuilderEdgeRecord[];
  selectedOccurrenceIds: string[];
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  distanceByOccurrenceId: Map<string, number>;
  focusCoordinate: BuilderOccurrenceRecord['embedding']['coordinate'];
  cameraFacingVector: [number, number, number];
  cameraDistance: number;
  priorityFrontierSet: Set<string>;
  focusOccurrenceId: string;
  visibleEdgeTarget: number;
}) {
  const selectedOccurrenceIdSet = new Set(selectedOccurrenceIds);
  const candidateEdges = edges.filter(
    (edge) =>
      selectedOccurrenceIdSet.has(edge.sourceOccurrenceId) &&
      selectedOccurrenceIdSet.has(edge.targetOccurrenceId)
  );

  if (!Number.isFinite(visibleEdgeTarget) || candidateEdges.length <= visibleEdgeTarget) {
    return candidateEdges;
  }

  return [...candidateEdges]
    .sort((left, right) => {
      const scoreDifference =
        scoreEdge({
          edge: right,
          occurrenceById,
          distanceByOccurrenceId,
          focusCoordinate,
          cameraFacingVector,
          cameraDistance,
          priorityFrontierSet,
          focusOccurrenceId
        }) -
        scoreEdge({
          edge: left,
          occurrenceById,
          distanceByOccurrenceId,
          focusCoordinate,
          cameraFacingVector,
          cameraDistance,
          priorityFrontierSet,
          focusOccurrenceId
        });

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return `${left.sourceOccurrenceId}|${left.targetOccurrenceId}`.localeCompare(
        `${right.sourceOccurrenceId}|${right.targetOccurrenceId}`
      );
    })
    .slice(0, visibleEdgeTarget);
}

function scoreEdge({
  edge,
  occurrenceById,
  distanceByOccurrenceId,
  focusCoordinate,
  cameraFacingVector,
  cameraDistance,
  priorityFrontierSet,
  focusOccurrenceId
}: {
  edge: BuilderEdgeRecord;
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  distanceByOccurrenceId: Map<string, number>;
  focusCoordinate: BuilderOccurrenceRecord['embedding']['coordinate'];
  cameraFacingVector: [number, number, number];
  cameraDistance: number;
  priorityFrontierSet: Set<string>;
  focusOccurrenceId: string;
}) {
  const minimumDistance = Math.min(
    distanceByOccurrenceId.get(edge.sourceOccurrenceId) ?? Number.POSITIVE_INFINITY,
    distanceByOccurrenceId.get(edge.targetOccurrenceId) ?? Number.POSITIVE_INFINITY
  );
  const sourceSalience =
    occurrenceById.get(edge.sourceOccurrenceId)?.salience.normalizedScore ?? 0;
  const targetSalience =
    occurrenceById.get(edge.targetOccurrenceId)?.salience.normalizedScore ?? 0;
  const sourceViewScore = scoreOccurrenceForView({
    occurrenceId: edge.sourceOccurrenceId,
    occurrenceById,
    focusOccurrenceId,
    focusCoordinate,
    cameraFacingVector,
    cameraDistance,
    distanceByOccurrenceId,
    priorityFrontierSet
  });
  const targetViewScore = scoreOccurrenceForView({
    occurrenceId: edge.targetOccurrenceId,
    occurrenceById,
    focusOccurrenceId,
    focusCoordinate,
    cameraFacingVector,
    cameraDistance,
    distanceByOccurrenceId,
    priorityFrontierSet
  });

  return (
    (edge.sourceOccurrenceId === focusOccurrenceId ||
    edge.targetOccurrenceId === focusOccurrenceId
      ? 4
      : 0) +
    (Number.isFinite(minimumDistance) ? Math.max(0, 8 - minimumDistance) : 0) +
    (Math.max(sourceSalience, targetSalience) * 3) +
    ((sourceViewScore + targetViewScore) * 0.35)
  );
}

function countEdgesBetweenOccurrenceIds(
  edges: BuilderEdgeRecord[],
  selectedOccurrenceIdSet: Set<string>
) {
  return edges.filter(
    (edge) =>
      selectedOccurrenceIdSet.has(edge.sourceOccurrenceId) &&
      selectedOccurrenceIdSet.has(edge.targetOccurrenceId)
  ).length;
}

function countVisibleResidency(
  lodByOccurrenceId: Map<string, RuntimeOccurrenceLod>
) {
  let hotOccurrenceCount = 0;
  let warmOccurrenceCount = 0;

  for (const lod of lodByOccurrenceId.values()) {
    if (lod === 'focus' || lod === 'detail') {
      hotOccurrenceCount += 1;
    } else {
      warmOccurrenceCount += 1;
    }
  }

  return {
    hotOccurrenceCount,
    warmOccurrenceCount
  };
}

function selectFrontierExpansionOccurrenceIds({
  scope,
  focusOccurrenceId,
  selectedOccurrenceIds,
  occurrenceById,
  distanceByOccurrenceId,
  focusCoordinate,
  cameraFacingVector,
  cameraDistance,
  outgoingTransitionCountByOccurrenceId,
  priorityFrontierSet,
  requestedNeighborhoodRadius,
  detailNeighborhoodRadius,
  visibleOccurrenceCount,
  visibleLowDetailOccurrenceTarget
}: {
  scope: RuntimeGraphViewScope;
  focusOccurrenceId: string;
  selectedOccurrenceIds: string[];
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  distanceByOccurrenceId: Map<string, number>;
  focusCoordinate: BuilderOccurrenceRecord['embedding']['coordinate'];
  cameraFacingVector: [number, number, number];
  cameraDistance: number;
  outgoingTransitionCountByOccurrenceId: Map<string, number>;
  priorityFrontierSet: Set<string>;
  requestedNeighborhoodRadius: number;
  detailNeighborhoodRadius: number;
  visibleOccurrenceCount: number;
  visibleLowDetailOccurrenceTarget: number;
}) {
  const hasNearDetailFrontier = selectedOccurrenceIds.some((occurrenceId) => {
    const occurrence = occurrenceById.get(occurrenceId);
    if (!occurrence || occurrence.terminal !== null) {
      return false;
    }

    if ((outgoingTransitionCountByOccurrenceId.get(occurrenceId) ?? 0) > 0) {
      return false;
    }

    const distance = distanceByOccurrenceId.get(occurrenceId) ?? Number.POSITIVE_INFINITY;
    return Number.isFinite(distance) && distance <= detailNeighborhoodRadius;
  });

  if (
    scope === 'whole-object' &&
    visibleOccurrenceCount >= visibleLowDetailOccurrenceTarget &&
    !hasNearDetailFrontier
  ) {
    return [];
  }

  return [...selectedOccurrenceIds]
    .filter((occurrenceId) => {
      const occurrence = occurrenceById.get(occurrenceId);
      if (!occurrence || occurrence.terminal !== null) {
        return false;
      }

      if ((outgoingTransitionCountByOccurrenceId.get(occurrenceId) ?? 0) > 0) {
        return false;
      }

      const distance = distanceByOccurrenceId.get(occurrenceId) ?? Number.POSITIVE_INFINITY;
      if (!Number.isFinite(distance)) {
        return false;
      }

      if (scope === 'local-neighborhood') {
        return distance < requestedNeighborhoodRadius;
      }

      return true;
    })
    .sort((left, right) => {
      if (left === focusOccurrenceId) {
        return -1;
      }
      if (right === focusOccurrenceId) {
        return 1;
      }

      const leftDistance = distanceByOccurrenceId.get(left) ?? Number.POSITIVE_INFINITY;
      const rightDistance = distanceByOccurrenceId.get(right) ?? Number.POSITIVE_INFINITY;
      const leftNear = leftDistance <= detailNeighborhoodRadius ? 0 : 1;
      const rightNear = rightDistance <= detailNeighborhoodRadius ? 0 : 1;
      if (leftNear !== rightNear) {
        return leftNear - rightNear;
      }

      const viewScoreDifference =
        scoreOccurrenceForView({
          occurrenceId: right,
          occurrenceById,
          focusOccurrenceId,
          focusCoordinate,
          cameraFacingVector,
          cameraDistance,
          distanceByOccurrenceId,
          priorityFrontierSet
        }) -
        scoreOccurrenceForView({
          occurrenceId: left,
          occurrenceById,
          focusOccurrenceId,
          focusCoordinate,
          cameraFacingVector,
          cameraDistance,
          distanceByOccurrenceId,
          priorityFrontierSet
        });

      if (viewScoreDifference !== 0) {
        return viewScoreDifference;
      }

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      const leftPriority = priorityFrontierSet.has(left) ? 0 : 1;
      const rightPriority = priorityFrontierSet.has(right) ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftRank =
        occurrenceById.get(left)?.salience.priorityHint.priorityRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank =
        occurrenceById.get(right)?.salience.priorityHint.priorityRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.localeCompare(right);
    });
}

function buildRuntimeNeighborhoodSnapshot({
  builderBootstrapManifest,
  occurrenceById,
  repeatedStateRelations,
  anchors,
  focusOccurrenceId,
  radius,
  refinementBudget,
  objectIdentityStable,
  cacheState,
  cacheStats,
  selectedOccurrenceIds,
  selectedEdges,
  lodByOccurrenceId,
  renderDemand,
  distanceByOccurrenceId
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[];
  anchors: BuilderAnchorRecord[];
  focusOccurrenceId: string;
  radius: number;
  refinementBudget: number;
  objectIdentityStable: boolean;
  cacheState: 'hit' | 'miss';
  cacheStats: RuntimeExplorationCacheStats;
  selectedOccurrenceIds: string[];
  selectedEdges: BuilderEdgeRecord[];
  lodByOccurrenceId: Map<string, RuntimeOccurrenceLod>;
  renderDemand: RuntimeRenderDemandSnapshot;
  distanceByOccurrenceId: Map<string, number>;
}): RuntimeNeighborhoodSnapshot {
  const selectedOccurrenceIdSet = new Set(selectedOccurrenceIds);

  return {
    graphObjectId: builderBootstrapManifest.graphObjectId,
    focusOccurrenceId,
    radius,
    refinementBudget,
    objectIdentityStable,
    cacheState,
    cacheStats,
    renderDemand,
    occurrences: selectedOccurrenceIds
      .map((occurrenceId) => {
        const occurrence = occurrenceById.get(occurrenceId);
        if (!occurrence) {
          return null;
        }

        return {
          ...occurrence,
          distance: distanceByOccurrenceId.get(occurrenceId) ?? Number.POSITIVE_INFINITY,
          isFocus: occurrenceId === focusOccurrenceId,
          lod:
            lodByOccurrenceId.get(occurrenceId) ??
            (occurrenceId === focusOccurrenceId ? 'focus' : 'distant')
        } satisfies RuntimeNeighborhoodOccurrence;
      })
      .filter(
        (occurrence): occurrence is RuntimeNeighborhoodOccurrence => occurrence !== null
      ),
    edges: selectedEdges
      .map(
        (edge) =>
          ({
            ...edge,
            distance: Math.min(
              distanceByOccurrenceId.get(edge.sourceOccurrenceId) ?? Number.POSITIVE_INFINITY,
              distanceByOccurrenceId.get(edge.targetOccurrenceId) ?? Number.POSITIVE_INFINITY
            )
          }) satisfies RuntimeNeighborhoodEdge
      ),
    repeatedStateRelations: selectRepeatedStateRelations(
      repeatedStateRelations,
      selectedOccurrenceIdSet
    ),
    terminalAnchors: selectTerminalAnchors(anchors, selectedOccurrenceIdSet),
    priorityFrontierOccurrenceIds:
      builderBootstrapManifest.priorityFrontierOccurrenceIds.filter((occurrenceId) =>
        selectedOccurrenceIdSet.has(occurrenceId)
      )
  };
}

function sortOccurrenceIds(
  occurrenceIds: string[],
  distanceByOccurrenceId: Map<string, number>,
  focusOccurrenceId: string,
  occurrenceById: Map<string, BuilderOccurrenceRecord>,
  priorityFrontierSet: Set<string>
) {
  return [...occurrenceIds].sort((left, right) => {
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
  anchors: BuilderAnchorRecord[],
  selectedOccurrenceIdSet: Set<string>
) {
  return anchors
    .filter((anchor) => anchor.anchorKind === 'terminal-outcome')
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