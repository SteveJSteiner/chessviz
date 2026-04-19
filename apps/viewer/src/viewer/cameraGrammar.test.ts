import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  RuntimeExplorationConfig,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  Vector3
} from './contracts.ts';
import {
  createCameraGrammarState,
  resolveCameraGrammarBudgetTargets,
  resolveCameraGrammarRefinementBudget
} from './cameraGrammar.ts';
import { LIVE_VIEW_DISTANCE } from './labelPolicy.ts';

const runtimeConfig = {
  maxRefinementBudget: 12
} satisfies Pick<RuntimeExplorationConfig, 'maxRefinementBudget'>;

test('maps zoom bands to monotone refinement budgets', () => {
  const budgetTargets = resolveCameraGrammarBudgetTargets(
    runtimeConfig.maxRefinementBudget
  );

  assert.deepEqual(budgetTargets, {
    structure: 3,
    tactical: 6,
    contextual: 12
  });
  assert.equal(
    resolveCameraGrammarRefinementBudget(
      LIVE_VIEW_DISTANCE.structureThreshold + 0.2,
      runtimeConfig
    ),
    3
  );
  assert.equal(
    resolveCameraGrammarRefinementBudget(
      LIVE_VIEW_DISTANCE.tacticalThreshold + 0.2,
      runtimeConfig
    ),
    6
  );
  assert.equal(
    resolveCameraGrammarRefinementBudget(LIVE_VIEW_DISTANCE.min + 0.1, runtimeConfig),
    12
  );
});

test('tightens the camera anchor toward the focus as the view moves closer', () => {
  const runtimeSnapshot = createRuntimeSnapshot([
    createOccurrence({ occurrenceId: 'focus', coordinate: [0, 0, 0], isFocus: true, distance: 0, ply: 4, normalizedScore: 1 }),
    createOccurrence({ occurrenceId: 'prior', coordinate: [-1.2, 0.1, -0.8], distance: 1, ply: 3, normalizedScore: 0.58 }),
    createOccurrence({ occurrenceId: 'branch-a', coordinate: [1.3, 0.3, 2.1], distance: 1, ply: 5, normalizedScore: 0.82 }),
    createOccurrence({ occurrenceId: 'branch-b', coordinate: [2.4, 0.45, 3.4], distance: 2, ply: 6, normalizedScore: 0.74, terminal: true })
  ]);

  const structureGrammar = createCameraGrammarState({
    cameraDistance: LIVE_VIEW_DISTANCE.structureThreshold + 0.2,
    runtimeConfig,
    runtimeSnapshot
  });
  const contextualGrammar = createCameraGrammarState({
    cameraDistance: LIVE_VIEW_DISTANCE.min + 0.1,
    runtimeConfig,
    runtimeSnapshot
  });

  assert.equal(structureGrammar.band, 'structure');
  assert.equal(contextualGrammar.band, 'contextual');
  assert.ok(distanceBetween(structureGrammar.lookAt, structureGrammar.focusCoordinate) > 0.25);
  assert.ok(
    distanceBetween(contextualGrammar.lookAt, contextualGrammar.focusCoordinate) <
      distanceBetween(structureGrammar.lookAt, structureGrammar.focusCoordinate)
  );
  assert.ok(structureGrammar.lookAt[2] > 0);
  assert.ok(contextualGrammar.lookAt[2] > 0);
});

