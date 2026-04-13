import type {
  BuilderBootstrapManifest,
  BuilderOccurrenceRecord,
  RuntimeNeighborhoodSnapshot,
  RuntimeTranspositionEmphasis,
  RuntimeTranspositionGroup,
  RuntimeTranspositionLink,
  RuntimeTranspositionOccurrence,
  RuntimeTranspositionSurfaceSnapshot,
  Vector3
} from './contracts.ts';

type TranspositionViewScope = 'local-neighborhood' | 'whole-object';

export function buildRuntimeTranspositionSurface(
  builderBootstrapManifest: BuilderBootstrapManifest,
  runtimeSnapshot: RuntimeNeighborhoodSnapshot,
  viewScope: TranspositionViewScope
): RuntimeTranspositionSurfaceSnapshot {
  const visibleOccurrenceIdSet = new Set(
    runtimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const occurrenceById = new Map(
    builderBootstrapManifest.occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence
    ])
  );
  const focusOccurrenceId = runtimeSnapshot.focusOccurrenceId;
  const groups = builderBootstrapManifest.repeatedStateRelations
    .map((relation) => {
      const visibleOccurrenceIds = relation.occurrenceIds.filter((occurrenceId) =>
        visibleOccurrenceIdSet.has(occurrenceId)
      );
      const focusRelation = relation.occurrenceIds.includes(focusOccurrenceId);
      const includedOccurrenceIds = selectIncludedOccurrenceIds({
        focusOccurrenceId,
        focusRelation,
        relationOccurrenceIds: relation.occurrenceIds,
        viewScope,
        visibleOccurrenceIds
      });
      const occurrences = includedOccurrenceIds
        .map((occurrenceId) => occurrenceById.get(occurrenceId))
        .filter(
          (occurrence): occurrence is BuilderOccurrenceRecord => occurrence !== undefined
        )
        .map((occurrence) =>
          buildTranspositionOccurrence(
            occurrence,
            focusOccurrenceId,
            visibleOccurrenceIdSet
          )
        );

      if (occurrences.length < 2) {
        return null;
      }

      const emphasis: RuntimeTranspositionEmphasis = focusRelation ? 'focus' : 'context';
      const linkPairs =
        viewScope === 'local-neighborhood' && focusRelation
          ? buildFocusStarPairs(occurrences, focusOccurrenceId)
          : buildMinimumSpanningPairs(occurrences, focusOccurrenceId);

      if (linkPairs.length === 0) {
        return null;
      }

      return {
        stateKey: relation.stateKey,
        emphasis,
        visibleOccurrenceIds,
        offViewOccurrenceIds: occurrences
          .filter((occurrence) => !occurrence.isVisibleInNeighborhood)
          .map((occurrence) => occurrence.occurrenceId),
        occurrences,
        links: linkPairs.map(([sourceOccurrenceId, targetOccurrenceId]) => {
          const sourceOccurrence = occurrences.find(
            (occurrence) => occurrence.occurrenceId === sourceOccurrenceId
          );
          const targetOccurrence = occurrences.find(
            (occurrence) => occurrence.occurrenceId === targetOccurrenceId
          );

          if (!sourceOccurrence || !targetOccurrence) {
            throw new Error(
              `transposition link references unknown occurrences for state ${relation.stateKey}`
            );
          }

          return buildTranspositionLink(
            relation.stateKey,
            sourceOccurrence,
            targetOccurrence,
            emphasis
          );
        })
      } satisfies RuntimeTranspositionGroup;
    })
    .filter((group): group is RuntimeTranspositionGroup => group !== null)
    .sort((left, right) => {
      if (left.emphasis !== right.emphasis) {
        return left.emphasis === 'focus' ? -1 : 1;
      }

      if (left.occurrences.length !== right.occurrences.length) {
        return right.occurrences.length - left.occurrences.length;
      }

      return left.stateKey.localeCompare(right.stateKey);
    });

  return {
    graphObjectId: builderBootstrapManifest.graphObjectId,
    groups,
    links: groups.flatMap((group) => group.links)
  } satisfies RuntimeTranspositionSurfaceSnapshot;
}

