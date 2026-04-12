import type {
  BuilderBootstrapManifest,
  NavigationEntryPoint,
  NavigationEntryPointId,
  ViewerSceneManifest
} from './contracts';
import {
  CAMERA_ORBIT_LIMITS,
  deriveCameraOrbitState
} from './cameraOrbit.ts';
import { formatGameName } from './chessContext.ts';
import { LIVE_VIEW_DISTANCE, clampLiveViewDistance } from './labelPolicy.ts';

export function createAnchoredNavigationEntryPoints(
  builderBootstrapManifest: BuilderBootstrapManifest,
  viewerSceneManifest: ViewerSceneManifest
): NavigationEntryPoint[] {
  const occurrenceById = new Map(
    builderBootstrapManifest.occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence
    ])
  );
  const initialFocusOccurrence = occurrenceById.get(
    viewerSceneManifest.runtime.initialFocusOccurrenceId
  );
  const preferredOpeningOccurrenceId =
    viewerSceneManifest.runtime.focusCandidateOccurrenceIds
      .map((occurrenceId) => occurrenceById.get(occurrenceId))
      .find(
        (occurrence) => occurrence?.phase === 'opening' && occurrence.ply === 0
      )?.occurrenceId;
  const baseOrbit = deriveCameraOrbitState(viewerSceneManifest.camera.position);
  const openingAnchor = selectOpeningAnchor(
    builderBootstrapManifest,
    preferredOpeningOccurrenceId
  );
  const middlegameAnchor = selectMiddlegameAnchor(
    builderBootstrapManifest,
    initialFocusOccurrence?.phase === 'middlegame'
      ? viewerSceneManifest.runtime.initialFocusOccurrenceId
      : undefined
  );
  const endgameAnchor = selectEndgameAnchor(builderBootstrapManifest);

  return [
    buildEntryPoint({
      entryId: 'opening',
      label: 'Opening',
      description: `${formatGameName(openingAnchor.embedding.rootGameId)} at full material. The farther stance keeps early branch identity readable without leaving the same object.`,
      occurrence: openingAnchor,
      distance: LIVE_VIEW_DISTANCE.structureThreshold + 0.3,
      neighborhoodRadius: clampNeighborhoodRadius(
        Math.max(viewerSceneManifest.runtime.defaultNeighborhoodRadius, 3),
        viewerSceneManifest.runtime.maxNeighborhoodRadius
      ),
      orbit: shiftOrbit(baseOrbit, -0.22, 0.06)
    }),
    buildEntryPoint({
      entryId: 'middlegame',
      label: 'Middlegame',
      description: `${formatGameName(middlegameAnchor.embedding.rootGameId)} at the branch-rich middle. This keeps the current camera grammar baseline while preserving local exploration.`,
      occurrence: middlegameAnchor,
      distance: LIVE_VIEW_DISTANCE.default,
      neighborhoodRadius: clampNeighborhoodRadius(
        viewerSceneManifest.runtime.defaultNeighborhoodRadius,
        viewerSceneManifest.runtime.maxNeighborhoodRadius
      ),
      orbit: shiftOrbit(baseOrbit, 0, 0)
    }),
    buildEntryPoint({
      entryId: 'endgame',
      label: 'Endgame',
      description: `${formatGameName(endgameAnchor.embedding.rootGameId)} in the simplified region. The closer stance tightens on terminal-facing structure without changing graph identity.`,
      occurrence: endgameAnchor,
      distance: LIVE_VIEW_DISTANCE.tacticalThreshold - 0.2,
      neighborhoodRadius: clampNeighborhoodRadius(
        viewerSceneManifest.runtime.defaultNeighborhoodRadius + 1,
        viewerSceneManifest.runtime.maxNeighborhoodRadius
      ),
      orbit: shiftOrbit(baseOrbit, 0.28, -0.04)
    })
  ];
}

export function resolveInitialNavigationEntryPointId(
  entryPoints: NavigationEntryPoint[],
  initialFocusOccurrenceId: string
): NavigationEntryPointId {
  return (
    entryPoints.find(
      (entryPoint) => entryPoint.focusOccurrenceId === initialFocusOccurrenceId
    )?.entryId ?? 'middlegame'
  );
}

export function resolveNavigationEntryPoint(
  entryPoints: NavigationEntryPoint[],
  entryId: NavigationEntryPointId
): NavigationEntryPoint {
  const entryPoint = entryPoints.find(
    (candidate) => candidate.entryId === entryId
  );

  if (!entryPoint) {
    throw new Error(`unknown navigation entrypoint: ${entryId}`);
  }

  return entryPoint;
}

function buildEntryPoint({
  entryId,
  label,
  description,
  occurrence,
  distance,
  neighborhoodRadius,
  orbit
}: {
  entryId: NavigationEntryPointId;
  label: string;
  description: string;
  occurrence: BuilderBootstrapManifest['occurrences'][number];
  distance: number;
  neighborhoodRadius: number;
  orbit: NavigationEntryPoint['orbit'];
}): NavigationEntryPoint {
  return {
    entryId,
    label,
    description,
    focusOccurrenceId: occurrence.occurrenceId,
    focus: occurrence.embedding.coordinate,
    distance: clampLiveViewDistance(distance),
    neighborhoodRadius,
    orbit,
    rootGameId: occurrence.embedding.rootGameId,
    anchorPly: occurrence.ply
  };
}

