import type {
  RuntimeCarrierRecord,
  RuntimeNeighborhoodOccurrence,
  Vector3
} from './contracts';

export const VIEW_SCALE = 2.6;

export const N10B_REVIEW_BUDGETS = {
  structure: 3,
  tactical: 6,
  contextual: 12
} as const;

export const PHASE_NODE_KEY = {
  opening: {
    label: 'Opening node',
    fillColor: '#2563eb',
    ringColor: '#1d4ed8',
    markColor: '#dbeafe'
  },
  middlegame: {
    label: 'Middlegame node',
    fillColor: '#0f766e',
    ringColor: '#0f766e',
    markColor: '#ccfbf1'
  },
  endgame: {
    label: 'Endgame node',
    fillColor: '#7c3aed',
    ringColor: '#6d28d9',
    markColor: '#ede9fe'
  },
  fallback: {
    label: 'Context node',
    fillColor: '#475569',
    ringColor: '#334155',
    markColor: '#e2e8f0'
  }
} as const;

export const TERMINAL_NODE_KEY = {
  W: {
    label: 'Terminal win',
    fillColor: '#15803d',
    ringColor: '#166534',
    markColor: '#dcfce7'
  },
  D: {
    label: 'Terminal draw',
    fillColor: '#c2410c',
    ringColor: '#9a3412',
    markColor: '#ffedd5'
  },
  L: {
    label: 'Terminal loss',
    fillColor: '#b91c1c',
    ringColor: '#991b1b',
    markColor: '#fee2e2'
  },
  fallback: {
    label: 'Terminal node',
    fillColor: '#475569',
    ringColor: '#334155',
    markColor: '#e2e8f0'
  }
} as const;

export const CARRIER_FAMILY_KEY = {
  quiet: {
    label: 'Quiet move ribbon',
    structureColor: '#334155',
    haloColor: '#cbd5e1',
    tacticalColor: '#94a3b8',
    contextualColor: '#e2e8f0'
  },
  capture: {
    label: 'Capture ribbon',
    structureColor: '#d97706',
    haloColor: '#fed7aa',
    tacticalColor: '#f59e0b',
    contextualColor: '#fde68a'
  },
  castle: {
    label: 'Castle ribbon',
    structureColor: '#0f766e',
    haloColor: '#99f6e4',
    tacticalColor: '#14b8a6',
    contextualColor: '#ccfbf1'
  },
  check: {
    label: 'Checking ribbon',
    structureColor: '#4338ca',
    haloColor: '#c7d2fe',
    tacticalColor: '#818cf8',
    contextualColor: '#ddd6fe'
  },
  terminal: {
    label: 'Mate ribbon',
    structureColor: '#be185d',
    haloColor: '#fbcfe8',
    tacticalColor: '#f472b6',
    contextualColor: '#fce7f3'
  }
} as const;

const DEFAULT_OCCURRENCE_RADIUS_CAP = 0.094;
const MIN_OCCURRENCE_RADIUS = 0.032;
const OCCURRENCE_RADIUS_CLEARANCE_FACTOR = 0.21;
const FOCUS_OCCURRENCE_RADIUS_CLEARANCE_FACTOR = 0.24;

export interface CarrierPresentation {
  familyLabel: string;
  structureColor: string;
  haloColor: string;
  tacticalColor: string;
  contextualColor: string;
  structureRadius: number;
  haloRadius: number;
  tacticalRadius: number;
  contextualDotRadius: number;
  emissiveIntensity: number;
}

export interface OccurrencePresentation {
  fillColor: string;
  haloColor: string;
  ringColor: string;
  phaseRingColor: string;
  centerMarkColor: string;
  radius: number;
  haloRadius: number;
}

export function scaleCoordinate(coordinate: Vector3): Vector3 {
  return [
    coordinate[0] * VIEW_SCALE,
    coordinate[1] * VIEW_SCALE,
    coordinate[2] * VIEW_SCALE
  ];
}

