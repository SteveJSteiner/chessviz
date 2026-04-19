import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_POSITION } from 'chess.js';
import { deriveCameraOrbitState } from './cameraOrbit.ts';
import {
  createDynamicRuntimeSource,
  createViewerRuntimeStore
} from './dynamicRuntime.ts';

test('whole-object carrier rendering follows the budgeted edge subset', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 8,
    pathMoves: []
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const {
    camera,
    runtime: runtimeConfig
  } = runtimeStore.getViewerSceneManifest();
  const runtimeSnapshot = runtimeStore.inspectView(
    runtimeSource.runtimeBootstrap.initialFocusOccurrenceId,
    {
      scope: 'whole-object',
      neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
      refinementBudget: runtimeConfig.maxRefinementBudget,
      cameraDistance: Math.hypot(...camera.position),
      cameraOrbit: deriveCameraOrbitState(camera.position)
    }
  );

  assert.ok(
    runtimeSnapshot.renderDemand.enumeratedEdgeCount > runtimeSnapshot.edges.length
  );
  assert.equal(
    runtimeSnapshot.renderDemand.visibleEdgeCount,
    runtimeSnapshot.edges.length
  );

  const carrierSurface = runtimeStore.inspectCarrierSurface(
    runtimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    {
      refinementBudget: runtimeSnapshot.refinementBudget,
      selectedEdges: runtimeSnapshot.edges
    }
  );

  const selectedEdgeKeys = new Set(runtimeSnapshot.edges.map(edgeKey));

  assert.equal(carrierSurface.carriers.length, runtimeSnapshot.edges.length);
  assert.ok(
    carrierSurface.carriers.every((carrier) => selectedEdgeKeys.has(edgeKey(carrier)))
  );
});

test('whole-object selection preserves a connected scaffold across subtrees', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 8,
    pathMoves: []
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const {
    camera,
    runtime: runtimeConfig
  } = runtimeStore.getViewerSceneManifest();
  const runtimeSnapshot = runtimeStore.inspectView(
    runtimeSource.runtimeBootstrap.initialFocusOccurrenceId,
    {
      scope: 'whole-object',
      neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
      refinementBudget: 3,
      cameraDistance: Math.hypot(...camera.position),
      cameraOrbit: deriveCameraOrbitState(camera.position)
    }
  );
  const subtreeCounts = runtimeSnapshot.occurrences.reduce<Map<string, number>>(
    (counts, occurrence) => {
      counts.set(
        occurrence.embedding.subtreeKey,
        (counts.get(occurrence.embedding.subtreeKey) ?? 0) + 1
      );
      return counts;
    },
    new Map()
  );
  const nonRootSubtreeCounts = [...subtreeCounts.entries()].filter(
    ([subtreeKey]) => subtreeKey !== 'root'
  );
  const largestNonRootSubtreeCount = Math.max(
    ...nonRootSubtreeCounts.map(([, count]) => count)
  );

  assert.ok(runtimeSnapshot.occurrences.some((occurrence) => occurrence.distance === 2));
  assert.ok(runtimeSnapshot.edges.length >= runtimeSnapshot.occurrences.length - 4);
  assert.ok(nonRootSubtreeCounts.length >= 6);
  assert.ok(largestNonRootSubtreeCount <= 12);
});

test('whole-object reveal is stable across orbit changes at the same zoom band', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 8,
    pathMoves: []
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const focusOccurrenceId = runtimeSource.runtimeBootstrap.initialFocusOccurrenceId;
  const leftSnapshot = runtimeStore.inspectView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: 3,
    cameraDistance: 4.9,
    cameraOrbit: { azimuth: 0, elevation: 0.1 }
  });
  const rightSnapshot = runtimeStore.inspectView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: 3,
    cameraDistance: 4.9,
    cameraOrbit: { azimuth: Math.PI / 2, elevation: 0.1 }
  });

  assert.deepEqual(
    leftSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    rightSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  assert.deepEqual(
    leftSnapshot.edges.map(edgeKey),
    rightSnapshot.edges.map(edgeKey)
  );
});

