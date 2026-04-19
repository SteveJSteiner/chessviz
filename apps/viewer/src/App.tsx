import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  createCameraGrammarState,
  resolveCameraGrammarRefinementBudget
} from './viewer/cameraGrammar';
import { scaleCoordinate } from './viewer/carrierPresentation';
import {
  deriveCameraOrbitState,
  normalizeCameraOrbitState,
  resolveCameraSetPoint,
  resolveCameraLookVector,
  resolveOrbitCameraPosition
} from './viewer/cameraOrbit';
import type {
  BuilderOccurrenceRecord,
  CameraNavigationMode,
  CameraOrbitPreset,
  RuntimeGraphViewScope,
  SceneBootstrap,
  Vector3
} from './viewer/contracts';
import {
  createViewerRuntimeStore,
  resolveViewerRuntimeSource
} from './viewer/dynamicRuntime';
import {
  DEFAULT_VIEWER_RENDER_TUNING
} from './viewer/renderTuning';
import {
  LIVE_VIEW_DISTANCE,
  clampLiveViewDistance
} from './viewer/labelPolicy';
import { ViewerShell } from './viewer/ViewerShell';

const VIEW_SCOPE: RuntimeGraphViewScope = 'whole-object';
const FOCUS_SWITCH_HYSTERESIS = 0.85;
const MANUAL_FOCUS_RELEASE_POSITION = 0.4;
const MANUAL_FOCUS_RELEASE_ORBIT = 0.18;

type ManualFocusHold = {
  occurrenceId: string;
  position: Vector3;
  orbit: CameraOrbitPreset;
};

type CameraPose = {
  position: Vector3;
  orbit: CameraOrbitPreset;
  pivotDistance: number;
};

