import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VIEW_SCALE,
  buildOccurrenceRadiusCaps,
  createCarrierPresentation,
  createOccurrencePresentation
} from './carrierPresentation.ts';
import type { RuntimeCarrierRecord, RuntimeNeighborhoodOccurrence } from './contracts.ts';

test('caps dense occurrence radii below nearest-neighbor spacing', () => {
  const denseOccurrences = [
    createOccurrence({ occurrenceId: 'focus', coordinate: [0, 0, 0], normalizedScore: 0.95, isFocus: true }),
    createOccurrence({ occurrenceId: 'neighbor-a', coordinate: [0.06, 0, 0], normalizedScore: 0.95 }),
    createOccurrence({ occurrenceId: 'neighbor-b', coordinate: [0.18, 0, 0], normalizedScore: 0.65 })
  ];
  const caps = buildOccurrenceRadiusCaps(denseOccurrences);
  const focusCap = caps.get('focus');
  const neighborCap = caps.get('neighbor-a');

  assert.ok(focusCap);
  assert.ok(neighborCap);

  if (!focusCap || !neighborCap) {
    throw new Error('expected caps for dense occurrences');
  }

  const scaledDistance = 0.06 * VIEW_SCALE;
  assert.ok(focusCap + neighborCap < scaledDistance);
});

test('gives isolated occurrences more headroom than dense ones', () => {
  const denseCaps = buildOccurrenceRadiusCaps([
    createOccurrence({ occurrenceId: 'dense-a', coordinate: [0, 0, 0], normalizedScore: 0.85 }),
    createOccurrence({ occurrenceId: 'dense-b', coordinate: [0.06, 0, 0], normalizedScore: 0.85 })
  ]);
  const isolatedCaps = buildOccurrenceRadiusCaps([
    createOccurrence({ occurrenceId: 'isolated-a', coordinate: [0, 0, 0], normalizedScore: 0.85 }),
    createOccurrence({ occurrenceId: 'isolated-b', coordinate: [0.5, 0, 0], normalizedScore: 0.85 })
  ]);

  assert.ok((isolatedCaps.get('isolated-a') ?? 0) > (denseCaps.get('dense-a') ?? 0));
});

test('createOccurrencePresentation respects the supplied radius cap', () => {
  const occurrence = createOccurrence({
    occurrenceId: 'capped',
    coordinate: [0, 0, 0],
    normalizedScore: 1,
    isFocus: true
  });
  const presentation = createOccurrencePresentation(occurrence, '#0f766e', 0.05);

  assert.equal(presentation.radius, 0.05);
  assert.ok(presentation.haloRadius > presentation.radius);
});

test('createOccurrencePresentation shrinks capped nodes when node size is reduced', () => {
  const occurrence = createOccurrence({
    occurrenceId: 'scaled-capped',
    coordinate: [0, 0, 0],
    normalizedScore: 1,
    isFocus: false
  });
  const presentation = createOccurrencePresentation(occurrence, '#0f766e', 0.05, 0.5);

  assert.equal(presentation.radius, 0.025);
});

test('createOccurrencePresentation exposes phase ring colors separately from focus ring', () => {
  const openingOccurrence = createOccurrence({
    occurrenceId: 'opening-node',
    coordinate: [0, 0, 0],
    normalizedScore: 0.8,
    phaseLabel: 'opening'
  });
  const endgameOccurrence = createOccurrence({
    occurrenceId: 'endgame-node',
    coordinate: [0.2, 0, 0],
    normalizedScore: 0.8,
    phaseLabel: 'endgame',
    isFocus: true
  });
  const openingPresentation = createOccurrencePresentation(
    openingOccurrence,
    '#0f766e'
  );
  const endgamePresentation = createOccurrencePresentation(
    endgameOccurrence,
    '#0f766e'
  );

  assert.equal(openingPresentation.phaseRingColor, '#1d4ed8');
  assert.equal(endgamePresentation.phaseRingColor, '#6d28d9');
  assert.equal(endgamePresentation.ringColor, '#b7791f');
});

