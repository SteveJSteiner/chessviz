import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { materializeRuntimeBootstrap } from './viewer/bootstrap';
import {
  createCameraGrammarState,
  resolveCameraGrammarRefinementBudget
} from './viewer/cameraGrammar';
import {
  clampLiveViewDistance
} from './viewer/labelPolicy';
import {
  createAnchoredNavigationEntryPoints,
  resolveInitialNavigationEntryPointId,
  resolveNavigationEntryPoint
} from './viewer/navigation';
import {
  DEFAULT_VIEWER_RENDER_TUNING,
  clampViewerRenderTuning
} from './viewer/renderTuning';
import { runtimeArtifactBoundary } from './viewer/runtimeArtifactBoundary';
import { runtimeArtifactBundle } from './viewer/runtimeArtifacts';
import {
  createRuntimeExplorationKernel,
  type RuntimeExplorationKernel
} from './viewer/runtimeKernel';
import { ViewerShell } from './viewer/ViewerShell';

export type GraphViewScope = 'local-neighborhood' | 'whole-object';

export default function App() {
  const [runtimeBootstrap] = useState(() =>
    materializeRuntimeBootstrap(runtimeArtifactBundle)
  );
  const [runtimeKernel] = useState(() =>
    createRuntimeExplorationKernel(
      runtimeBootstrap.builderBootstrapManifest,
      runtimeBootstrap.viewerSceneManifest
    )
  );
  const [navigationEntryPoints] = useState(() =>
    createAnchoredNavigationEntryPoints(runtimeBootstrap)
  );
  const [activeEntryPointId, setActiveEntryPointId] = useState(() =>
    resolveInitialNavigationEntryPointId(
      navigationEntryPoints,
      runtimeBootstrap.initialFocusOccurrenceId
    )
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

  const transitionSurface = runtimeKernel.inspectTransitionSurface(
    deferredRuntimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const carrierSurface = runtimeKernel.inspectCarrierSurface(
    deferredRuntimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    {
      refinementBudget: deferredRuntimeSnapshot.refinementBudget
    }
  );
  const focusLine = runtimeKernel.describeOccurrenceLine(
    deferredRuntimeSnapshot.focusOccurrenceId
  );
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
  const focusLinesByOccurrenceId = new Map(
    focusOptions.map((occurrence) => [
      occurrence.occurrenceId,
      runtimeKernel.describeOccurrenceLine(occurrence.occurrenceId)
    ])
  );
  const cameraGrammar = createCameraGrammarState({
    cameraDistance,
    runtimeConfig: runtimeBootstrap.viewerSceneManifest.runtime,
    runtimeSnapshot: deferredRuntimeSnapshot
  });

  const handleEntryPointChange = (entryId: typeof activeEntryPointId) => {
    const entryPoint = resolveNavigationEntryPoint(navigationEntryPoints, entryId);

    setActiveEntryPointId(entryId);
    setFocusOccurrenceId(entryPoint.focusOccurrenceId);
    setNeighborhoodRadius(entryPoint.neighborhoodRadius);
    setCameraDistance(entryPoint.distance);
    setBoardReferenceOpen(true);
    setOrbitResetKey((currentKey) => currentKey + 1);
  };

  const handleFocusOccurrenceChange = (occurrenceId: string) => {
    setFocusOccurrenceId(occurrenceId);
    setBoardReferenceOpen(true);
  };

  return (
    <ViewerShell
      activeEntryPointId={activeEntryPointId}
      boardReferenceOpen={boardReferenceOpen}
      cameraGrammar={cameraGrammar}
      carrierSurface={carrierSurface}
      cameraDistance={cameraDistance}
      focusLine={focusLine}
      focusLinesByOccurrenceId={focusLinesByOccurrenceId}
      focusOptions={focusOptions}
      graphViewScope={graphViewScope}
      entryPoints={navigationEntryPoints}
      meetsN12Scale={meetsN12Scale}
      navigationEntryPoint={activeNavigationEntryPoint}
      onCameraDistanceChange={(distance) =>
        setCameraDistance(clampLiveViewDistance(distance))
      }
      onBoardReferenceOpenChange={setBoardReferenceOpen}
      onEntryPointChange={handleEntryPointChange}
      onGraphViewScopeChange={setGraphViewScope}
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
      onNeighborhoodRadiusChange={setNeighborhoodRadius}
      orbitResetKey={orbitResetKey}
      renderTuning={renderTuning}
      runtimeConfig={runtimeBootstrap.viewerSceneManifest.runtime}
      runtimeSnapshot={deferredRuntimeSnapshot}
      sceneBootstrap={runtimeBootstrap.sceneBootstrap}
      transitionSurface={transitionSurface}
      runtimeArtifactBoundary={runtimeArtifactBoundary}
      neighborhoodRadius={neighborhoodRadius}
      totalGraphEdgeCount={totalGraphEdgeCount}
      totalGraphOccurrenceCount={totalGraphOccurrenceCount}
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
