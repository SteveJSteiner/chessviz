import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  createCameraGrammarState,
  resolveCameraGrammarRefinementBudget
} from './viewer/cameraGrammar';
import { scaleCoordinate } from './viewer/carrierPresentation';
import { deriveCameraOrbitState, normalizeCameraOrbitState } from './viewer/cameraOrbit';
import type {
  BuilderOccurrenceRecord,
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
const FOCUS_SWITCH_HYSTERESIS = 0.28;

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
  const [cameraPose, setCameraPose] = useState(() =>
    createInitialDetachedCameraPose(runtimeBootstrap.sceneBootstrap)
  );
  const deferredCameraPose = useDeferredValue(cameraPose);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const builderBootstrapManifest = runtimeStore.getBuilderBootstrapManifest();
  const totalGraphOccurrenceCount = builderBootstrapManifest.occurrences.length;
  const totalGraphEdgeCount = builderBootstrapManifest.edges.length;
  const focusOccurrence = runtimeStore.resolveOccurrence(focusOccurrenceId) ?? null;
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
    const nextFocusOccurrenceId = resolveTraversalFocusOccurrenceId({
      occurrences: builderBootstrapManifest.occurrences,
      currentFocusOccurrenceId: focusOccurrenceId,
      cameraPosition: deferredCameraPose.position,
      cameraOrbit: deferredCameraPose.orbit
    });

    if (nextFocusOccurrenceId !== focusOccurrenceId) {
      setHoveredOccurrenceId(null);
      setFocusOccurrenceId(nextFocusOccurrenceId);
    }
  }, [
    builderBootstrapManifest.occurrences,
    deferredCameraPose,
    focusOccurrenceId
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
          refinementBudget: deferredRuntimeSnapshot.refinementBudget
        }
      ),
    [deferredRuntimeSnapshot, runtimeStore]
  );
  const hoveredOccurrence = hoveredOccurrenceId
    ? runtimeStore.resolveOccurrence(hoveredOccurrenceId) ?? null
    : null;

  return (
    <ViewerShell
      boardReferenceOpen={boardReferenceOpen}
      cameraDistance={cameraDistance}
      cameraGrammar={cameraGrammar}
      cameraOrbit={cameraPose.orbit}
      cameraPosition={cameraPose.position}
      carrierSurface={carrierSurface}
      focusOccurrence={focusOccurrence}
      hoveredOccurrence={hoveredOccurrence}
      onBoardReferenceOpenChange={setBoardReferenceOpen}
      onCameraPoseChange={(position, orbit) =>
        setCameraPose({
          position,
          orbit: quantizeCameraOrbit(orbit)
        })
      }
      onFocusOccurrenceChange={(occurrenceId) => {
        setHoveredOccurrenceId(null);
        setFocusOccurrenceId(occurrenceId);
        setBoardReferenceOpen(true);
      }}
      onHoverOccurrenceChange={setHoveredOccurrenceId}
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
): { position: Vector3; orbit: CameraOrbitPreset } {
  return {
    position: [...sceneBootstrap.camera.position] as Vector3,
    orbit: quantizeCameraOrbit(
      deriveCameraOrbitState([
        sceneBootstrap.camera.position[0] - sceneBootstrap.camera.lookAt[0],
        sceneBootstrap.camera.position[1] - sceneBootstrap.camera.lookAt[1],
        sceneBootstrap.camera.position[2] - sceneBootstrap.camera.lookAt[2]
      ])
    )
  };
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
  const lookVector = resolveLookVector(cameraOrbit);
  let bestOccurrenceId = currentFocusOccurrenceId;
  let bestScore = Number.NEGATIVE_INFINITY;
  let currentScore = Number.NEGATIVE_INFINITY;

  for (const occurrence of occurrences) {
    const score = scoreTraversalFocusCandidate({
      occurrence,
      currentFocusOccurrenceId,
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
  cameraPosition,
  lookVector
}: {
  occurrence: BuilderOccurrenceRecord;
  currentFocusOccurrenceId: string;
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
  const stickiness = occurrence.occurrenceId === currentFocusOccurrenceId ? 0.35 : 0;

  return forwardScore + distanceScore + salienceScore + terminalScore + stickiness;
}

function resolveLookVector(orbit: CameraOrbitPreset): Vector3 {
  const normalizedOrbit = normalizeCameraOrbitState(orbit);
  const planarDistance = Math.cos(normalizedOrbit.elevation);

  return normalizeVector([
    -(Math.sin(normalizedOrbit.azimuth) * planarDistance),
    -Math.sin(normalizedOrbit.elevation),
    -(Math.cos(normalizedOrbit.azimuth) * planarDistance)
  ]);
}

function quantizeCameraOrbit(orbit: CameraOrbitPreset): CameraOrbitPreset {
  const normalizedOrbit = normalizeCameraOrbitState(orbit);

  return {
    azimuth: quantizeNumber(normalizedOrbit.azimuth, 0.08),
    elevation: quantizeNumber(normalizedOrbit.elevation, 0.06)
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

function quantizeNumber(value: number, step: number) {
  return Math.round(value / step) * step;
}
