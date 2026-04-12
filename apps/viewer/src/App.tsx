import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { createSceneBootstrap } from './viewer/bootstrap';
import {
  createCameraGrammarState,
  resolveCameraGrammarRefinementBudget
} from './viewer/cameraGrammar';
import { builderBootstrapManifest, viewerSceneManifest } from './viewer/fixtureArtifacts';
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
import { createRuntimeExplorationKernel } from './viewer/runtimeKernel';
import { ViewerShell } from './viewer/ViewerShell';
import { workspaceBoundary } from './viewer/workspaceBoundaries';

export default function App() {
  const [runtimeKernel] = useState(() =>
    createRuntimeExplorationKernel(builderBootstrapManifest, viewerSceneManifest)
  );
  const [navigationEntryPoints] = useState(() =>
    createAnchoredNavigationEntryPoints(
      builderBootstrapManifest,
      viewerSceneManifest
    )
  );
  const [activeEntryPointId, setActiveEntryPointId] = useState(() =>
    resolveInitialNavigationEntryPointId(
      navigationEntryPoints,
      viewerSceneManifest.runtime.initialFocusOccurrenceId
    )
  );
  const activeNavigationEntryPoint = resolveNavigationEntryPoint(
    navigationEntryPoints,
    activeEntryPointId
  );
  const [focusOccurrenceId, setFocusOccurrenceId] = useState(
    activeNavigationEntryPoint.focusOccurrenceId
  );
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
    viewerSceneManifest.runtime
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() =>
    runtimeKernel.inspectNeighborhood(focusOccurrenceId, {
      radius: neighborhoodRadius,
      refinementBudget
    })
  );
  const deferredRuntimeSnapshot = useDeferredValue(runtimeSnapshot);

  useEffect(() => {
    startTransition(() => {
      setRuntimeSnapshot(
        runtimeKernel.inspectNeighborhood(focusOccurrenceId, {
          radius: neighborhoodRadius,
          refinementBudget
        })
      );
    });
  }, [focusOccurrenceId, neighborhoodRadius, refinementBudget, runtimeKernel]);

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
    runtimeConfig: viewerSceneManifest.runtime,
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
      entryPoints={navigationEntryPoints}
      navigationEntryPoint={activeNavigationEntryPoint}
      onCameraDistanceChange={(distance) =>
        setCameraDistance(clampLiveViewDistance(distance))
      }
      onBoardReferenceOpenChange={setBoardReferenceOpen}
      onEntryPointChange={handleEntryPointChange}
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
      runtimeConfig={viewerSceneManifest.runtime}
      runtimeSnapshot={deferredRuntimeSnapshot}
      sceneBootstrap={createSceneBootstrap(viewerSceneManifest)}
      transitionSurface={transitionSurface}
      workspaceBoundary={workspaceBoundary}
      neighborhoodRadius={neighborhoodRadius}
    />
  );
}