function createRuntimeSnapshot(
  occurrences: RuntimeNeighborhoodOccurrence[]
): RuntimeNeighborhoodSnapshot {
  const focusOccurrence = occurrences.find((occurrence) => occurrence.isFocus);

  if (!focusOccurrence) {
    throw new Error('expected focused occurrence in test snapshot');
  }

  return {
    graphObjectId: 'fixture-graph',
    focusOccurrenceId: focusOccurrence.occurrenceId,
    radius: 2,
    refinementBudget: 6,
    objectIdentityStable: true,
    cacheState: 'hit',
    cacheStats: {
      hits: 1,
      misses: 0,
      evictions: 0,
      entryCount: 1
    },
    renderDemand: {
      scope: 'local-neighborhood',
      policy: {
        renderSubsetPolicy: 'test-fixture',
        residencyPolicy: 'test-fixture',
        lodPolicy: 'test-fixture',
        focusLevelPolicy: 'test-fixture',
        detailNeighborhoodRadius: 2,
        visibleLowDetailOccurrenceTarget: occurrences.length,
        visibleEdgeTarget: 0
      },
      enumeratedOccurrenceCount: occurrences.length,
      enumeratedEdgeCount: 0,
      visibleOccurrenceCount: occurrences.length,
      visibleEdgeCount: 0,
      hotOccurrenceCount: occurrences.filter(
        (occurrence) => occurrence.lod === 'focus' || occurrence.lod === 'detail'
      ).length,
      warmOccurrenceCount: occurrences.filter(
        (occurrence) => occurrence.lod === 'context' || occurrence.lod === 'distant'
      ).length,
      coldOccurrenceCount: 0,
      frontierExpansionOccurrenceIds: []
    },
    ambientOccurrences: [],
    occurrences,
    edges: [],
    repeatedStateRelations: [],
    terminalAnchors: [],
    priorityFrontierOccurrenceIds: []
  };
}

function createOccurrence({
  occurrenceId,
  coordinate,
  distance,
  ply,
  normalizedScore,
  isFocus = false,
  terminal = false
}: {
  occurrenceId: string;
  coordinate: Vector3;
  distance: number;
  ply: number;
  normalizedScore: number;
  isFocus?: boolean;
  terminal?: boolean;
}): RuntimeNeighborhoodOccurrence {
  const phaseLabel = ply < 8 ? 'opening' : 'middlegame';
  const regimeId = phaseLabel === 'opening' ? 'opening-table' : 'middlegame-procedural';

  return {
    occurrenceId,
    stateKey: `${occurrenceId}:state`,
    path: ['game:fixture', occurrenceId],
    ply,
    identity: {
      occurrenceKey: occurrenceId,
      positionKey: `${occurrenceId}:state`,
      pathKey: `game:fixture|${occurrenceId}`,
      continuityKey: `${occurrenceId}:state`
    },
    annotations: {
      phaseLabel,
      materialSignature: 'balanced'
    },
    regime: {
      regimeId,
      candidateRegimeIds: [regimeId],
      resolverInputId: `resolver:${regimeId}`,
      selectionRule: 'declared-regime-membership'
    },
    provenance: {
      sourceKind: 'test-fixture',
      sourceName: 'cameraGrammar.test',
      sourceVersion: '1',
      sourceLocation: 'in-memory',
      detail: `occurrence ${occurrenceId}`
    },
    salience: {
      rawScore: normalizedScore,
      normalizedScore,
      frequencySignal: normalizedScore,
      terminalPullSignal: terminal ? 1 : 0,
      centralitySignal: normalizedScore * 0.75,
      priorityHint: {
        priorityRank: isFocus ? 0 : 2,
        priorityBand: isFocus ? 'focus' : 'local',
        retainFromZoom: isFocus ? 'structure' : 'tactical'
      },
      provenance: {
        sourceKind: 'test-fixture',
        sourceName: 'cameraGrammar.test',
        sourceVersion: '1',
        sourceLocation: 'in-memory',
        detail: `salience ${occurrenceId}`
      }
    },
    terminal: terminal
      ? {
          wdlLabel: 'W',
          outcomeClass: 'win',
          anchorId: `terminal:${occurrenceId}`,
          provenance: {
            sourceKind: 'test-fixture',
            sourceName: 'cameraGrammar.test',
            sourceVersion: '1',
            sourceLocation: 'in-memory',
            detail: `terminal ${occurrenceId}`
          }
        }
      : null,
    embedding: {
      coordinate,
      ballRadius: 0.12,
      azimuth: 0,
      elevation: 0,
      subtreeKey: 'e2e4',
      terminalAnchorId: terminal ? `terminal:${occurrenceId}` : null
    },
    distance,
    isFocus,
    lod: isFocus ? 'focus' : distance <= 1 ? 'detail' : 'context'
  };
}

function distanceBetween(left: Vector3, right: Vector3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}