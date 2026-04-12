import type {
  BuilderAnchorRecord,
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
  const baseOrbit = deriveCameraOrbitState(viewerSceneManifest.camera.position);
  const openingAnchor = resolveNavigationAnchor(
    builderBootstrapManifest,
    occurrenceById,
    'opening'
  );
  const middlegameAnchor = resolveNavigationAnchor(
    builderBootstrapManifest,
    occurrenceById,
    'middlegame'
  );
  const endgameAnchor = resolveNavigationAnchor(
    builderBootstrapManifest,
    occurrenceById,
    'endgame'
  );

  return [
    buildEntryPoint({
      entryId: 'opening',
      label: 'Opening',
      description: `${formatGameName(openingAnchor.occurrence.embedding.rootGameId)} at full material. The farther stance keeps early branch identity readable without leaving the same object.`,
      anchor: openingAnchor.anchor,
      occurrence: openingAnchor.occurrence,
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
      description: `${formatGameName(middlegameAnchor.occurrence.embedding.rootGameId)} at the branch-rich middle. This keeps the current camera grammar baseline while preserving local exploration.`,
      anchor: middlegameAnchor.anchor,
      occurrence: middlegameAnchor.occurrence,
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
      description: `${formatGameName(endgameAnchor.occurrence.embedding.rootGameId)} in the simplified region. The closer stance tightens on terminal-facing structure without changing graph identity.`,
      anchor: endgameAnchor.anchor,
      occurrence: endgameAnchor.occurrence,
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
  anchor,
  occurrence,
  distance,
  neighborhoodRadius,
  orbit
}: {
  entryId: NavigationEntryPointId;
  label: string;
  description: string;
  anchor: BuilderAnchorRecord;
  occurrence: BuilderBootstrapManifest['occurrences'][number];
  distance: number;
  neighborhoodRadius: number;
  orbit: NavigationEntryPoint['orbit'];
}): NavigationEntryPoint {
  return {
    anchorId: anchor.anchorId,
    entryId,
    label,
    description,
    regimeId: requireAnchorRegimeId(anchor, entryId),
    focusOccurrenceId: occurrence.occurrenceId,
    focus: occurrence.embedding.coordinate,
    distance: clampLiveViewDistance(distance),
    neighborhoodRadius,
    orbit,
    rootGameId: occurrence.embedding.rootGameId,
    anchorPly: anchor.anchorPly ?? occurrence.ply
  };
}

function resolveNavigationAnchor(
  builderBootstrapManifest: BuilderBootstrapManifest,
  occurrenceById: Map<string, BuilderBootstrapManifest['occurrences'][number]>,
  entryId: NavigationEntryPointId
) {
  const anchor = builderBootstrapManifest.anchors.find(
    (candidate) =>
      candidate.anchorKind === 'navigation-entry' && candidate.entryId === entryId
  );
  const occurrenceId = anchor?.occurrenceIds[0];
  const occurrence = occurrenceId ? occurrenceById.get(occurrenceId) : undefined;

  return requireNavigationAnchor(
    builderBootstrapManifest,
    entryId,
    anchor,
    occurrence
  );
}

function requireNavigationAnchor(
  builderBootstrapManifest: BuilderBootstrapManifest,
  entryId: NavigationEntryPointId,
  anchor: BuilderAnchorRecord | undefined,
  occurrence: BuilderBootstrapManifest['occurrences'][number] | undefined
) {
  if (
    !anchor ||
    !occurrence ||
    anchor.anchorKind !== 'navigation-entry' ||
    anchor.entryId !== entryId ||
    anchor.occurrenceIds.length !== 1 ||
    anchor.anchorPly === null ||
    anchor.rootGameId === null ||
    anchor.regimeId === null
  ) {
    throw new Error(
      `cannot derive ${entryId} entrypoint from ${builderBootstrapManifest.graphObjectId}; required declared regime anchor is missing`
    );
  }

  return {
    anchor,
    occurrence
  };
}

function requireAnchorRegimeId(
  anchor: BuilderAnchorRecord,
  entryId: NavigationEntryPointId
) {
  if (anchor.regimeId === null) {
    throw new Error(`declared ${entryId} anchor is missing a regime id`);
  }

  return anchor.regimeId;
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