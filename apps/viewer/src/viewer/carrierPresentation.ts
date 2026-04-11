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
  const captureBias = carrier.moveFamily.interactionClass === 'capture' ? 0.018 : 0;
  const forcingBias =
    carrier.moveFamily.forcingClass === 'checkmate'
      ? 0.012
      : carrier.moveFamily.forcingClass === 'check'
        ? 0.006
        : 0;
  const structureRadius = roundNumber(
    0.042 + (carrier.departureStrength * 0.06) + captureBias + forcingBias
  );

  return {
    ...palette,
    structureRadius,
    haloRadius: roundNumber(structureRadius * 1.72),
    tacticalRadius: roundNumber(structureRadius * 0.42),
    contextualDotRadius: roundNumber(Math.max(0.016, structureRadius * 0.22)),
    emissiveIntensity: roundNumber(0.16 + (carrier.departureStrength * 0.26))
  };
}

export function createOccurrencePresentation(
  occurrence: RuntimeNeighborhoodOccurrence,
  accentColor: string
): OccurrencePresentation {
  const fillColor = occurrence.terminal
    ? terminalColor(occurrence.terminal.wdlLabel)
    : phaseColor(occurrence.phase, accentColor);
  const radius = roundNumber(0.07 + (occurrence.salience.normalizedScore * 0.12));

  return {
    fillColor,
    haloColor: occurrence.isFocus ? '#fff5d6' : '#f6efe1',
    ringColor: occurrence.isFocus ? '#b7791f' : '#d8cbb3',
    radius,
    haloRadius: roundNumber(radius * (occurrence.isFocus ? 1.65 : 1.32))
  };
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