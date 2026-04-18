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
import {
  createViewerRuntimeStore,
  resolveViewerRuntimeSource,
  type ViewerRuntimeStore
} from './viewer/dynamicRuntime';
import { runtimeArtifactBundle } from './viewer/runtimeArtifacts';
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
  const [runtimeStore] = useState(() => createViewerRuntimeStore(runtimeSource));
  const [runtimeRevision, setRuntimeRevision] = useState(0);
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
    inspectRuntimeView({
      focusOccurrenceId,
      graphViewScope,
      neighborhoodRadius,
      refinementBudget,
      runtimeStore
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
        inspectRuntimeView({
          focusOccurrenceId,
          graphViewScope,
          neighborhoodRadius,
          refinementBudget,
          runtimeStore
        })
      );
    });
  }, [
    focusOccurrenceId,
    graphViewScope,
    neighborhoodRadius,
    refinementBudget,
    runtimeRevision,
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
  const currentFocusOccurrence = runtimeStore.resolveOccurrence(
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
    setBoardReferenceOpen(true);
    setOrbitResetKey((currentKey) => currentKey + 1);
  };

  const handleFocusOccurrenceChange = (occurrenceId: string) => {
    const expansion = runtimeStore.expandFocusOccurrence(occurrenceId);

    if (expansion.didExpand) {
      setRuntimeRevision((currentRevision) => currentRevision + 1);
    }

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

function inspectRuntimeView({
  focusOccurrenceId,
  graphViewScope,
  neighborhoodRadius,
  refinementBudget,
  runtimeStore
}: {
  focusOccurrenceId: string;
  graphViewScope: GraphViewScope;
  neighborhoodRadius: number;
  refinementBudget: number;
  runtimeStore: ViewerRuntimeStore;
}) {
  if (graphViewScope === 'whole-object') {
    return runtimeStore.inspectWholeGraph(focusOccurrenceId, {
      refinementBudget
    });
  }

  return runtimeStore.inspectNeighborhood(focusOccurrenceId, {
    radius: neighborhoodRadius,
    refinementBudget
  });
}
