import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  createCameraGrammarState,
  resolveCameraGrammarRefinementBudget
} from './viewer/cameraGrammar';
import type { CameraOrbitPreset, RuntimeGraphViewScope } from './viewer/contracts';
import { normalizeCameraOrbitState } from './viewer/cameraOrbit';
import {
  clampLiveViewDistance
} from './viewer/labelPolicy';
import {
  resolveNavigationEntryPoint
} from './viewer/navigation';
import {
  DEFAULT_VIEWER_RENDER_TUNING,
  clampViewerRenderTuning
} from './viewer/renderTuning';
import {
  createViewerRuntimeStore,
  resolveViewerRuntimeSource
} from './viewer/dynamicRuntime';
import { runtimeArtifactBundle } from './viewer/runtimeArtifacts';
import { buildRuntimeTranspositionSurface } from './viewer/transpositionSurface';
import { ViewerShell } from './viewer/ViewerShell';

export type GraphViewScope = RuntimeGraphViewScope;

export default function App() {
  const [runtimeSource] = useState(() =>
    resolveViewerRuntimeSource(
      runtimeArtifactBundle,
      globalThis.location?.search ?? ''
    )
  );
  const { runtimeBootstrap, navigationEntryPoints } = runtimeSource;
  const [runtimeStore] = useState(() => createViewerRuntimeStore(runtimeSource));
  const [activeEntryPointId, setActiveEntryPointId] = useState(() =>
    runtimeSource.initialEntryPointId
  );
  const activeNavigationEntryPoint = resolveNavigationEntryPoint(
    navigationEntryPoints,
    activeEntryPointId
  );
  const [focusOccurrenceId, setFocusOccurrenceId] = useState(
    runtimeBootstrap.initialFocusOccurrenceId
  );
  const [graphViewScope, setGraphViewScope] =
    useState<GraphViewScope>('local-neighborhood');
  const [neighborhoodRadius, setNeighborhoodRadius] = useState(
    activeNavigationEntryPoint.neighborhoodRadius
  );
  const [cameraDistance, setCameraDistance] = useState<number>(
    activeNavigationEntryPoint.distance
  );
  const [cameraDemandOrbit, setCameraDemandOrbit] = useState<CameraOrbitPreset>(() =>
    quantizeCameraOrbit(activeNavigationEntryPoint.orbit)
  );
  const [hoveredOccurrenceId, setHoveredOccurrenceId] = useState<string | null>(null);
  const [boardReferenceOpen, setBoardReferenceOpen] = useState(false);
  const [orbitResetKey, setOrbitResetKey] = useState(0);
  const [renderTuning, setRenderTuning] = useState(DEFAULT_VIEWER_RENDER_TUNING);
  const runtimeConfig = runtimeStore.getViewerSceneManifest().runtime;
  const refinementBudget = resolveCameraGrammarRefinementBudget(
    cameraDistance,
    runtimeConfig
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() =>
    runtimeStore.inspectView(focusOccurrenceId, {
      scope: graphViewScope,
      neighborhoodRadius,
      refinementBudget,
      cameraDistance,
      cameraOrbit: cameraDemandOrbit
    })
  );
  const deferredRuntimeSnapshot = useDeferredValue(runtimeSnapshot);
  const builderBootstrapManifest = runtimeStore.getBuilderBootstrapManifest();
  const totalGraphOccurrenceCount = builderBootstrapManifest.occurrences.length;
  const totalGraphEdgeCount = builderBootstrapManifest.edges.length;
  const meetsN12Scale = totalGraphOccurrenceCount >= 1000;

  useEffect(() => {
    startTransition(() => {
      setRuntimeSnapshot(
        runtimeStore.materializeView(focusOccurrenceId, {
          scope: graphViewScope,
          neighborhoodRadius,
          refinementBudget,
          cameraDistance,
          cameraOrbit: cameraDemandOrbit
        })
      );
    });
  }, [
    cameraDemandOrbit,
    cameraDistance,
    focusOccurrenceId,
    graphViewScope,
    neighborhoodRadius,
    refinementBudget,
    runtimeStore
  ]);
  const carrierSurface = runtimeStore.inspectCarrierSurface(
    deferredRuntimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    {
      refinementBudget: deferredRuntimeSnapshot.refinementBudget
    }
  );
  const transpositionSurface = buildRuntimeTranspositionSurface(
    builderBootstrapManifest,
    deferredRuntimeSnapshot,
    graphViewScope
  );
  const hoveredOccurrence = hoveredOccurrenceId
    ? runtimeStore.resolveOccurrence(hoveredOccurrenceId) ?? null
    : null;
  const baseFocusOptions = runtimeStore.getFocusOptions();
  const currentFocusOccurrence = runtimeStore.resolveOccurrence(focusOccurrenceId);
  const focusOptions = currentFocusOccurrence
    && !baseFocusOptions.some(
      (occurrence) => occurrence.occurrenceId === currentFocusOccurrence.occurrenceId
    )
    ? [currentFocusOccurrence, ...baseFocusOptions]
    : baseFocusOptions;
  const cameraGrammar = createCameraGrammarState({
    cameraDistance,
    runtimeConfig,
    runtimeSnapshot: deferredRuntimeSnapshot
  });

  const handleEntryPointChange = (entryId: typeof activeEntryPointId) => {
    const entryPoint = resolveNavigationEntryPoint(navigationEntryPoints, entryId);

    setActiveEntryPointId(entryId);
    setFocusOccurrenceId(entryPoint.focusOccurrenceId);
    setHoveredOccurrenceId(null);
    setNeighborhoodRadius(entryPoint.neighborhoodRadius);
    setCameraDistance(entryPoint.distance);
    setCameraDemandOrbit(quantizeCameraOrbit(entryPoint.orbit));
    setBoardReferenceOpen(true);
    setOrbitResetKey((currentKey) => currentKey + 1);
  };

  const handleFocusOccurrenceChange = (occurrenceId: string) => {
    setHoveredOccurrenceId(null);
    setFocusOccurrenceId(occurrenceId);
    setBoardReferenceOpen(true);
  };

  const handleGraphViewScopeChange = (scope: GraphViewScope) => {
    setHoveredOccurrenceId(null);
    setGraphViewScope(scope);
  };

  const handleNeighborhoodRadiusChange = (radius: number) => {
    setHoveredOccurrenceId(null);
    setNeighborhoodRadius(radius);
  };

  return (
    <ViewerShell
      activeEntryPointId={activeEntryPointId}
      boardReferenceOpen={boardReferenceOpen}
      cameraGrammar={cameraGrammar}
      carrierSurface={carrierSurface}
      cameraDistance={cameraDistance}
      focusOccurrenceId={focusOccurrenceId}
      focusOptions={focusOptions}
      graphViewScope={graphViewScope}
      hoveredOccurrence={hoveredOccurrence}
      entryPoints={navigationEntryPoints}
      meetsN12Scale={meetsN12Scale}
      navigationEntryPoint={activeNavigationEntryPoint}
      onCameraDistanceChange={(distance) =>
        setCameraDistance(clampLiveViewDistance(distance))
      }
      onCameraOrbitChange={(orbit) => {
        const nextOrbit = quantizeCameraOrbit(orbit);

        setCameraDemandOrbit((currentOrbit) =>
          currentOrbit.azimuth === nextOrbit.azimuth &&
          currentOrbit.elevation === nextOrbit.elevation
            ? currentOrbit
            : nextOrbit
        );
      }}
      onBoardReferenceOpenChange={setBoardReferenceOpen}
      onEntryPointChange={handleEntryPointChange}
      onGraphViewScopeChange={handleGraphViewScopeChange}
      onHoverOccurrenceChange={setHoveredOccurrenceId}
      onRenderTuningChange={(partialTuning) =>
        setRenderTuning((currentTuning) =>
          clampViewerRenderTuning({
            ...currentTuning,
            ...partialTuning
          })
        )
      }
      onResetRenderTuning={() => setRenderTuning(DEFAULT_VIEWER_RENDER_TUNING)}
      onFocusOccurrenceChange={handleFocusOccurrenceChange}
      onNeighborhoodRadiusChange={handleNeighborhoodRadiusChange}
      orbitResetKey={orbitResetKey}
      renderTuning={renderTuning}
      runtimeConfig={runtimeConfig}
      runtimeSnapshot={deferredRuntimeSnapshot}
      sceneBootstrap={runtimeBootstrap.sceneBootstrap}
      neighborhoodRadius={neighborhoodRadius}
      totalGraphEdgeCount={totalGraphEdgeCount}
      totalGraphOccurrenceCount={totalGraphOccurrenceCount}
      transpositionSurface={transpositionSurface}
    />
  );
}

function quantizeCameraOrbit(orbit: CameraOrbitPreset): CameraOrbitPreset {
  const normalizedOrbit = normalizeCameraOrbitState(orbit);

  return {
    azimuth: quantizeNumber(normalizedOrbit.azimuth, 0.22),
    elevation: quantizeNumber(normalizedOrbit.elevation, 0.18)
  };
}

function quantizeNumber(value: number, step: number) {
  return Math.round(value / step) * step;
}