export function createCarrierPresentation(
  carrier: RuntimeCarrierRecord
): CarrierPresentation {
  const palette = selectCarrierPalette(carrier);
  const captureBias = carrier.moveFamily.interactionClass === 'capture' ? 0.008 : 0;
  const forcingBias =
    carrier.moveFamily.forcingClass === 'checkmate'
      ? 0.004
      : carrier.moveFamily.forcingClass === 'check'
        ? 0.002
        : 0;
  const structureRadius = roundNumber(
    0.042 + (carrier.departureStrength * 0.06) + captureBias + forcingBias
  );

  return {
    ...palette,
    structureRadius,
    haloRadius: roundNumber(structureRadius * 1.48),
    tacticalRadius: roundNumber(structureRadius * 0.3),
    contextualDotRadius: roundNumber(Math.max(0.012, structureRadius * 0.18)),
    emissiveIntensity: roundNumber(0.16 + (carrier.departureStrength * 0.26))
  };
}

export function createOccurrencePresentation(
  occurrence: RuntimeNeighborhoodOccurrence,
  accentColor: string,
  radiusCap = Number.POSITIVE_INFINITY,
  radiusScale = 1
): OccurrencePresentation {
  const palette = occurrence.terminal
    ? terminalPalette(occurrence.terminal.wdlLabel)
    : phasePalette(occurrence.annotations.phaseLabel, accentColor);
  const uncappedRadius = roundNumber(0.042 + (occurrence.salience.normalizedScore * 0.074));
  const cappedRadius = Math.min(uncappedRadius, radiusCap);
  const radius = roundNumber(
    radiusScale <= 1
      ? cappedRadius * radiusScale
      : Math.min(uncappedRadius * radiusScale, radiusCap)
  );

  return {
    fillColor: palette.fillColor,
    haloColor: occurrence.isFocus ? '#fff5d6' : '#f6efe1',
    ringColor: occurrence.isFocus ? '#b7791f' : '#d8cbb3',
    phaseRingColor: palette.ringColor,
    centerMarkColor: palette.markColor,
    radius,
    haloRadius: roundNumber(radius * (occurrence.isFocus ? 1.38 : 1.14))
  };
}

export function buildOccurrenceRadiusCaps(
  occurrences: RuntimeNeighborhoodOccurrence[]
): Map<string, number> {
  if (occurrences.length <= 1) {
    return new Map(
      occurrences.map((occurrence) => [occurrence.occurrenceId, DEFAULT_OCCURRENCE_RADIUS_CAP])
    );
  }

  const scaledCoordinates = new Map(
    occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      scaleCoordinate(occurrence.embedding.coordinate)
    ])
  );

  return new Map(
    occurrences.map((occurrence) => {
      const source = scaledCoordinates.get(occurrence.occurrenceId);

      if (!source) {
        return [occurrence.occurrenceId, DEFAULT_OCCURRENCE_RADIUS_CAP] as const;
      }

      let nearestNeighborDistance = Number.POSITIVE_INFINITY;

      for (const candidate of occurrences) {
        if (candidate.occurrenceId === occurrence.occurrenceId) {
          continue;
        }

        const target = scaledCoordinates.get(candidate.occurrenceId);
        if (!target) {
          continue;
        }

        nearestNeighborDistance = Math.min(
          nearestNeighborDistance,
          distanceBetween(source, target)
        );
      }

      if (!Number.isFinite(nearestNeighborDistance)) {
        return [occurrence.occurrenceId, DEFAULT_OCCURRENCE_RADIUS_CAP] as const;
      }

      const clearanceFactor = occurrence.isFocus
        ? FOCUS_OCCURRENCE_RADIUS_CLEARANCE_FACTOR
        : OCCURRENCE_RADIUS_CLEARANCE_FACTOR;

      return [
        occurrence.occurrenceId,
        roundNumber(
          Math.max(MIN_OCCURRENCE_RADIUS, nearestNeighborDistance * clearanceFactor)
        )
      ] as const;
    })
  );
}

