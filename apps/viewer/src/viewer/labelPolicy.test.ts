import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  RuntimeCarrierRecord,
  RuntimeNeighborhoodOccurrence
} from './contracts.ts';
import {
  LIVE_VIEW_DISTANCE,
  selectCarrierLabelSelections,
  selectOccurrenceLabelSelections
} from './labelPolicy.ts';

test('reveals carrier labels monotonically as the camera moves closer', () => {
  const occurrences = [
    createOccurrence({ occurrenceId: 'focus', distance: 0, isFocus: true, normalizedScore: 0.96, priorityRank: 0 }),
    createOccurrence({ occurrenceId: 'a', distance: 1, normalizedScore: 0.84, priorityRank: 1 }),
    createOccurrence({ occurrenceId: 'b', distance: 1, normalizedScore: 0.78, priorityRank: 2 }),
    createOccurrence({ occurrenceId: 'c', distance: 1, normalizedScore: 0.66, priorityRank: 3 }),
    createOccurrence({ occurrenceId: 'd', distance: 1, normalizedScore: 0.58, priorityRank: 4 }),
    createOccurrence({ occurrenceId: 'e', distance: 2, normalizedScore: 0.42, priorityRank: 5 })
  ];
  const carriers = [
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'a', san: 'Qh5', departureStrength: 0.78, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'b', san: 'Nf3', departureStrength: 0.62, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'c', san: 'Bc4', departureStrength: 0.56, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'a', targetOccurrenceId: 'd', san: 'Qxf7#', departureStrength: 0.9, ply: 6 }),
    createCarrier({ sourceOccurrenceId: 'b', targetOccurrenceId: 'e', san: 'd4', departureStrength: 0.44, ply: 6 }),
    createCarrier({ sourceOccurrenceId: 'c', targetOccurrenceId: 'd', san: 'Bb5', departureStrength: 0.38, ply: 6 })
  ];

  const structureSelections = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.structureThreshold + 0.3,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  });
  const tacticalSelections = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.tacticalThreshold + 0.3,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  });
  const contextualSelections = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.min + 0.2,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  });

  assert.ok(structureSelections.length > 0);
  assert.ok(tacticalSelections.length >= structureSelections.length);
  assert.ok(contextualSelections.length >= tacticalSelections.length);
  assert.ok(
    structureSelections.every((selection) =>
      tacticalSelections.some(
        (candidate) => carrierKey(candidate.carrier) === carrierKey(selection.carrier)
      )
    )
  );
  assert.ok(
    tacticalSelections.every((selection) =>
      contextualSelections.some(
        (candidate) => carrierKey(candidate.carrier) === carrierKey(selection.carrier)
      )
    )
  );
});

test('caps label saturation around a dense focus branch and keeps the most salient moves', () => {
  const occurrences = [
    createOccurrence({ occurrenceId: 'focus', distance: 0, isFocus: true, normalizedScore: 0.98, priorityRank: 0 }),
    createOccurrence({ occurrenceId: 'a', distance: 1, normalizedScore: 0.95, priorityRank: 1 }),
    createOccurrence({ occurrenceId: 'b', distance: 1, normalizedScore: 0.86, priorityRank: 2 }),
    createOccurrence({ occurrenceId: 'c', distance: 1, normalizedScore: 0.78, priorityRank: 3 }),
    createOccurrence({ occurrenceId: 'd', distance: 1, normalizedScore: 0.71, priorityRank: 4 }),
    createOccurrence({ occurrenceId: 'e', distance: 1, normalizedScore: 0.34, priorityRank: 6 }),
    createOccurrence({ occurrenceId: 'f', distance: 1, normalizedScore: 0.22, priorityRank: 8 })
  ];
  const carriers = [
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'a', san: 'Qh5', departureStrength: 0.82, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'b', san: 'Nf3', departureStrength: 0.68, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'c', san: 'Bc4', departureStrength: 0.61, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'd', san: 'd4', departureStrength: 0.55, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'e', san: 'a3', departureStrength: 0.28, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'f', san: 'h3', departureStrength: 0.24, ply: 5 })
  ];

  const selections = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.min + 0.1,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  });
  const selectedSans = new Set(selections.map((selection) => selection.carrier.san));

  assert.equal(selections.length, 4);
  assert.ok(selectedSans.has('Qh5'));
  assert.ok(selectedSans.has('Nf3'));
  assert.ok(selectedSans.has('Bc4'));
  assert.ok(selectedSans.has('d4'));
  assert.equal(selectedSans.has('a3'), false);
  assert.equal(selectedSans.has('h3'), false);
});

test('keeps root labels visible farther out and only adds distant terminal labels at closer view', () => {
  const occurrences = [
    createOccurrence({ occurrenceId: 'root', distance: 2, normalizedScore: 0.8, ply: 0, subtreeKey: 'root', fixtureKey: 'dense-branch-root' }),
    createOccurrence({ occurrenceId: 'focus', distance: 0, isFocus: true, normalizedScore: 0.94, priorityRank: 0, ply: 5 }),
    createOccurrence({ occurrenceId: 'near-terminal', distance: 1, normalizedScore: 0.72, priorityRank: 2, ply: 6, terminal: true }),
    createOccurrence({ occurrenceId: 'far-terminal', distance: 2, normalizedScore: 0.66, priorityRank: 3, ply: 7, terminal: true })
  ];

  const structureSelections = selectOccurrenceLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.structureThreshold + 0.25,
    occurrences
  });
  const contextualSelections = selectOccurrenceLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.min + 0.15,
    occurrences
  });

  assert.ok(
    structureSelections.some(
      (selection) => selection.kind === 'root' && selection.occurrence.occurrenceId === 'root'
    )
  );
  assert.equal(
    structureSelections.some(
      (selection) =>
        selection.kind === 'terminal' &&
        selection.occurrence.occurrenceId === 'far-terminal'
    ),
    false
  );
  assert.ok(
    contextualSelections.some(
      (selection) =>
        selection.kind === 'terminal' &&
        selection.occurrence.occurrenceId === 'far-terminal'
    )
  );
});