test('whole-object reveal extends the coarse scaffold when zooming closer', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 8,
    pathMoves: []
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const focusOccurrenceId = runtimeSource.runtimeBootstrap.initialFocusOccurrenceId;
  const structureSnapshot = runtimeStore.inspectView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: 3,
    cameraDistance: 4.9,
    cameraOrbit: { azimuth: 0, elevation: 0.1 }
  });
  const contextualSnapshot = runtimeStore.inspectView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: runtimeConfig.maxRefinementBudget,
    cameraDistance: 2.8,
    cameraOrbit: { azimuth: 0, elevation: 0.1 }
  });
  const contextualOccurrenceIdSet = new Set(
    contextualSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const contextualEdgeKeySet = new Set(contextualSnapshot.edges.map(edgeKey));

  assert.ok(
    structureSnapshot.occurrences.length <=
      structureSnapshot.renderDemand.policy.visibleLowDetailOccurrenceTarget
  );
  assert.ok(
    contextualSnapshot.occurrences.length <=
      contextualSnapshot.renderDemand.policy.visibleLowDetailOccurrenceTarget
  );
  assert.ok(
    structureSnapshot.occurrences.every((occurrence) =>
      contextualOccurrenceIdSet.has(occurrence.occurrenceId)
    )
  );
  assert.ok(
    structureSnapshot.edges.every((edge) => contextualEdgeKeySet.has(edgeKey(edge)))
  );
});

test('whole-object repeated inspection reuses the cached graph surface', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 8,
    pathMoves: []
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const focusOccurrenceId = runtimeSource.runtimeBootstrap.initialFocusOccurrenceId;
  const firstSnapshot = runtimeStore.inspectView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: runtimeConfig.maxRefinementBudget,
    cameraDistance: 4.2,
    cameraOrbit: { azimuth: 0, elevation: 0.1 }
  });
  const secondSnapshot = runtimeStore.inspectView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: runtimeConfig.maxRefinementBudget,
    cameraDistance: 4.2,
    cameraOrbit: { azimuth: 0.5, elevation: 0.1 }
  });

  assert.equal(firstSnapshot.cacheState, 'miss');
  assert.equal(secondSnapshot.cacheState, 'hit');
  assert.deepEqual(
    firstSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    secondSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
});

test('whole-object materialization compacts far dynamic branches once the store grows too large', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 12,
    pathMoves: []
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const {
    camera,
    runtime: runtimeConfig
  } = runtimeStore.getViewerSceneManifest();
  const initialOccurrenceCount =
    runtimeStore.getBuilderBootstrapManifest().occurrences.length;
  const runtimeSnapshot = runtimeStore.materializeView(
    runtimeSource.runtimeBootstrap.initialFocusOccurrenceId,
    {
      scope: 'whole-object',
      neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
      refinementBudget: runtimeConfig.maxRefinementBudget,
      cameraDistance: Math.hypot(...camera.position),
      cameraOrbit: deriveCameraOrbitState(camera.position)
    }
  );
  const compactedManifest = runtimeStore.getBuilderBootstrapManifest();
  const compactedOccurrenceIdSet = new Set(
    compactedManifest.occurrences.map((occurrence) => occurrence.occurrenceId)
  );

  assert.ok(initialOccurrenceCount > 1536);
  assert.ok(compactedManifest.occurrences.length < initialOccurrenceCount);
  assert.ok(
    runtimeSnapshot.occurrences.every((occurrence) =>
      compactedOccurrenceIdSet.has(occurrence.occurrenceId)
    )
  );
});

