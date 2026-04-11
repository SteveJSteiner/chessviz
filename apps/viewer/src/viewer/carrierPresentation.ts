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
  const fillColor = occurrence.terminal
    ? terminalColor(occurrence.terminal.wdlLabel)
    : phaseColor(occurrence.phase, accentColor);
  const uncappedRadius = roundNumber(0.042 + (occurrence.salience.normalizedScore * 0.074));
  const cappedRadius = Math.min(uncappedRadius, radiusCap);
  const radius = roundNumber(
    radiusScale <= 1
      ? cappedRadius * radiusScale
      : Math.min(uncappedRadius * radiusScale, radiusCap)
  );

  return {
    fillColor,
    haloColor: occurrence.isFocus ? '#fff5d6' : '#f6efe1',
    ringColor: occurrence.isFocus ? '#b7791f' : '#d8cbb3',
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
      familyLabel: 'Terminal',
      structureColor: '#a61e4d',
      haloColor: '#f8d6df',
      tacticalColor: '#ff90af',
      contextualColor: '#ffd9e6'
    };
  }

  if (carrier.moveFamily.interactionClass === 'capture') {
    return {
      familyLabel: 'Capture',
      structureColor: '#b85c1b',
      haloColor: '#f2d2ae',
      tacticalColor: '#f4a340',
      contextualColor: '#ffe0aa'
    };
  }

  if (carrier.moveFamily.interactionClass === 'castle') {
    return {
      familyLabel: 'Castle',
      structureColor: '#0f766e',
      haloColor: '#cdeae6',
      tacticalColor: '#41c8bb',
      contextualColor: '#baf3eb'
    };
  }

  if (carrier.moveFamily.forcingClass === 'check') {
    return {
      familyLabel: 'Checking Quiet',
      structureColor: '#4f46e5',
      haloColor: '#dcdbff',
      tacticalColor: '#8b7dff',
      contextualColor: '#ddd9ff'
    };
  }

  return {
    familyLabel: 'Quiet',
    structureColor: '#566574',
    haloColor: '#d9e2ea',
    tacticalColor: '#87a9c8',
    contextualColor: '#dcecff'
  };
}

function phaseColor(phase: string, accentColor: string) {
  if (phase === 'opening') {
    return '#2563eb';
  }
  if (phase === 'middlegame') {
    return accentColor;
  }
  if (phase === 'endgame') {
    return '#7c3aed';
  }
  return accentColor;
}

function terminalColor(wdlLabel: string) {
  if (wdlLabel === 'W') {
    return '#15803d';
  }
  if (wdlLabel === 'D') {
    return '#c2410c';
  }
  if (wdlLabel === 'L') {
    return '#b91c1c';
  }
  return '#475569';
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