export default function App() {
  const [runtimeSource] = useState(() =>
    resolveViewerRuntimeSource(globalThis.location?.search ?? '')
  );
  const { runtimeBootstrap } = runtimeSource;
  const [runtimeStore] = useState(() => createViewerRuntimeStore(runtimeSource));
  const [focusOccurrenceId, setFocusOccurrenceId] = useState(
    runtimeBootstrap.initialFocusOccurrenceId
  );
  const [hoveredOccurrenceId, setHoveredOccurrenceId] = useState<string | null>(null);
  const [boardReferenceOpen, setBoardReferenceOpen] = useState(false);
  const [navigationMode, setNavigationMode] = useState<CameraNavigationMode>(
    'camera-relative'
  );
  const [cameraPose, setCameraPose] = useState<CameraPose>(() =>
    createInitialDetachedCameraPose(runtimeBootstrap.sceneBootstrap)
  );
  const [manualFocusHold, setManualFocusHold] =
    useState<ManualFocusHold | null>(null);
  const deferredCameraPose = useDeferredValue(cameraPose);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const builderBootstrapManifest = runtimeStore.getBuilderBootstrapManifest();
  const totalGraphOccurrenceCount = builderBootstrapManifest.occurrences.length;
  const totalGraphEdgeCount = builderBootstrapManifest.edges.length;
  const focusOccurrence = runtimeStore.resolveOccurrence(focusOccurrenceId) ?? null;
  const cameraPoseRef = useRef<CameraPose>(cameraPose);
  const focusOccurrenceRef = useRef<BuilderOccurrenceRecord | null>(focusOccurrence);
  const cameraSetPoint = resolveCameraSetPoint(
    cameraPose.position,
    cameraPose.orbit,
    cameraPose.pivotDistance
  );
  const cameraDistance = focusOccurrence
    ? clampLiveViewDistance(
        distanceBetween(
          deferredCameraPose.position,
          scaleCoordinate(focusOccurrence.embedding.coordinate)
        )
      )
    : LIVE_VIEW_DISTANCE.default;
  const refinementBudget = resolveCameraGrammarRefinementBudget(
    cameraDistance,
    runtimeConfig
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() =>
    runtimeStore.inspectView(focusOccurrenceId, {
      scope: VIEW_SCOPE,
      neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
      refinementBudget,
      cameraDistance,
      cameraOrbit: cameraPose.orbit
    })
  );
  const deferredRuntimeSnapshot = useDeferredValue(runtimeSnapshot);
  const cameraGrammar = createCameraGrammarState({
    cameraDistance,
    runtimeConfig,
    runtimeSnapshot: deferredRuntimeSnapshot
  });

  useEffect(() => {
    if (manualFocusHold) {
      if (!hasCameraPoseEscapedManualFocusHold(deferredCameraPose, manualFocusHold)) {
        return;
      }

      setManualFocusHold(null);
      return;
    }

    const nextFocusOccurrenceId = resolveTraversalFocusOccurrenceId({
      occurrences: deferredRuntimeSnapshot.occurrences,
      currentFocusOccurrenceId: focusOccurrenceId,
      cameraPosition: deferredCameraPose.position,
      cameraOrbit: deferredCameraPose.orbit
    });

    if (nextFocusOccurrenceId !== focusOccurrenceId) {
      setHoveredOccurrenceId(null);
      setFocusOccurrenceId(nextFocusOccurrenceId);
    }
  }, [
    deferredCameraPose,
    deferredRuntimeSnapshot.occurrences,
    focusOccurrenceId,
    manualFocusHold
  ]);

  useEffect(() => {
    startTransition(() => {
      setRuntimeSnapshot(
        runtimeStore.materializeView(focusOccurrenceId, {
          scope: VIEW_SCOPE,
          neighborhoodRadius: runtimeConfig.defaultNeighborhoodRadius,
          refinementBudget,
          cameraDistance,
          cameraOrbit: deferredCameraPose.orbit
        })
      );
    });
  }, [
    cameraDistance,
    deferredCameraPose.orbit,
    focusOccurrenceId,
    refinementBudget,
    runtimeConfig.defaultNeighborhoodRadius,
    runtimeStore
  ]);

  const carrierSurface = useMemo(
    () =>
      runtimeStore.inspectCarrierSurface(
        deferredRuntimeSnapshot.occurrences.map(
          (occurrence) => occurrence.occurrenceId
        ),
        {
          refinementBudget: deferredRuntimeSnapshot.refinementBudget,
          selectedEdges: deferredRuntimeSnapshot.edges
        }
      ),
    [deferredRuntimeSnapshot, runtimeStore]
  );
  const hoveredOccurrence = hoveredOccurrenceId
    ? runtimeStore.resolveOccurrence(hoveredOccurrenceId) ?? null
    : null;
  const initialFocusOccurrence =
    runtimeStore.resolveOccurrence(runtimeBootstrap.initialFocusOccurrenceId) ??
    builderBootstrapManifest.occurrences[0] ??
    null;
  const initialFocusOccurrenceRef = useRef<BuilderOccurrenceRecord | null>(
    initialFocusOccurrence
  );

  useEffect(() => {
    cameraPoseRef.current = cameraPose;
  }, [cameraPose]);

  useEffect(() => {
    focusOccurrenceRef.current = focusOccurrence;
  }, [focusOccurrence]);

  useEffect(() => {
    initialFocusOccurrenceRef.current = initialFocusOccurrence;
  }, [initialFocusOccurrence]);

  const handleCameraPoseChange = useCallback(
    (
      position: Vector3,
      orbit: CameraOrbitPreset,
      pivotDistance: number
    ) => {
      setCameraPose({
        position,
        orbit: quantizeCameraOrbit(orbit),
        pivotDistance: quantizeNumber(pivotDistance, 0.04)
      });
    },
    []
  );

  const handleFocusOccurrenceChange = useCallback((occurrenceId: string) => {
    const targetOccurrence = runtimeStore.resolveOccurrence(occurrenceId);
    const currentCameraPose = cameraPoseRef.current;
    const currentFocusOccurrence = focusOccurrenceRef.current;

    setHoveredOccurrenceId(null);
    setFocusOccurrenceId(occurrenceId);
    setBoardReferenceOpen(true);

    if (!targetOccurrence) {
      setManualFocusHold(null);
      return;
    }

    const nextPose = createCenteredCameraPose({
      occurrence: targetOccurrence,
      orbit: currentCameraPose.orbit,
      distance: resolveTrackedCameraDistance(
        currentCameraPose.position,
        currentFocusOccurrence,
        runtimeBootstrap.sceneBootstrap
      )
    });

    setManualFocusHold({
      occurrenceId,
      position: nextPose.position,
      orbit: nextPose.orbit
    });
    setCameraPose(nextPose);
  }, [runtimeBootstrap.sceneBootstrap, runtimeStore]);

  const handleResetCameraPose = useCallback(() => {
    const resetOccurrence =
      focusOccurrenceRef.current ?? initialFocusOccurrenceRef.current;
    if (!resetOccurrence) {
      return;
    }

    const nextPose = createResetCameraPose(
      resetOccurrence,
      runtimeBootstrap.sceneBootstrap
    );

    setHoveredOccurrenceId(null);
    setFocusOccurrenceId(resetOccurrence.occurrenceId);
    setManualFocusHold({
      occurrenceId: resetOccurrence.occurrenceId,
      position: nextPose.position,
      orbit: nextPose.orbit
    });
    setCameraPose(nextPose);
  }, [runtimeBootstrap.sceneBootstrap]);

  return (
    <ViewerShell
      boardReferenceOpen={boardReferenceOpen}
      cameraDistance={cameraDistance}
      cameraGrammar={cameraGrammar}
      cameraNavigationMode={navigationMode}
      cameraOrbit={cameraPose.orbit}
      cameraPosition={cameraPose.position}
      cameraSetPoint={cameraSetPoint}
      cameraSetPointDistance={cameraPose.pivotDistance}
      carrierSurface={carrierSurface}
      focusOccurrence={focusOccurrence}
      hoveredOccurrence={hoveredOccurrence}
      onBoardReferenceOpenChange={setBoardReferenceOpen}
      onCameraPoseChange={handleCameraPoseChange}
      onFocusOccurrenceChange={handleFocusOccurrenceChange}
      onHoverOccurrenceChange={setHoveredOccurrenceId}
      onNavigationModeChange={setNavigationMode}
      onResetCameraPose={handleResetCameraPose}
      renderTuning={DEFAULT_VIEWER_RENDER_TUNING}
      runtimeConfig={runtimeConfig}
      runtimeSnapshot={deferredRuntimeSnapshot}
      sceneBootstrap={runtimeBootstrap.sceneBootstrap}
      totalGraphEdgeCount={totalGraphEdgeCount}
      totalGraphOccurrenceCount={totalGraphOccurrenceCount}
    />
  );
}