function selectIncludedOccurrenceIds({
  focusOccurrenceId,
  focusRelation,
  relationOccurrenceIds,
  viewScope,
  visibleOccurrenceIds
}: {
  focusOccurrenceId: string;
  focusRelation: boolean;
  relationOccurrenceIds: string[];
  viewScope: TranspositionViewScope;
  visibleOccurrenceIds: string[];
}) {
  if (viewScope === 'whole-object') {
    return visibleOccurrenceIds;
  }

  if (focusRelation) {
    return orderOccurrenceIds(relationOccurrenceIds, focusOccurrenceId);
  }

  if (visibleOccurrenceIds.length > 1) {
    return orderOccurrenceIds(visibleOccurrenceIds, focusOccurrenceId);
  }

  return [];
}

function orderOccurrenceIds(occurrenceIds: string[], focusOccurrenceId: string) {
  return [...new Set(occurrenceIds)].sort((left, right) => {
    if (left === focusOccurrenceId) {
      return -1;
    }
    if (right === focusOccurrenceId) {
      return 1;
    }

    return left.localeCompare(right);
  });
}

function buildTranspositionOccurrence(
  occurrence: BuilderOccurrenceRecord,
  focusOccurrenceId: string,
  visibleOccurrenceIdSet: Set<string>
) {
  return {
    occurrenceId: occurrence.occurrenceId,
    coordinate: occurrence.embedding.coordinate,
    rootGameId: occurrence.embedding.rootGameId,
    ply: occurrence.ply,
    phaseLabel: occurrence.annotations.phaseLabel,
    isFocus: occurrence.occurrenceId === focusOccurrenceId,
    isVisibleInNeighborhood: visibleOccurrenceIdSet.has(occurrence.occurrenceId)
  } satisfies RuntimeTranspositionOccurrence;
}

function buildFocusStarPairs(
  occurrences: RuntimeTranspositionOccurrence[],
  focusOccurrenceId: string
) {
  const focusOccurrence = occurrences.find(
    (occurrence) => occurrence.occurrenceId === focusOccurrenceId
  );

  if (!focusOccurrence) {
    return buildMinimumSpanningPairs(occurrences, focusOccurrenceId);
  }

  return occurrences
    .filter((occurrence) => occurrence.occurrenceId !== focusOccurrenceId)
    .map((occurrence) => [focusOccurrence.occurrenceId, occurrence.occurrenceId] as const);
}

function buildMinimumSpanningPairs(
  occurrences: RuntimeTranspositionOccurrence[],
  focusOccurrenceId: string
) {
  if (occurrences.length < 2) {
    return [];
  }

  const occurrenceById = new Map(
    occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence])
  );
  const startOccurrenceId = occurrences.find((occurrence) => occurrence.isFocus)?.occurrenceId
    ?? orderOccurrenceIds(
      occurrences.map((occurrence) => occurrence.occurrenceId),
      focusOccurrenceId
    )[0];

  if (!startOccurrenceId) {
    return [];
  }

  const visited = new Set<string>([startOccurrenceId]);
  const pairs: Array<readonly [string, string]> = [];

  while (visited.size < occurrences.length) {
    let bestPair: {
      left: string;
      right: string;
      distance: number;
      key: string;
    } | null = null;

    for (const leftOccurrenceId of visited) {
      const leftOccurrence = occurrenceById.get(leftOccurrenceId);
      if (!leftOccurrence) {
        continue;
      }

      for (const rightOccurrence of occurrences) {
        if (visited.has(rightOccurrence.occurrenceId)) {
          continue;
        }

        const candidateDistance = distanceBetween(
          leftOccurrence.coordinate,
          rightOccurrence.coordinate
        );
        const candidateKey = `${leftOccurrenceId}|${rightOccurrence.occurrenceId}`;

        if (
          !bestPair
          || candidateDistance < bestPair.distance
          || (candidateDistance === bestPair.distance
            && candidateKey.localeCompare(bestPair.key) < 0)
        ) {
          bestPair = {
            left: leftOccurrenceId,
            right: rightOccurrence.occurrenceId,
            distance: candidateDistance,
            key: candidateKey
          };
        }
      }
    }

    if (!bestPair) {
      break;
    }

    visited.add(bestPair.right);
    pairs.push([bestPair.left, bestPair.right]);
  }

  return pairs;
}

