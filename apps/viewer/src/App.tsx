import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  createCameraGrammarState,
  resolveCameraGrammarRefinementBudget
} from './viewer/cameraGrammar';
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
import { resolveViewerRuntimeSource } from './viewer/dynamicRuntime';
import { runtimeArtifactBundle } from './viewer/runtimeArtifacts';
import {
  createRuntimeExplorationKernel,
  type RuntimeExplorationKernel
} from './viewer/runtimeKernel';
import { buildRuntimeTranspositionSurface } from './viewer/transpositionSurface';
import { ViewerShell } from './viewer/ViewerShell';

export type GraphViewScope = 'local-neighborhood' | 'whole-object';

export default function App() {
  const [runtimeSource] = useState(() =>
    resolveViewerRuntimeSource(
      runtimeArtifactBundle,
      globalThis.location?.search ?? ''
    )
  );
  const { runtimeBootstrap, navigationEntryPoints } = runtimeSource;
  const [runtimeKernel] = useState(() =>
    createRuntimeExplorationKernel(
      runtimeBootstrap.builderBootstrapManifest,
      runtimeBootstrap.viewerSceneManifest
    )
  );
  const [activeEntryPointId, setActiveEntryPointId] = useState(() =>
    runtimeSource.initialEntryPointId
  );
  const activeNavigationEntryPoint = resolveNavigationEntryPoint(
    navigationEntryPoints,
    activeEntryPointId
  );
  const [focusOccurrenceId, setFocusOccurrenceId] = useState(
    activeNavigationEntryPoint.focusOccurrenceId
  );
  const [graphViewScope, setGraphViewScope] =
    useState<GraphViewScope>('local-neighborhood');
  const [neighborhoodRadius, setNeighborhoodRadius] = useState(
    activeNavigationEntryPoint.neighborhoodRadius
  );
  const [cameraDistance, setCameraDistance] = useState<number>(
    activeNavigationEntryPoint.distance
  );
  const [hoveredOccurrenceId, setHoveredOccurrenceId] = useState<string | null>(null);
  const [boardReferenceOpen, setBoardReferenceOpen] = useState(false);
  const [orbitResetKey, setOrbitResetKey] = useState(0);
  const [renderTuning, setRenderTuning] = useState(DEFAULT_VIEWER_RENDER_TUNING);
  const refinementBudget = resolveCameraGrammarRefinementBudget(
    cameraDistance,
    runtimeBootstrap.viewerSceneManifest.runtime
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() =>
    inspectRuntimeView({
      focusOccurrenceId,
      graphViewScope,
      neighborhoodRadius,
      refinementBudget,
      runtimeKernel
    })
  );
  const deferredRuntimeSnapshot = useDeferredValue(runtimeSnapshot);
  const totalGraphOccurrenceCount =
    runtimeBootstrap.builderBootstrapManifest.occurrences.length;
  const totalGraphEdgeCount = runtimeBootstrap.builderBootstrapManifest.edges.length;
  const meetsN12Scale = totalGraphOccurrenceCount >= 1000;

  useEffect(() => {
    startTransition(() => {
      setRuntimeSnapshot(
        inspectRuntimeView({
          focusOccurrenceId,
          graphViewScope,
          neighborhoodRadius,
          refinementBudget,
          runtimeKernel
        })
      );
    });
  }, [
    focusOccurrenceId,
    graphViewScope,
    neighborhoodRadius,
    refinementBudget,
    runtimeKernel
  ]);
  const carrierSurface = runtimeKernel.inspectCarrierSurface(
    deferredRuntimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    {
      refinementBudget: deferredRuntimeSnapshot.refinementBudget
    }
  );
  const transpositionSurface = buildRuntimeTranspositionSurface(
    runtimeBootstrap.builderBootstrapManifest,
    deferredRuntimeSnapshot,
    graphViewScope
  );
  const hoveredOccurrence = hoveredOccurrenceId
    ? runtimeKernel.resolveOccurrence(hoveredOccurrenceId) ?? null
    : null;
  const baseFocusOptions = runtimeKernel.getFocusOptions();
  const currentFocusOccurrence = runtimeKernel.resolveOccurrence(
    deferredRuntimeSnapshot.focusOccurrenceId
  );
  const focusOptions = currentFocusOccurrence
    && !baseFocusOptions.some(
      (occurrence) => occurrence.occurrenceId === currentFocusOccurrence.occurrenceId
    )
    ? [currentFocusOccurrence, ...baseFocusOptions]
    : baseFocusOptions;
  const cameraGrammar = createCameraGrammarState({
    cameraDistance,
    runtimeConfig: runtimeBootstrap.viewerSceneManifest.runtime,
    runtimeSnapshot: deferredRuntimeSnapshot
  });

  const handleEntryPointChange = (entryId: typeof activeEntryPointId) => {
    const entryPoint = resolveNavigationEntryPoint(navigationEntryPoints, entryId);

    setActiveEntryPointId(entryId);
    setFocusOccurrenceId(entryPoint.focusOccurrenceId);
    setHoveredOccurrenceId(null);
    setNeighborhoodRadius(entryPoint.neighborhoodRadius);
    setCameraDistance(entryPoint.distance);
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
      focusOptions={focusOptions}
      graphViewScope={graphViewScope}
      hoveredOccurrence={hoveredOccurrence}
      entryPoints={navigationEntryPoints}
      meetsN12Scale={meetsN12Scale}
      navigationEntryPoint={activeNavigationEntryPoint}
      onCameraDistanceChange={(distance) =>
        setCameraDistance(clampLiveViewDistance(distance))
      }
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
      runtimeConfig={runtimeBootstrap.viewerSceneManifest.runtime}
      runtimeSnapshot={deferredRuntimeSnapshot}
      sceneBootstrap={runtimeBootstrap.sceneBootstrap}
      neighborhoodRadius={neighborhoodRadius}
      totalGraphEdgeCount={totalGraphEdgeCount}
      totalGraphOccurrenceCount={totalGraphOccurrenceCount}
      transpositionSurface={transpositionSurface}
    />
  );
}

function inspectRuntimeView({
  focusOccurrenceId,
  graphViewScope,
  neighborhoodRadius,
  refinementBudget,
  runtimeKernel
}: {
  focusOccurrenceId: string;
  graphViewScope: GraphViewScope;
  neighborhoodRadius: number;
  refinementBudget: number;
  runtimeKernel: RuntimeExplorationKernel;
}) {
  if (graphViewScope === 'whole-object') {
    return runtimeKernel.inspectWholeGraph(focusOccurrenceId, {
      refinementBudget
    });
  }

  return runtimeKernel.inspectNeighborhood(focusOccurrenceId, {
    radius: neighborhoodRadius,
    refinementBudget
  });
}