function selectOpeningAnchor(
  builderBootstrapManifest: BuilderBootstrapManifest,
  preferredOccurrenceId: string | undefined
) {
  const preferredOccurrence = preferredOccurrenceId
    ? builderBootstrapManifest.occurrences.find(
        (occurrence) => occurrence.occurrenceId === preferredOccurrenceId
      )
    : undefined;

  if (preferredOccurrence?.phase === 'opening' && preferredOccurrence.ply === 0) {
    return preferredOccurrence;
  }

  const openingOccurrences = builderBootstrapManifest.occurrences.filter(
    (occurrence) => occurrence.phase === 'opening' && occurrence.ply === 0
  );

  return requireAnchorOccurrence(
    builderBootstrapManifest,
    'opening',
    [...openingOccurrences].sort(compareOpeningAnchors)[0]
  );
}

function selectMiddlegameAnchor(
  builderBootstrapManifest: BuilderBootstrapManifest,
  preferredOccurrenceId: string | undefined
) {
  const preferredOccurrence = preferredOccurrenceId
    ? builderBootstrapManifest.occurrences.find(
        (occurrence) => occurrence.occurrenceId === preferredOccurrenceId
      )
    : undefined;

  if (preferredOccurrence?.phase === 'middlegame') {
    return preferredOccurrence;
  }

  const middlegameOccurrences = builderBootstrapManifest.occurrences.filter(
    (occurrence) => occurrence.phase === 'middlegame'
  );

  return requireAnchorOccurrence(
    builderBootstrapManifest,
    'middlegame',
    [...middlegameOccurrences].sort(compareMiddlegameAnchors)[0]
  );
}

function selectEndgameAnchor(
  builderBootstrapManifest: BuilderBootstrapManifest
) {
  const endgameOccurrences = builderBootstrapManifest.occurrences.filter(
    (occurrence) => occurrence.phase === 'endgame'
  );

  return requireAnchorOccurrence(
    builderBootstrapManifest,
    'endgame',
    [...endgameOccurrences].sort(compareEndgameAnchors)[0]
  );
}

function requireAnchorOccurrence(
  builderBootstrapManifest: BuilderBootstrapManifest,
  entryId: NavigationEntryPointId,
  occurrence: BuilderBootstrapManifest['occurrences'][number] | undefined
) {
  if (!occurrence) {
    throw new Error(
      `cannot derive ${entryId} entrypoint from ${builderBootstrapManifest.graphObjectId}; required phase coverage is missing`
    );
  }

  return occurrence;
}

function compareOpeningAnchors(
  left: BuilderBootstrapManifest['occurrences'][number],
  right: BuilderBootstrapManifest['occurrences'][number]
) {
  if (left.salience.normalizedScore !== right.salience.normalizedScore) {
    return right.salience.normalizedScore - left.salience.normalizedScore;
  }

  if (left.ply !== right.ply) {
    return left.ply - right.ply;
  }

  const rootComparison = left.embedding.rootGameId.localeCompare(
    right.embedding.rootGameId
  );
  if (rootComparison !== 0) {
    return rootComparison;
  }

  return left.occurrenceId.localeCompare(right.occurrenceId);
}

function compareMiddlegameAnchors(
  left: BuilderBootstrapManifest['occurrences'][number],
  right: BuilderBootstrapManifest['occurrences'][number]
) {
  const leftNonTerminal = Number(left.terminal === null);
  const rightNonTerminal = Number(right.terminal === null);

  if (leftNonTerminal !== rightNonTerminal) {
    return rightNonTerminal - leftNonTerminal;
  }

  if (left.salience.normalizedScore !== right.salience.normalizedScore) {
    return right.salience.normalizedScore - left.salience.normalizedScore;
  }

  if (left.ply !== right.ply) {
    return left.ply - right.ply;
  }

  const rootComparison = left.embedding.rootGameId.localeCompare(
    right.embedding.rootGameId
  );
  if (rootComparison !== 0) {
    return rootComparison;
  }

  return left.occurrenceId.localeCompare(right.occurrenceId);
}

function compareEndgameAnchors(
  left: BuilderBootstrapManifest['occurrences'][number],
  right: BuilderBootstrapManifest['occurrences'][number]
) {
  if (left.ply !== right.ply) {
    return left.ply - right.ply;
  }

  if (left.salience.normalizedScore !== right.salience.normalizedScore) {
    return right.salience.normalizedScore - left.salience.normalizedScore;
  }

  const rootComparison = left.embedding.rootGameId.localeCompare(
    right.embedding.rootGameId
  );
  if (rootComparison !== 0) {
    return rootComparison;
  }

  return left.occurrenceId.localeCompare(right.occurrenceId);
}

function shiftOrbit(
  orbit: NavigationEntryPoint['orbit'],
  deltaAzimuth: number,
  deltaElevation: number
) {
  return {
    azimuth: orbit.azimuth + deltaAzimuth,
    elevation: clampNumber(
      orbit.elevation + deltaElevation,
      CAMERA_ORBIT_LIMITS.minElevation,
      CAMERA_ORBIT_LIMITS.maxElevation
    )
  };
}

function clampNeighborhoodRadius(radius: number, maximum: number) {
  return clampNumber(radius, 0, maximum);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}