function createInitialDetachedCameraPose(
  sceneBootstrap: SceneBootstrap
): CameraPose {
  const orbit = resolveDefaultDetachedOrbit(sceneBootstrap);
  const pivotDistance = resolveDefaultDetachedDistance(sceneBootstrap);

  return {
    position: [...sceneBootstrap.camera.position] as Vector3,
    orbit,
    pivotDistance
  };
}

function createCenteredCameraPose({
  occurrence,
  orbit,
  distance
}: {
  occurrence: BuilderOccurrenceRecord;
  orbit: CameraOrbitPreset;
  distance: number;
}): CameraPose {
  const nextOrbit = quantizeCameraOrbit(orbit);
  const pivotDistance = Math.max(distance, 0.2);
  const targetPosition = scaleCoordinate(occurrence.embedding.coordinate);

  return {
    position: resolveOrbitCameraPosition(targetPosition, pivotDistance, nextOrbit),
    orbit: nextOrbit,
    pivotDistance
  };
}

function createResetCameraPose(
  occurrence: BuilderOccurrenceRecord,
  sceneBootstrap: SceneBootstrap
): CameraPose {
  const orbit = resolveDefaultDetachedOrbit(sceneBootstrap);
  const pivotDistance = resolveDefaultDetachedDistance(sceneBootstrap);
  const targetPosition = scaleCoordinate(occurrence.embedding.coordinate);

  return {
    position: resolveOrbitCameraPosition(
      targetPosition,
      pivotDistance,
      orbit
    ),
    orbit,
    pivotDistance
  };
}