export function collectContextualResidueSamples(
  carrier: RuntimeCarrierRecord
): Vector3[] {
  const interiorSamples = carrier.samples.slice(1, -1);
  if (interiorSamples.length <= 2) {
    return interiorSamples;
  }

  const stride = Math.max(2, Math.floor(interiorSamples.length / 5));

  return interiorSamples.filter((_, index) => index % stride === 0);
}

function selectCarrierPalette(carrier: RuntimeCarrierRecord) {
  if (carrier.san.includes('#')) {
    return {
      familyLabel: CARRIER_FAMILY_KEY.terminal.label,
      structureColor: CARRIER_FAMILY_KEY.terminal.structureColor,
      haloColor: CARRIER_FAMILY_KEY.terminal.haloColor,
      tacticalColor: CARRIER_FAMILY_KEY.terminal.tacticalColor,
      contextualColor: CARRIER_FAMILY_KEY.terminal.contextualColor
    };
  }

  if (carrier.moveFamily.interactionClass === 'capture') {
    return {
      familyLabel: CARRIER_FAMILY_KEY.capture.label,
      structureColor: CARRIER_FAMILY_KEY.capture.structureColor,
      haloColor: CARRIER_FAMILY_KEY.capture.haloColor,
      tacticalColor: CARRIER_FAMILY_KEY.capture.tacticalColor,
      contextualColor: CARRIER_FAMILY_KEY.capture.contextualColor
    };
  }

  if (carrier.moveFamily.interactionClass === 'castle') {
    return {
      familyLabel: CARRIER_FAMILY_KEY.castle.label,
      structureColor: CARRIER_FAMILY_KEY.castle.structureColor,
      haloColor: CARRIER_FAMILY_KEY.castle.haloColor,
      tacticalColor: CARRIER_FAMILY_KEY.castle.tacticalColor,
      contextualColor: CARRIER_FAMILY_KEY.castle.contextualColor
    };
  }

  if (carrier.moveFamily.forcingClass === 'check') {
    return {
      familyLabel: CARRIER_FAMILY_KEY.check.label,
      structureColor: CARRIER_FAMILY_KEY.check.structureColor,
      haloColor: CARRIER_FAMILY_KEY.check.haloColor,
      tacticalColor: CARRIER_FAMILY_KEY.check.tacticalColor,
      contextualColor: CARRIER_FAMILY_KEY.check.contextualColor
    };
  }

  return {
    familyLabel: CARRIER_FAMILY_KEY.quiet.label,
    structureColor: CARRIER_FAMILY_KEY.quiet.structureColor,
    haloColor: CARRIER_FAMILY_KEY.quiet.haloColor,
    tacticalColor: CARRIER_FAMILY_KEY.quiet.tacticalColor,
    contextualColor: CARRIER_FAMILY_KEY.quiet.contextualColor
  };
}

function phasePalette(phase: string, accentColor: string) {
  if (phase === 'opening') {
    return PHASE_NODE_KEY.opening;
  }
  if (phase === 'middlegame') {
    return {
      ...PHASE_NODE_KEY.middlegame,
      fillColor: accentColor || PHASE_NODE_KEY.middlegame.fillColor
    };
  }
  if (phase === 'endgame') {
    return PHASE_NODE_KEY.endgame;
  }
  return {
    ...PHASE_NODE_KEY.fallback,
    fillColor: accentColor || PHASE_NODE_KEY.fallback.fillColor
  };
}

function terminalPalette(wdlLabel: string) {
  if (wdlLabel === 'W') {
    return TERMINAL_NODE_KEY.W;
  }
  if (wdlLabel === 'D') {
    return TERMINAL_NODE_KEY.D;
  }
  if (wdlLabel === 'L') {
    return TERMINAL_NODE_KEY.L;
  }
  return TERMINAL_NODE_KEY.fallback;
}

function roundNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function distanceBetween(left: Vector3, right: Vector3) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  );
}