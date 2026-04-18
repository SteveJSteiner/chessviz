import type {
  BuilderAnchorRecord,
  BuilderRegimeId,
  NavigationEntryPoint,
  NavigationEntryPointId
} from './contracts';
import type { RuntimeBootstrapMaterialization } from './bootstrap.ts';
import {
  deriveCameraOrbitState,
  normalizeCameraOrbitState
} from './cameraOrbit.ts';
import { formatSubtreeLabel } from './chessContext.ts';
import { LIVE_VIEW_DISTANCE, clampLiveViewDistance } from './labelPolicy.ts';

export function createAnchoredNavigationEntryPoints(
  runtimeBootstrap: RuntimeBootstrapMaterialization
): NavigationEntryPoint[] {
  const { builderBootstrapManifest, viewerSceneManifest } = runtimeBootstrap;
  const occurrenceById = new Map(
    builderBootstrapManifest.occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence
    ])
  );
  const baseOrbit = deriveCameraOrbitState(viewerSceneManifest.camera.position);
  const openingAnchor = resolveNavigationAnchor(
    runtimeBootstrap,
    occurrenceById,
    'opening',
    'opening-table'
  );
  const middlegameAnchor = resolveNavigationAnchor(
    runtimeBootstrap,
    occurrenceById,
    'middlegame',
    'middlegame-procedural'
  );
  const endgameAnchor = resolveNavigationAnchor(
    runtimeBootstrap,
    occurrenceById,
    'endgame',
    'endgame-table'
  );

  return [
    buildEntryPoint({
      entryId: 'opening',
      label: 'Opening',
      description: `${formatSubtreeLabel(openingAnchor.occurrence.embedding.subtreeKey)} at full material. The farther stance keeps early branch structure readable without leaving the same object.`,
      anchor: openingAnchor.anchor,
      resolvedOccurrence: openingAnchor.resolvedOccurrence,
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
      description: `${formatSubtreeLabel(middlegameAnchor.occurrence.embedding.subtreeKey)} at the branch-rich middle. This keeps the current camera grammar baseline while preserving local exploration.`,
      anchor: middlegameAnchor.anchor,
      resolvedOccurrence: middlegameAnchor.resolvedOccurrence,
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
      description: `${formatSubtreeLabel(endgameAnchor.occurrence.embedding.subtreeKey)} in the simplified region. The closer stance tightens on terminal-facing structure without changing graph identity.`,
      anchor: endgameAnchor.anchor,
      resolvedOccurrence: endgameAnchor.resolvedOccurrence,
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
  resolvedOccurrence,
  distance,
  neighborhoodRadius,
  orbit
}: {
  entryId: NavigationEntryPointId;
  label: string;
  description: string;
  anchor: BuilderAnchorRecord;
  resolvedOccurrence: ReturnType<
    RuntimeBootstrapMaterialization['regimeResolver']['resolveOccurrence']
  >;
  distance: number;
  neighborhoodRadius: number;
  orbit: NavigationEntryPoint['orbit'];
}): NavigationEntryPoint {
  const occurrence = resolvedOccurrence.occurrence;

  return {
    anchorId: anchor.anchorId,
    entryId,
    label,
    description,
    regimeId: resolvedOccurrence.resolvedRegimeId,
    focusOccurrenceId: occurrence.occurrenceId,
    distance: clampLiveViewDistance(distance),
    neighborhoodRadius,
    orbit,
    subtreeKey: occurrence.embedding.subtreeKey,
    anchorPly: anchor.anchorPly ?? occurrence.ply
  };
}

function resolveNavigationAnchor(
  runtimeBootstrap: RuntimeBootstrapMaterialization,
  occurrenceById: Map<
    string,
    RuntimeBootstrapMaterialization['builderBootstrapManifest']['occurrences'][number]
  >,
  entryId: NavigationEntryPointId,
  expectedRegimeId: BuilderRegimeId
) {
  const { builderBootstrapManifest, regimeResolver } = runtimeBootstrap;
  const anchor = builderBootstrapManifest.anchors.find(
    (candidate) =>
      candidate.anchorKind === 'navigation-entry' && candidate.entryId === entryId
  );
  const occurrenceId = anchor?.occurrenceIds[0];
  const occurrence = occurrenceId ? occurrenceById.get(occurrenceId) : undefined;
  const resolvedOccurrence = occurrenceId
    ? regimeResolver.resolveOccurrenceId(occurrenceId)
    : undefined;

  return requireNavigationAnchor(
    builderBootstrapManifest,
    entryId,
    expectedRegimeId,
    anchor,
    occurrence,
    resolvedOccurrence
  );
}

function requireNavigationAnchor(
  builderBootstrapManifest: RuntimeBootstrapMaterialization['builderBootstrapManifest'],
  entryId: NavigationEntryPointId,
  expectedRegimeId: BuilderRegimeId,
  anchor: BuilderAnchorRecord | undefined,
  occurrence:
    | RuntimeBootstrapMaterialization['builderBootstrapManifest']['occurrences'][number]
    | undefined,
  resolvedOccurrence:
    | ReturnType<RuntimeBootstrapMaterialization['regimeResolver']['resolveOccurrence']>
    | undefined
) {
  if (
    !anchor ||
    !occurrence ||
    !resolvedOccurrence ||
    anchor.anchorKind !== 'navigation-entry' ||
    anchor.entryId !== entryId ||
    anchor.occurrenceIds.length !== 1 ||
    anchor.anchorPly === null ||
    anchor.subtreeKey === null
  ) {
    throw new Error(
      `cannot derive ${entryId} entrypoint from ${builderBootstrapManifest.graphObjectId}; required declared regime anchor is missing`
    );
  }

  if (resolvedOccurrence.resolvedRegimeId !== expectedRegimeId) {
    throw new Error(
      `cannot derive ${entryId} entrypoint from ${builderBootstrapManifest.graphObjectId}; declared regime anchor resolves to ${resolvedOccurrence.resolvedRegimeId}`
    );
  }

  if (
    anchor.subtreeKey !== occurrence.embedding.subtreeKey ||
    anchor.anchorPly !== occurrence.ply
  ) {
    throw new Error(
      `cannot derive ${entryId} entrypoint from ${builderBootstrapManifest.graphObjectId}; declared regime anchor fractures anchoring continuity`
    );
  }

  return {
    anchor,
    occurrence,
    resolvedOccurrence
  };
}

function shiftOrbit(
  orbit: NavigationEntryPoint['orbit'],
  deltaAzimuth: number,
  deltaElevation: number
) {
  return normalizeCameraOrbitState({
    azimuth: orbit.azimuth + deltaAzimuth,
    elevation: orbit.elevation + deltaElevation
  });
}

function clampNeighborhoodRadius(radius: number, maximum: number) {
  return clampNumber(radius, 0, maximum);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}