function resolveDefaultDetachedOrbit(
  sceneBootstrap: SceneBootstrap
): CameraOrbitPreset {
  return quantizeCameraOrbit(
    deriveCameraOrbitState([
      sceneBootstrap.camera.position[0] - sceneBootstrap.camera.lookAt[0],
      sceneBootstrap.camera.position[1] - sceneBootstrap.camera.lookAt[1],
      sceneBootstrap.camera.position[2] - sceneBootstrap.camera.lookAt[2]
    ])
  );
}

function resolveDefaultDetachedDistance(sceneBootstrap: SceneBootstrap) {
  return distanceBetween(sceneBootstrap.camera.position, sceneBootstrap.camera.lookAt);
}

function resolveTrackedCameraDistance(
  cameraPosition: Vector3,
  focusOccurrence: BuilderOccurrenceRecord | null,
  sceneBootstrap: SceneBootstrap
) {
  if (!focusOccurrence) {
    return resolveDefaultDetachedDistance(sceneBootstrap);
  }

  return distanceBetween(
    cameraPosition,
    scaleCoordinate(focusOccurrence.embedding.coordinate)
  );
}

function hasCameraPoseEscapedManualFocusHold(
  cameraPose: { position: Vector3; orbit: CameraOrbitPreset },
  manualFocusHold: ManualFocusHold
) {
  return (
    distanceBetween(cameraPose.position, manualFocusHold.position) >
      MANUAL_FOCUS_RELEASE_POSITION ||
    resolveOrbitDelta(cameraPose.orbit, manualFocusHold.orbit) >
      MANUAL_FOCUS_RELEASE_ORBIT
  );
}

function resolveTraversalFocusOccurrenceId({
  occurrences,
  currentFocusOccurrenceId,
  cameraPosition,
  cameraOrbit
}: {
  occurrences: BuilderOccurrenceRecord[];
  currentFocusOccurrenceId: string;
  cameraPosition: Vector3;
  cameraOrbit: CameraOrbitPreset;
}) {
  const lookVector = resolveCameraLookVector(cameraOrbit);
  const currentFocusOccurrence =
    occurrences.find(
      (occurrence) => occurrence.occurrenceId === currentFocusOccurrenceId
    ) ?? null;
  let bestOccurrenceId = currentFocusOccurrenceId;
  let bestScore = Number.NEGATIVE_INFINITY;
  let currentScore = Number.NEGATIVE_INFINITY;

  for (const occurrence of occurrences) {
    const score = scoreTraversalFocusCandidate({
      occurrence,
      currentFocusOccurrenceId,
      currentFocusOccurrence,
      cameraPosition,
      lookVector
    });

    if (occurrence.occurrenceId === currentFocusOccurrenceId) {
      currentScore = score;
    }

    if (score > bestScore) {
      bestScore = score;
      bestOccurrenceId = occurrence.occurrenceId;
    }
  }

  if (currentScore >= bestScore - FOCUS_SWITCH_HYSTERESIS) {
    return currentFocusOccurrenceId;
  }

  return bestOccurrenceId;
}

