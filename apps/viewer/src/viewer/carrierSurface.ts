import type {
  BuilderBootstrapManifest,
  BuilderOccurrenceRecord,
  BuilderTransitionRecord,
  RuntimeCarrierBandState,
  RuntimeCarrierRecord,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeCarrierValidation,
  Vector3
} from './contracts';

const EPSILON = 1e-6;
const DEFAULT_AXIS: Vector3 = [0, 0, 1];
const FALLBACK_AXES: Vector3[] = [
  DEFAULT_AXIS,
  [0, 1, 0],
  [1, 0, 0]
];

type RuntimeCarrierSurfaceArgs = {
  builderBootstrapManifest: BuilderBootstrapManifest;
  occurrenceById: Map<string, BuilderOccurrenceRecord>;
  transitionByKey: Map<string, BuilderTransitionRecord>;
  selectedOccurrenceIds: string[];
  selectedOccurrenceIdSet: Set<string>;
  refinementBudget: number;
  maxRefinementBudget: number;
};

type StructureMagnitudes = {
  lateral: number;
  lift: number;
  combined: number;
};

type ProfileEnvelope = {
  lateral: number;
  lift: number;
  twist: number;
};

export function buildRuntimeCarrierSurface({
  builderBootstrapManifest,
  occurrenceById,
  transitionByKey,
  selectedOccurrenceIds,
  selectedOccurrenceIdSet,
  refinementBudget,
  maxRefinementBudget
}: RuntimeCarrierSurfaceArgs): RuntimeCarrierSurfaceSnapshot {
  return {
    graphObjectId: builderBootstrapManifest.graphObjectId,
    occurrenceIds: selectedOccurrenceIds,
    refinementBudget,
    carriers: builderBootstrapManifest.departureRules
      .filter(
        (rule) =>
          selectedOccurrenceIdSet.has(rule.sourceOccurrenceId) &&
          selectedOccurrenceIdSet.has(rule.targetOccurrenceId)
      )
      .map((rule) => {
        const sourceOccurrence = occurrenceById.get(rule.sourceOccurrenceId);
        const targetOccurrence = occurrenceById.get(rule.targetOccurrenceId);

        if (!sourceOccurrence || !targetOccurrence) {
          return null;
        }

        const transition = transitionByKey.get(
          transitionKey(rule.sourceOccurrenceId, rule.targetOccurrenceId)
        );

        return buildCarrierRecord({
          rule,
          san: transition?.moveFacts.san ?? rule.moveUci,
          sourceOccurrence,
          targetOccurrence,
          refinementBudget,
          maxRefinementBudget
        });
      })
      .filter((carrier): carrier is RuntimeCarrierRecord => carrier !== null)
  };
}

function buildCarrierRecord({
  rule,
  san,
  sourceOccurrence,
  targetOccurrence,
  refinementBudget,
  maxRefinementBudget
}: {
  rule: BuilderBootstrapManifest['departureRules'][number];
  san: string;
  sourceOccurrence: BuilderOccurrenceRecord;
  targetOccurrence: BuilderOccurrenceRecord;
  refinementBudget: number;
  maxRefinementBudget: number;
}): RuntimeCarrierRecord {
  const source = sourceOccurrence.embedding.coordinate;
  const target = targetOccurrence.embedding.coordinate;
  const chord = subtract(target, source);
  const chordLength = magnitude(chord);
  const tangent = normalize(chord, [1, 0, 0]);
  const surfaceNormalHint = normalize(
    add(normalize(source, DEFAULT_AXIS), normalize(target, DEFAULT_AXIS)),
    DEFAULT_AXIS
  );
  const lateralAxis = perpendicularAxis(surfaceNormalHint, tangent);
  const liftAxis = normalize(cross(tangent, lateralAxis), DEFAULT_AXIS);
  const sampleCount = Math.max(6, 4 + refinementBudget * 2);
  const spanScale = Math.max(
    chordLength,
    ((sourceOccurrence.embedding.ballRadius + targetOccurrence.embedding.ballRadius) *
      0.85),
    0.12
  );
  const structureMagnitudes = computeStructureMagnitudes(rule, spanScale);
  const bandStates = computeBandStates(
    rule,
    structureMagnitudes,
    spanScale,
    refinementBudget,
    maxRefinementBudget
  );
  const samples = Array.from({ length: sampleCount }, (_, index) => {
    if (index === 0) {
      return source;
    }

    if (index === sampleCount - 1) {
      return target;
    }

    const progress = index / (sampleCount - 1);
    return sampleCarrierPoint({
      source,
      target,
      tangent,
      lateralAxis,
      liftAxis,
      progress,
      rule,
      structureMagnitudes,
      bandStates
    });
  });

  return {
    ...rule,
    san,
    activeBands: bandStates
      .filter((bandState) => bandState.active)
      .map((bandState) => bandState.bandId),
    bandStates,
    samples,
    validation: validateCarrier(samples, source, target, tangent, chordLength, bandStates)
  };
}

