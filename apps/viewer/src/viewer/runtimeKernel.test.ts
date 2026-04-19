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

function edgeKey(edge: {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
}) {
  return `${edge.sourceOccurrenceId}|${edge.targetOccurrenceId}`;
}