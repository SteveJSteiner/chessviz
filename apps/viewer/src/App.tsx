import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { createSceneBootstrap } from './viewer/bootstrap';
import { builderBootstrapManifest, viewerSceneManifest } from './viewer/fixtureArtifacts';
import {
  LIVE_VIEW_DISTANCE,
  clampLiveViewDistance,
  resolveLabelZoomBand
} from './viewer/labelPolicy';
import { createRuntimeNavigationEntryPoint } from './viewer/navigation';
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
  const [focusOccurrenceId, setFocusOccurrenceId] = useState(
    viewerSceneManifest.runtime.initialFocusOccurrenceId
  );
  const [neighborhoodRadius, setNeighborhoodRadius] = useState(
    viewerSceneManifest.runtime.defaultNeighborhoodRadius
  );
  const [refinementBudget, setRefinementBudget] = useState(
    viewerSceneManifest.runtime.defaultRefinementBudget
  );
  const [cameraDistance, setCameraDistance] = useState<number>(
    LIVE_VIEW_DISTANCE.default
  );
  const [renderTuning, setRenderTuning] = useState(DEFAULT_VIEWER_RENDER_TUNING);
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

  return (
    <ViewerShell
      carrierSurface={carrierSurface}
      cameraDistance={cameraDistance}
      focusLine={focusLine}
      focusLinesByOccurrenceId={focusLinesByOccurrenceId}
      focusOptions={focusOptions}
      navigationEntryPoint={createRuntimeNavigationEntryPoint(
        deferredRuntimeSnapshot,
        cameraDistance
      )}
      labelZoomBand={resolveLabelZoomBand(cameraDistance)}
      onCameraDistanceChange={(distance) =>
        setCameraDistance(clampLiveViewDistance(distance))
      }
      onRenderTuningChange={(partialTuning) =>
        setRenderTuning((currentTuning) =>
          clampViewerRenderTuning({
            ...currentTuning,
            ...partialTuning
          })
        )
      }
      onResetRenderTuning={() => setRenderTuning(DEFAULT_VIEWER_RENDER_TUNING)}
      onFocusOccurrenceChange={setFocusOccurrenceId}
      onNeighborhoodRadiusChange={setNeighborhoodRadius}
      onRefinementBudgetChange={setRefinementBudget}
      renderTuning={renderTuning}
      refinementBudget={refinementBudget}
      runtimeConfig={viewerSceneManifest.runtime}
      runtimeSnapshot={deferredRuntimeSnapshot}
      sceneBootstrap={createSceneBootstrap(viewerSceneManifest)}
      transitionSurface={transitionSurface}
      workspaceBoundary={workspaceBoundary}
      neighborhoodRadius={neighborhoodRadius}
    />
  );
}