function computeStructureMagnitudes(
  rule: BuilderBootstrapManifest['departureRules'][number],
  spanScale: number
): StructureMagnitudes {
  const lateral = Math.min(
    spanScale * rule.lateralOffset * (0.9 + rule.curvature),
    spanScale * 0.6
  );
  const lift = Math.min(
    spanScale * rule.verticalLift * (0.75 + rule.departureStrength),
    spanScale * 0.45
  );

  return {
    lateral,
    lift,
    combined: Math.hypot(lateral, lift)
  };
}

function computeBandStates(
  rule: BuilderBootstrapManifest['departureRules'][number],
  structureMagnitudes: StructureMagnitudes,
  spanScale: number,
  refinementBudget: number,
  maxRefinementBudget: number
): RuntimeCarrierBandState[] {
  const tacticalRevealBudget = Math.max(4, Math.ceil(maxRefinementBudget * 0.5));
  const contextualRevealBudget = Math.max(
    tacticalRevealBudget + 1,
    Math.ceil(maxRefinementBudget * 0.75)
  );
  const tacticalAmplitude = Math.min(
    structureMagnitudes.combined * 0.34,
    spanScale * (0.018 + rule.curvature * 0.09 + rule.twist * 0.04)
  );
  const contextualAmplitude = Math.min(
    structureMagnitudes.combined * 0.18,
    spanScale * (0.01 + rule.twist * 0.04 + rule.verticalLift * 0.03)
  );

  return [
    {
      bandId: 'structure',
      revealBudget: 1,
      amplitude: roundNumber(structureMagnitudes.combined),
      active: true
    },
    {
      bandId: 'tactical',
      revealBudget: tacticalRevealBudget,
      amplitude: roundNumber(tacticalAmplitude),
      active: refinementBudget >= tacticalRevealBudget
    },
    {
      bandId: 'contextual',
      revealBudget: contextualRevealBudget,
      amplitude: roundNumber(contextualAmplitude),
      active: refinementBudget >= contextualRevealBudget
    }
  ];
}

function sampleCarrierPoint({
  source,
  target,
  tangent,
  lateralAxis,
  liftAxis,
  progress,
  rule,
  structureMagnitudes,
  bandStates
}: {
  source: Vector3;
  target: Vector3;
  tangent: Vector3;
  lateralAxis: Vector3;
  liftAxis: Vector3;
  progress: number;
  rule: BuilderBootstrapManifest['departureRules'][number];
  structureMagnitudes: StructureMagnitudes;
  bandStates: RuntimeCarrierBandState[];
}): Vector3 {
  const basePoint = lerp(source, target, progress);
  const profileEnvelope = centerlineProfileEnvelope(rule.centerlineProfile, progress);
  const twistAngle = rule.twist * Math.PI * profileEnvelope.twist;
  const twistedLateralAxis = normalize(
    add(
      scale(lateralAxis, Math.cos(twistAngle)),
      scale(liftAxis, Math.sin(twistAngle))
    ),
    lateralAxis
  );
  const twistedLiftAxis = normalize(
    add(
      scale(liftAxis, Math.cos(twistAngle)),
      scale(lateralAxis, -Math.sin(twistAngle))
    ),
    liftAxis
  );
  let offset = add(
    scale(twistedLateralAxis, structureMagnitudes.lateral * profileEnvelope.lateral),
    scale(twistedLiftAxis, structureMagnitudes.lift * profileEnvelope.lift)
  );

  const tacticalBand = bandStates.find((bandState) => bandState.bandId === 'tactical');
  if (tacticalBand?.active) {
    const tacticalEnvelope = Math.sin(Math.PI * progress) ** 1.5;
    const tacticalPhase = (2 * Math.PI * progress) + (rule.curvature * Math.PI);

    offset = add(
      offset,
      add(
        scale(
          twistedLiftAxis,
          tacticalBand.amplitude * Math.sin(tacticalPhase) * tacticalEnvelope
        ),
        scale(
          twistedLateralAxis,
          tacticalBand.amplitude * 0.35 * Math.cos(tacticalPhase) * tacticalEnvelope
        )
      )
    );
  }

  const contextualBand = bandStates.find(
    (bandState) => bandState.bandId === 'contextual'
  );
  if (contextualBand?.active) {
    const contextualEnvelope = Math.sin(Math.PI * progress) ** 2;
    const contextualPhase =
      (4 * Math.PI * progress) + (rule.twist * Math.PI * 1.5) + (rule.curvature * 0.5);

    offset = add(
      offset,
      add(
        scale(
          twistedLateralAxis,
          contextualBand.amplitude * Math.sin(contextualPhase) * contextualEnvelope
        ),
        scale(
          twistedLiftAxis,
          contextualBand.amplitude * 0.4 * Math.cos(contextualPhase) * contextualEnvelope
        )
      )
    );
  }

  return roundVector(add(basePoint, projectPerpendicular(offset, tangent)));
}