test('whole-object compaction preserves the active navigation corridor across camera movement', () => {
  const runtimeSource = createDynamicRuntimeSource({
    fen: DEFAULT_POSITION,
    maxDepth: 3,
    maxBranching: 12,
    pathMoves: [
      'b2b4',
      'g8f6',
      'c2c3',
      'a7a6',
      'a2a4',
      'b7b6',
      'd2d3',
      'h8g8',
      'd3d4',
      'g8h8',
      'c3c4',
      'h8g8',
      'd4d5',
      'g8h8',
      'c4c5',
      'h8g8',
      'a4a5',
      'g8h8'
    ]
  });
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const focusOccurrenceId = runtimeSource.runtimeBootstrap.initialFocusOccurrenceId;

  runtimeStore.materializeView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: runtimeConfig.maxRefinementBudget,
    cameraDistance: 2.8,
    cameraOrbit: { azimuth: 0.1, elevation: 0.08 }
  });

  const expandedManifest = runtimeStore.getBuilderBootstrapManifest();
  const navigationCorridorOccurrenceIds = collectOccurrenceNeighborhoodIds(
    expandedManifest.transitions,
    focusOccurrenceId,
    2
  ).filter((occurrenceId) => occurrenceId !== focusOccurrenceId);

  assert.ok(navigationCorridorOccurrenceIds.length > 0);

  const farSnapshot = runtimeStore.materializeView(focusOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
    refinementBudget: 3,
    cameraDistance: 4.9,
    cameraOrbit: { azimuth: 0.7, elevation: 0.12 }
  });
  const compactedManifest = runtimeStore.getBuilderBootstrapManifest();
  const compactedOccurrenceIdSet = new Set(
    compactedManifest.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const visibleOccurrenceIdSet = new Set(
    farSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const ambientOccurrenceIdSet = new Set(
    farSnapshot.ambientOccurrences.map((occurrence) => occurrence.occurrenceId)
  );

  assert.ok(
    navigationCorridorOccurrenceIds.every((occurrenceId) =>
      compactedOccurrenceIdSet.has(occurrenceId)
    )
  );
  assert.ok(
    navigationCorridorOccurrenceIds.some((occurrenceId) =>
      !visibleOccurrenceIdSet.has(occurrenceId)
    )
  );
  assert.ok(
    farSnapshot.ambientOccurrences.every((occurrence) =>
      !visibleOccurrenceIdSet.has(occurrence.occurrenceId)
    )
  );
  assert.ok(
    navigationCorridorOccurrenceIds.some((occurrenceId) =>
      ambientOccurrenceIdSet.has(occurrenceId)
    )
  );
});

function edgeKey(edge: {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
}) {
  return `${edge.sourceOccurrenceId}|${edge.targetOccurrenceId}`;
}

function collectOccurrenceNeighborhoodIds(
  transitions: Array<{
    sourceOccurrenceId: string;
    targetOccurrenceId: string;
  }>,
  focusOccurrenceId: string,
  radius: number
) {
  const adjacencyByOccurrenceId = transitions.reduce<Map<string, Set<string>>>(
    (adjacency, transition) => {
      const sourceAdjacency =
        adjacency.get(transition.sourceOccurrenceId) ?? new Set<string>();
      sourceAdjacency.add(transition.targetOccurrenceId);
      adjacency.set(transition.sourceOccurrenceId, sourceAdjacency);

      const targetAdjacency =
        adjacency.get(transition.targetOccurrenceId) ?? new Set<string>();
      targetAdjacency.add(transition.sourceOccurrenceId);
      adjacency.set(transition.targetOccurrenceId, targetAdjacency);

      return adjacency;
    },
    new Map()
  );
  const visitedOccurrenceIds = new Set<string>([focusOccurrenceId]);
  const retainedOccurrenceIds: string[] = [];
  const pendingOccurrences = [{ occurrenceId: focusOccurrenceId, distance: 0 }];
  let queueIndex = 0;

  while (queueIndex < pendingOccurrences.length) {
    const currentEntry = pendingOccurrences[queueIndex];
    queueIndex += 1;

    if (!currentEntry) {
      continue;
    }

    retainedOccurrenceIds.push(currentEntry.occurrenceId);

    if (currentEntry.distance >= radius) {
      continue;
    }

    const adjacentOccurrenceIds = adjacencyByOccurrenceId.get(currentEntry.occurrenceId);

    if (!adjacentOccurrenceIds) {
      continue;
    }

    for (const adjacentOccurrenceId of adjacentOccurrenceIds) {
      if (visitedOccurrenceIds.has(adjacentOccurrenceId)) {
        continue;
      }

      visitedOccurrenceIds.add(adjacentOccurrenceId);
      pendingOccurrences.push({
        occurrenceId: adjacentOccurrenceId,
        distance: currentEntry.distance + 1
      });
    }
  }

  return retainedOccurrenceIds;
}