test('createCarrierPresentation keeps quiet and capture families visually distinct', () => {
  const quietPresentation = createCarrierPresentation(
    createCarrier({ interactionClass: 'quiet', forcingClass: 'quiet', san: 'd4' })
  );
  const capturePresentation = createCarrierPresentation(
    createCarrier({ interactionClass: 'capture', forcingClass: 'quiet', san: 'Qxd5' })
  );

  assert.equal(quietPresentation.structureColor, '#334155');
  assert.equal(capturePresentation.structureColor, '#d97706');
  assert.notEqual(quietPresentation.structureColor, capturePresentation.structureColor);
});

test('keeps terminal carrier thickness closer to the quiet baseline', () => {
  const quietPresentation = createCarrierPresentation(
    createCarrier({ interactionClass: 'quiet', forcingClass: 'quiet', san: 'd4' })
  );
  const terminalPresentation = createCarrierPresentation(
    createCarrier({ interactionClass: 'capture', forcingClass: 'checkmate', san: 'Qxf7#' })
  );

  assert.ok(terminalPresentation.structureRadius > quietPresentation.structureRadius);
  assert.ok(
    terminalPresentation.structureRadius - quietPresentation.structureRadius <= 0.014
  );
});

function createOccurrence({
  occurrenceId,
  coordinate,
  normalizedScore,
  phaseLabel = 'opening',
  isFocus = false
}: {
  occurrenceId: string;
  coordinate: [number, number, number];
  normalizedScore: number;
  phaseLabel?: string;
  isFocus?: boolean;
}): RuntimeNeighborhoodOccurrence {
  return {
    occurrenceId,
    stateKey: `${occurrenceId}:state`,
    path: ['game:test', occurrenceId],
    ply: isFocus ? 3 : 4,
    identity: {
      occurrenceKey: occurrenceId,
      positionKey: `${occurrenceId}:state`,
      pathKey: `game:test|${occurrenceId}`,
      continuityKey: `${occurrenceId}:state`
    },
    annotations: {
      phaseLabel,
      materialSignature: 'balanced-material'
    },
    regime: {
      regimeId: 'opening-table',
      candidateRegimeIds: ['opening-table'],
      resolverInputId: 'resolver:opening-table',
      selectionRule: 'declared-regime-membership'
    },
    provenance: {
      sourceKind: 'test-fixture',
      sourceName: 'carrierPresentation.test',
      sourceVersion: '1',
      sourceLocation: 'in-memory',
      detail: `occurrence ${occurrenceId}`
    },
    salience: {
      rawScore: normalizedScore,
      normalizedScore,
      frequencySignal: normalizedScore,
      terminalPullSignal: 0,
      centralitySignal: normalizedScore,
      priorityHint: {
        priorityRank: 1,
        priorityBand: 'frontier',
        retainFromZoom: 'structure'
      },
      provenance: {
        sourceKind: 'test-fixture',
        sourceName: 'carrierPresentation.test',
        sourceVersion: '1',
        sourceLocation: 'in-memory',
        detail: `salience ${occurrenceId}`
      }
    },
    terminal: null,
    embedding: {
      coordinate,
      ballRadius: 0.12,
      azimuth: 0,
      elevation: 0,
      rootGameId: 'test',
      terminalAnchorId: null
    },
    distance: isFocus ? 0 : 1,
    isFocus
  };
}

function createCarrier({
  interactionClass,
  forcingClass,
  san
}: {
  interactionClass: string;
  forcingClass: string;
  san: string;
}): RuntimeCarrierRecord {
  return {
    sourceOccurrenceId: 'source',
    targetOccurrenceId: 'target',
    moveUci: san,
    ply: 5,
    moveFamily: {
      interactionClass,
      forcingClass,
      specialClass: 'none'
    },
    centerlineProfile: san.includes('#') ? 'terminal-snap' : 'arc',
    departureStrength: 0.8,
    lateralOffset: 0.1,
    verticalLift: 0.08,
    curvature: 0.12,
    twist: 0.04,
    san,
    activeBands: ['structure'],
    bandStates: [
      {
        bandId: 'structure',
        revealBudget: 1,
        amplitude: 0.16,
        active: true
      }
    ],
    samples: [
      [0, 0, 0],
      [0.5, 0.12, 0],
      [1, 0, 0]
    ],
    validation: {
      endpointLocked: true,
      finiteCoordinates: true,
      projectedProgressMonotone: true,
      nonDegenerateSegments: true,
      coarseDominant: true
    }
  };
}