function scoreTraversalFocusCandidate({
  occurrence,
  currentFocusOccurrenceId,
  currentFocusOccurrence,
  cameraPosition,
  lookVector
}: {
  occurrence: BuilderOccurrenceRecord;
  currentFocusOccurrenceId: string;
  currentFocusOccurrence: BuilderOccurrenceRecord | null;
  cameraPosition: Vector3;
  lookVector: Vector3;
}) {
  const occurrencePosition = scaleCoordinate(occurrence.embedding.coordinate);
  const offset = subtractVectors(occurrencePosition, cameraPosition);
  const distance = distanceBetween(occurrencePosition, cameraPosition);

  if (distance <= 1e-6) {
    return 99;
  }

  const alignment = dotProduct(normalizeVector(offset), normalizeVector(lookVector));
  const forwardScore = alignment >= 0 ? alignment * 3.4 : alignment * 1.15;
  const distanceScore = 4.8 / (distance + 0.72);
  const salienceScore = occurrence.salience.normalizedScore * 1.9;
  const terminalScore = occurrence.terminal ? 0.45 : 0;
  const stickiness = occurrence.occurrenceId === currentFocusOccurrenceId ? 1.1 : 0;
  const continuityScore = resolveTraversalContinuityScore(
    occurrence,
    currentFocusOccurrence
  );

  return (
    forwardScore +
    distanceScore +
    salienceScore +
    terminalScore +
    stickiness +
    continuityScore
  );
}

function resolveTraversalContinuityScore(
  occurrence: BuilderOccurrenceRecord,
  currentFocusOccurrence: BuilderOccurrenceRecord | null
) {
  if (!currentFocusOccurrence || currentFocusOccurrence.path.length <= 2) {
    return 0;
  }

  const sharedPrefixLength = resolveSharedPathPrefixLength(
    occurrence.path,
    currentFocusOccurrence.path
  );
  const sharedPrefixRatio =
    sharedPrefixLength / Math.max(currentFocusOccurrence.path.length, 1);
  const plyDelta = Math.abs(occurrence.ply - currentFocusOccurrence.ply);
  const divergenceDepth = currentFocusOccurrence.path.length - sharedPrefixLength;
  const sameLine =
    sharedPrefixLength ===
    Math.min(occurrence.path.length, currentFocusOccurrence.path.length);
  const subtreeSwitchPenalty =
    currentFocusOccurrence.embedding.subtreeKey !== 'root' &&
    occurrence.embedding.subtreeKey !== currentFocusOccurrence.embedding.subtreeKey
      ? 0.75
      : 0;

  return (
    (sharedPrefixRatio * 1.85) +
    Math.max(0, 0.7 - (plyDelta * 0.18)) +
    (sameLine ? 0.9 : 0) -
    (Math.max(0, divergenceDepth - 1) * 0.55) -
    subtreeSwitchPenalty
  );
}

function resolveSharedPathPrefixLength(leftPath: string[], rightPath: string[]) {
  const limit = Math.min(leftPath.length, rightPath.length);
  let index = 0;

  while (index < limit && leftPath[index] === rightPath[index]) {
    index += 1;
  }

  return index;
}

function quantizeCameraOrbit(orbit: CameraOrbitPreset): CameraOrbitPreset {
  const normalizedOrbit = normalizeCameraOrbitState(orbit);

  return {
    azimuth: quantizeNumber(normalizedOrbit.azimuth, 0.08),
    elevation: quantizeNumber(normalizedOrbit.elevation, 0.06),
    roll: quantizeNumber(normalizedOrbit.roll ?? 0, 0.06)
  };
}

function subtractVectors(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function distanceBetween(left: Vector3, right: Vector3) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  );
}

function dotProduct(left: Vector3, right: Vector3) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function normalizeVector(vector: Vector3): Vector3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);

  if (length <= 1e-6) {
    return [0, 0, -1];
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function resolveOrbitDelta(
  left: CameraOrbitPreset,
  right: CameraOrbitPreset
) {
  return Math.max(
    Math.abs(resolveAngleDelta(left.azimuth, right.azimuth)),
    Math.abs(left.elevation - right.elevation),
    Math.abs(resolveAngleDelta(left.roll ?? 0, right.roll ?? 0))
  );
}

function resolveAngleDelta(left: number, right: number) {
  return Math.atan2(Math.sin(left - right), Math.cos(left - right));
}

function quantizeNumber(value: number, step: number) {
  return Math.round(value / step) * step;
}
