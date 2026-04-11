import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { createSceneBootstrap } from './viewer/bootstrap';
import { builderBootstrapManifest, viewerSceneManifest } from './viewer/fixtureArtifacts';
import { createRuntimeNavigationEntryPoint } from './viewer/navigation';
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
  const focusLinesByOccurrenceId = new Map(
    runtimeKernel.getFocusOptions().map((occurrence) => [
      occurrence.occurrenceId,
      runtimeKernel.describeOccurrenceLine(occurrence.occurrenceId)
    ])
  );

  return (
    <ViewerShell
      carrierSurface={carrierSurface}
      focusLine={focusLine}
      focusLinesByOccurrenceId={focusLinesByOccurrenceId}
      focusOptions={runtimeKernel.getFocusOptions()}
      navigationEntryPoint={createRuntimeNavigationEntryPoint(
        deferredRuntimeSnapshot
      )}
      onFocusOccurrenceChange={setFocusOccurrenceId}
      onNeighborhoodRadiusChange={setNeighborhoodRadius}
      onRefinementBudgetChange={setRefinementBudget}
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