test('keeps carrier label scale stable across zoom bands', () => {
  const occurrences = [
    createOccurrence({ occurrenceId: 'focus', distance: 0, isFocus: true, normalizedScore: 0.96, priorityRank: 0 }),
    createOccurrence({ occurrenceId: 'a', distance: 1, normalizedScore: 0.84, priorityRank: 1 }),
    createOccurrence({ occurrenceId: 'b', distance: 1, normalizedScore: 0.78, priorityRank: 2 })
  ];
  const carriers = [
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'a', san: 'Qh5', departureStrength: 0.78, ply: 5 }),
    createCarrier({ sourceOccurrenceId: 'focus', targetOccurrenceId: 'b', san: 'Nf3', departureStrength: 0.62, ply: 5 })
  ];

  const structureSelection = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.structureThreshold + 0.2,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  }).find((selection) => selection.carrier.san === 'Qh5');
  const tacticalSelection = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.tacticalThreshold + 0.2,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  }).find((selection) => selection.carrier.san === 'Qh5');
  const contextualSelection = selectCarrierLabelSelections({
    cameraDistance: LIVE_VIEW_DISTANCE.min + 0.1,
    carriers,
    focusOccurrenceId: 'focus',
    occurrences
  }).find((selection) => selection.carrier.san === 'Qh5');

  assert.equal(structureSelection?.scale, tacticalSelection?.scale);
  assert.equal(tacticalSelection?.scale, contextualSelection?.scale);
});

function carrierKey(carrier: RuntimeCarrierRecord) {
  return `${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}`;
}

function createOccurrence({
  occurrenceId,
  distance,
  isFocus = false,
  normalizedScore,
  priorityRank = 5,
  ply = 1,
  fixtureKey = 'fixture-game',
  subtreeKey = ply === 0 ? 'root' : 'e2e4',
  terminal = false
}: {
  occurrenceId: string;
  distance: number;
  isFocus?: boolean;
  normalizedScore: number;
  priorityRank?: number;
  ply?: number;
  fixtureKey?: string;
  subtreeKey?: string;
  terminal?: boolean;
}): RuntimeNeighborhoodOccurrence {
  const phaseLabel = ply < 8 ? 'opening' : 'middlegame';
  const regimeId = phaseLabel === 'opening' ? 'opening-table' : 'middlegame-procedural';

  return {
    occurrenceId,
    stateKey: `${occurrenceId}:state`,
    path: ply === 0 ? [`game:${fixtureKey}`] : [`game:${fixtureKey}`, occurrenceId],
    ply,
    identity: {
      occurrenceKey: occurrenceId,
      positionKey: `${occurrenceId}:state`,
      pathKey:
        ply === 0 ? `game:${fixtureKey}` : `game:${fixtureKey}|${occurrenceId}`,
      continuityKey: `${occurrenceId}:state`
    },
    annotations: {
      phaseLabel,
      materialSignature: 'balanced-material'
    },
    regime: {
      regimeId,
      candidateRegimeIds: [regimeId],
      resolverInputId: `resolver:${regimeId}`,
      selectionRule: 'declared-regime-membership'
    },
    provenance: {
      sourceKind: 'test-fixture',
      sourceName: 'labelPolicy.test',
      sourceVersion: '1',
      sourceLocation: 'in-memory',
      detail: `occurrence ${occurrenceId}`
    },
    salience: {
      rawScore: normalizedScore,
      normalizedScore,
      frequencySignal: normalizedScore,
      terminalPullSignal: terminal ? 1 : 0,
      centralitySignal: normalizedScore * 0.8,
      priorityHint: {
        priorityRank,
        priorityBand: priorityRank <= 2 ? 'frontier' : 'local',
        retainFromZoom: priorityRank <= 2 ? 'structure' : 'contextual'
      },
      provenance: {
        sourceKind: 'test-fixture',
        sourceName: 'labelPolicy.test',
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
            sourceName: 'labelPolicy.test',
            sourceVersion: '1',
            sourceLocation: 'in-memory',
            detail: `terminal ${occurrenceId}`
          }
        }
      : null,
    embedding: {
      coordinate: [0, 0, 0],
      ballRadius: 0.12,
      azimuth: 0,
      elevation: 0,
      subtreeKey,
      terminalAnchorId: terminal ? `terminal:${occurrenceId}` : null
    },
    distance,
    isFocus,
    lod: isFocus ? 'focus' : distance <= 1 ? 'detail' : 'context'
  };
}

function createCarrier({
  sourceOccurrenceId,
  targetOccurrenceId,
  san,
  departureStrength,
  ply
}: {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  san: string;
  departureStrength: number;
  ply: number;
}): RuntimeCarrierRecord {
  return {
    sourceOccurrenceId,
    targetOccurrenceId,
    moveUci: san,
    ply,
    moveFamily: {
      interactionClass: san.includes('x') ? 'capture' : 'quiet',
      forcingClass: san.includes('#') ? 'checkmate' : 'quiet',
      specialClass: 'none'
    },
    centerlineProfile: san.includes('#') ? 'terminal-snap' : 'arc',
    departureStrength,
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