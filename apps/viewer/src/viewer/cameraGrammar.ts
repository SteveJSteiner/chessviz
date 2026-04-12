import type {
  RuntimeExplorationConfig,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  Vector3
} from './contracts.ts';
import {
  LIVE_VIEW_DISTANCE,
  clampLiveViewDistance,
  resolveLabelZoomBand,
  type LabelZoomBand
} from './labelPolicy.ts';

export interface CameraGrammarState {
  band: LabelZoomBand;
  cameraDistance: number;
  refinementBudget: number;
  stageLabel: string;
  stageDescription: string;
  lookAt: Vector3;
  focusCoordinate: Vector3;
  contextCentroid: Vector3;
  laterCentroid: Vector3;
  weights: {
    focus: number;
    context: number;
    later: number;
  };
}

export const CAMERA_GRAMMAR_REVIEW_DISTANCES = {
  structure: clampLiveViewDistance(LIVE_VIEW_DISTANCE.structureThreshold + 0.3),
  tactical: clampLiveViewDistance(LIVE_VIEW_DISTANCE.tacticalThreshold + 0.3),
  contextual: clampLiveViewDistance(LIVE_VIEW_DISTANCE.min + 0.2)
} as const;

export function resolveCameraGrammarBudgetTargets(maxRefinementBudget: number) {
  const clampedMaximum = Math.max(1, Math.floor(maxRefinementBudget));
  const structure = clampNumber(Math.ceil(clampedMaximum * 0.25), 1, clampedMaximum);
  const tactical = clampNumber(
    Math.ceil(clampedMaximum * 0.5),
    Math.min(clampedMaximum, structure + 1),
    clampedMaximum
  );

  return {
    structure,
    tactical,
    contextual: clampedMaximum
  } as const;
}

export function resolveCameraGrammarRefinementBudget(
  cameraDistance: number,
  runtimeConfig: Pick<RuntimeExplorationConfig, 'maxRefinementBudget'>
) {
  const band = resolveLabelZoomBand(cameraDistance);
  const budgetTargets = resolveCameraGrammarBudgetTargets(
    runtimeConfig.maxRefinementBudget
  );

  if (band === 'structure') {
    return budgetTargets.structure;
  }

  if (band === 'tactical') {
    return budgetTargets.tactical;
  }

  return budgetTargets.contextual;
}

export function createCameraGrammarState({
  cameraDistance,
  runtimeConfig,
  runtimeSnapshot
}: {
  cameraDistance: number;
  runtimeConfig: Pick<RuntimeExplorationConfig, 'maxRefinementBudget'>;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
}): CameraGrammarState {
  const clampedDistance = clampLiveViewDistance(cameraDistance);
  const band = resolveLabelZoomBand(clampedDistance);
  const focusOccurrence =
    runtimeSnapshot.occurrences.find((occurrence) => occurrence.isFocus) ??
    runtimeSnapshot.occurrences[0];
  const focusCoordinate: Vector3 = focusOccurrence?.embedding.coordinate ?? [0, 0, 0];
  const contextCentroid = computeContextCentroid(
    runtimeSnapshot.occurrences,
    focusOccurrence?.occurrenceId,
    focusCoordinate
  );
  const laterCentroid = computeLaterCentroid(
    runtimeSnapshot.occurrences,
    focusOccurrence,
    contextCentroid
  );
  const weights = resolveCameraGrammarWeights(band);
  const stage = describeCameraGrammarBand(band);

  return {
    band,
    cameraDistance: clampedDistance,
    refinementBudget: resolveCameraGrammarRefinementBudget(
      clampedDistance,
      runtimeConfig
    ),
    stageLabel: stage.label,
    stageDescription: stage.description,
    lookAt: blendCoordinates(
      [focusCoordinate, contextCentroid, laterCentroid],
      [weights.focus, weights.context, weights.later]
    ),
    focusCoordinate,
    contextCentroid,
    laterCentroid,
    weights
  };
}