function buildTranspositionLink(
  stateKey: string,
  sourceOccurrence: RuntimeTranspositionOccurrence,
  targetOccurrence: RuntimeTranspositionOccurrence,
  emphasis: RuntimeTranspositionEmphasis
) {
  return {
    stateKey,
    sourceOccurrenceId: sourceOccurrence.occurrenceId,
    targetOccurrenceId: targetOccurrence.occurrenceId,
    sourceVisibleInNeighborhood: sourceOccurrence.isVisibleInNeighborhood,
    targetVisibleInNeighborhood: targetOccurrence.isVisibleInNeighborhood,
    emphasis,
    samples: buildTranspositionSamples(
      sourceOccurrence.coordinate,
      targetOccurrence.coordinate,
      stateKey,
      sourceOccurrence.occurrenceId,
      targetOccurrence.occurrenceId,
      emphasis,
      sourceOccurrence.isVisibleInNeighborhood,
      targetOccurrence.isVisibleInNeighborhood
    )
  } satisfies RuntimeTranspositionLink;
}

function buildTranspositionSamples(
  source: Vector3,
  target: Vector3,
  stateKey: string,
  sourceOccurrenceId: string,
  targetOccurrenceId: string,
  emphasis: RuntimeTranspositionEmphasis,
  sourceVisibleInNeighborhood: boolean,
  targetVisibleInNeighborhood: boolean
) {
  const delta = subtractVectors(target, source);
  const segmentLength = vectorLength(delta);
  const raisedOffset =
    emphasis === 'focus'
      ? 0.09 + (segmentLength * 0.22)
      : 0.05 + (segmentLength * 0.12);
  const visibilityOffset =
    sourceVisibleInNeighborhood && targetVisibleInNeighborhood ? 0 : 0.08;
  const archHeight = clampNumber(raisedOffset + visibilityOffset, 0.08, 0.34);
  const direction = normalizeVector(delta);
  const fallbackAxis: Vector3 = [1, 0, 0];
  const worldUp: Vector3 = [0, 1, 0];
  const lateralDirection = normalizeVector(
    crossProduct(direction, worldUp) || crossProduct(direction, fallbackAxis)
  );
  const swayMagnitude = clampNumber(0.025 + (segmentLength * 0.08), 0.025, 0.11);
  const swaySign = hashString(
    `${stateKey}|${sourceOccurrenceId}|${targetOccurrenceId}`
  ) % 2 === 0
    ? 1
    : -1;
  const swayOffset = scaleVector(lateralDirection, swayMagnitude * swaySign);
  const controlLift = [0, archHeight, 0] satisfies Vector3;
  const controlPointOne = addVectors(
    addVectors(source, scaleVector(delta, 0.28)),
    addVectors(controlLift, swayOffset)
  );
  const controlPointTwo = addVectors(
    addVectors(source, scaleVector(delta, 0.72)),
    addVectors(controlLift, swayOffset)
  );

  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) =>
    sampleCubicBezier(source, controlPointOne, controlPointTwo, target, t)
  );
}

function sampleCubicBezier(
  start: Vector3,
  controlOne: Vector3,
  controlTwo: Vector3,
  end: Vector3,
  t: number
): Vector3 {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;

  return [0, 1, 2].map((axis) => {
    const startValue = start[axis] * uu * u;
    const controlOneValue = 3 * controlOne[axis] * uu * t;
    const controlTwoValue = 3 * controlTwo[axis] * u * tt;
    const endValue = end[axis] * tt * t;

    return startValue + controlOneValue + controlTwoValue + endValue;
  }) as Vector3;
}

function subtractVectors(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function addVectors(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVector(vector: Vector3, scalar: number): Vector3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function vectorLength(vector: Vector3) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalizeVector(vector: Vector3): Vector3 {
  const length = vectorLength(vector);
  if (length === 0) {
    return [0, 0, 1];
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function crossProduct(left: Vector3, right: Vector3): Vector3 {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0])
  ];
}

function distanceBetween(left: Vector3, right: Vector3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = ((hash << 5) - hash) + character.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}