function centerlineProfileEnvelope(
  centerlineProfile: string,
  progress: number
): ProfileEnvelope {
  const bell = Math.sin(Math.PI * progress);
  const arch = bell ** 2;
  const risingBell = bell * (0.45 + (0.55 * progress));
  const leadingBell = bell * (1 - (0.35 * progress));

  switch (centerlineProfile) {
    case 'capture-break':
      return {
        lateral: 0.88 * bell,
        lift: 0.56 * arch,
        twist: 0.74 * bell
      };
    case 'castle-sweep':
      return {
        lateral: 0.76 * bell,
        lift: 0.22 * bell,
        twist: 0.92 * bell
      };
    case 'promotion-rise':
      return {
        lateral: 0.32 * bell,
        lift: 0.86 * risingBell,
        twist: 0.58 * bell
      };
    case 'forcing-rise':
      return {
        lateral: 0.34 * bell,
        lift: 0.72 * risingBell,
        twist: 0.68 * bell
      };
    case 'terminal-snap':
      return {
        lateral: 0.18 * leadingBell,
        lift: 0.84 * leadingBell,
        twist: 0.88 * bell
      };
    case 'quiet-glide':
    default:
      return {
        lateral: 0.42 * bell,
        lift: 0.34 * arch,
        twist: 0.48 * bell
      };
  }
}

function validateCarrier(
  samples: Vector3[],
  source: Vector3,
  target: Vector3,
  tangent: Vector3,
  chordLength: number,
  bandStates: RuntimeCarrierBandState[]
): RuntimeCarrierValidation {
  let projectedProgressMonotone = true;
  let nonDegenerateSegments = true;
  let previousProjection = 0;

  for (let index = 1; index < samples.length; index += 1) {
    const segment = subtract(samples[index]!, samples[index - 1]!);
    const segmentLength = magnitude(segment);
    if (segmentLength <= EPSILON) {
      nonDegenerateSegments = false;
    }

    const projection = dot(subtract(samples[index]!, source), tangent);
    if (projection + EPSILON < previousProjection) {
      projectedProgressMonotone = false;
    }
    previousProjection = projection;
  }

  const structureAmplitude =
    bandStates.find((bandState) => bandState.bandId === 'structure')?.amplitude ?? 0;
  const tacticalAmplitude =
    bandStates.find((bandState) => bandState.bandId === 'tactical')?.amplitude ?? 0;
  const contextualAmplitude =
    bandStates.find((bandState) => bandState.bandId === 'contextual')?.amplitude ?? 0;

  return {
    endpointLocked:
      vectorsClose(samples[0] ?? source, source) &&
      vectorsClose(samples.at(-1) ?? target, target),
    finiteCoordinates: samples.every(isFiniteVector),
    projectedProgressMonotone:
      projectedProgressMonotone &&
      Math.abs(previousProjection - chordLength) <= Math.max(EPSILON, chordLength * 0.01),
    nonDegenerateSegments,
    coarseDominant:
      structureAmplitude > 0 &&
      tacticalAmplitude <= structureAmplitude * 0.5 &&
      contextualAmplitude <= structureAmplitude * 0.3
  };
}

function projectPerpendicular(vector: Vector3, tangent: Vector3): Vector3 {
  return subtract(vector, scale(tangent, dot(vector, tangent)));
}

function perpendicularAxis(surfaceNormalHint: Vector3, tangent: Vector3): Vector3 {
  for (const candidateAxis of [surfaceNormalHint, ...FALLBACK_AXES]) {
    const perpendicular = cross(candidateAxis, tangent);
    if (magnitude(perpendicular) > EPSILON) {
      return normalize(perpendicular, [1, 0, 0]);
    }
  }

  return [1, 0, 0];
}

function transitionKey(sourceOccurrenceId: string, targetOccurrenceId: string) {
  return `${sourceOccurrenceId}|${targetOccurrenceId}`;
}

function lerp(left: Vector3, right: Vector3, progress: number): Vector3 {
  return [
    left[0] + ((right[0] - left[0]) * progress),
    left[1] + ((right[1] - left[1]) * progress),
    left[2] + ((right[2] - left[2]) * progress)
  ];
}

function add(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(vector: Vector3, scalar: number): Vector3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dot(left: Vector3, right: Vector3): number {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function cross(left: Vector3, right: Vector3): Vector3 {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0])
  ];
}

function magnitude(vector: Vector3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector: Vector3, fallback: Vector3): Vector3 {
  const vectorMagnitude = magnitude(vector);
  if (vectorMagnitude <= EPSILON) {
    return fallback;
  }

  return scale(vector, 1 / vectorMagnitude);
}

function vectorsClose(left: Vector3, right: Vector3): boolean {
  return magnitude(subtract(left, right)) <= 1e-5;
}

function isFiniteVector(vector: Vector3): boolean {
  return vector.every((coordinate) => Number.isFinite(coordinate));
}

function roundVector(vector: Vector3): Vector3 {
  return [
    roundNumber(vector[0]),
    roundNumber(vector[1]),
    roundNumber(vector[2])
  ];
}

function roundNumber(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}