export function describeCameraGrammarBand(band: LabelZoomBand) {
  if (band === 'structure') {
    return {
      label: 'Context-Preserving Structure View',
      description:
        'The camera keeps more distal branch mass in frame while the runtime holds to the coarse structure band.'
    } as const;
  }

  if (band === 'tactical') {
    return {
      label: 'Approach View',
      description:
        'Moving closer tightens the anchor on the focus position and turns on tactical ribbon detail without changing the coarse read.'
    } as const;
  }

  return {
    label: 'Local Detail View',
    description:
      'The camera stays on the same object while contextual residue and denser labels join the focused neighborhood.'
  } as const;
}

function computeContextCentroid(
  occurrences: RuntimeNeighborhoodOccurrence[],
  focusOccurrenceId: string | undefined,
  fallback: Vector3
): Vector3 {
  const contextOccurrences = occurrences.filter(
    (occurrence) => occurrence.occurrenceId !== focusOccurrenceId
  );

  if (contextOccurrences.length === 0) {
    return fallback;
  }

  return computeWeightedCentroid(
    contextOccurrences,
    (occurrence) =>
      ((1 / (occurrence.distance + 1)) * 1.2) +
      (occurrence.salience.normalizedScore * 1.8) +
      (occurrence.terminal ? 0.35 : 0) +
      (occurrence.ply === 0 ? 0.18 : 0),
    fallback
  );
}

function computeLaterCentroid(
  occurrences: RuntimeNeighborhoodOccurrence[],
  focusOccurrence: RuntimeNeighborhoodOccurrence | undefined,
  fallback: Vector3
): Vector3 {
  if (!focusOccurrence) {
    return fallback;
  }

  const laterOccurrences = occurrences.filter(
    (occurrence) =>
      occurrence.occurrenceId !== focusOccurrence.occurrenceId &&
      (occurrence.ply > focusOccurrence.ply || occurrence.terminal !== null)
  );

  if (laterOccurrences.length === 0) {
    return fallback;
  }

  return computeWeightedCentroid(
    laterOccurrences,
    (occurrence) =>
      ((1 / (occurrence.distance + 1)) * 1.4) +
      (occurrence.salience.normalizedScore * 1.6) +
      (occurrence.terminal ? 0.8 : 0) +
      (occurrence.ply > focusOccurrence.ply ? 0.32 : 0),
    fallback
  );
}

function computeWeightedCentroid(
  occurrences: RuntimeNeighborhoodOccurrence[],
  resolveWeight: (occurrence: RuntimeNeighborhoodOccurrence) => number,
  fallback: Vector3
): Vector3 {
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightedZ = 0;

  for (const occurrence of occurrences) {
    const weight = Math.max(resolveWeight(occurrence), 0.0001);
    totalWeight += weight;
    weightedX += occurrence.embedding.coordinate[0] * weight;
    weightedY += occurrence.embedding.coordinate[1] * weight;
    weightedZ += occurrence.embedding.coordinate[2] * weight;
  }

  if (totalWeight <= 1e-6) {
    return fallback;
  }

  return [weightedX / totalWeight, weightedY / totalWeight, weightedZ / totalWeight];
}

function resolveCameraGrammarWeights(band: LabelZoomBand) {
  if (band === 'structure') {
    return {
      focus: 0.56,
      context: 0.32,
      later: 0.12
    } as const;
  }

  if (band === 'tactical') {
    return {
      focus: 0.67,
      context: 0.15,
      later: 0.18
    } as const;
  }

  return {
    focus: 0.77,
    context: 0.07,
    later: 0.16
  } as const;
}

function blendCoordinates(
  coordinates: [Vector3, Vector3, Vector3],
  weights: [number, number, number]
): Vector3 {
  const [focus, context, later] = coordinates;
  const [focusWeight, contextWeight, laterWeight] = weights;

  return [
    (focus[0] * focusWeight) + (context[0] * contextWeight) + (later[0] * laterWeight),
    (focus[1] * focusWeight) + (context[1] * contextWeight) + (later[1] * laterWeight),
    (focus[2] * focusWeight) + (context[2] * contextWeight) + (later[2] * laterWeight)
  ];
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}