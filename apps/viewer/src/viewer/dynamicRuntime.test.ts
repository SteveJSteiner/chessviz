import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_POSITION } from 'chess.js';
import {
  createDynamicRuntimeSource,
  createViewerRuntimeStore,
  resolveDynamicRuntimeOptions
} from './dynamicRuntime.ts';
import { loadRuntimeArtifactBundleFromImportMetaUrl } from './runtimeArtifactFiles.ts';

const runtimeArtifactBundle = loadRuntimeArtifactBundleFromImportMetaUrl(
  import.meta.url
);

test('resolves dynamic runtime options from URL search parameters', () => {
  const options = resolveDynamicRuntimeOptions(
    new URLSearchParams({
      fen: DEFAULT_POSITION,
      depth: '3',
      branch: '12',
      path: 'e2e4,e7e5,g1f3'
    })
  );

  assert.equal(options.maxDepth, 3);
  assert.equal(options.maxBranching, 12);
  assert.deepEqual(options.pathMoves, ['e2e4', 'e7e5', 'g1f3']);
  assert.match(options.fen, / 0 1$/);
});

test('builds a browser-generated legal-move graph from a seed FEN', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const { builderBootstrapManifest, viewerSceneManifest } = runtimeSource.runtimeBootstrap;

  assert.equal(builderBootstrapManifest.rootOccurrenceIds.length, 1);
  assert.equal(builderBootstrapManifest.occurrences.length, 21);
  assert.equal(builderBootstrapManifest.edges.length, 20);
  assert.equal(builderBootstrapManifest.transitions.length, 20);
  assert.equal(viewerSceneManifest.runtime.initialFocusOccurrenceId, builderBootstrapManifest.rootOccurrenceIds[0]);
  assert.equal(runtimeSource.navigationEntryPoints.length, 1);
  assert.equal(runtimeSource.navigationEntryPoints[0]?.label, 'Dynamic');
});

test('canonicalizes full FEN input to a renderable state-key graph', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: 'r3k2r/ppp2ppp/2n5/3pP3/3P4/2N5/PPP2PPP/R3K2R b KQkq d3 14 23',
      maxDepth: 1,
      maxBranching: 8,
      pathMoves: []
    }
  );
  const rootOccurrence = runtimeSource.runtimeBootstrap.builderBootstrapManifest.occurrences[0];

  assert.ok(rootOccurrence);
  assert.equal(rootOccurrence?.stateKey, 'r3k2r/ppp2ppp/2n5/3pP3/3P4/2N5/PPP2PPP/R3K2R b KQkq -');
});

test('expands frontier occurrences in place without changing graph identity', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const beforeManifest = runtimeStore.getBuilderBootstrapManifest();
  const viewState = resolveDynamicViewState(runtimeSource);
  const refinementBudget =
    runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget;
  const frontierOccurrence = beforeManifest.occurrences.find(
    (occurrence) =>
      occurrence.ply === 1 &&
      occurrence.terminal === null &&
      !beforeManifest.transitions.some(
        (transition) => transition.sourceOccurrenceId === occurrence.occurrenceId
      )
  );

  assert.ok(frontierOccurrence);

  if (!frontierOccurrence) {
    throw new Error('expected a non-terminal frontier occurrence to expand');
  }

  runtimeStore.materializeView(frontierOccurrence.occurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 1,
    refinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });

  const afterManifest = runtimeStore.getBuilderBootstrapManifest();

  assert.equal(afterManifest.graphObjectId, beforeManifest.graphObjectId);
  assert.ok(afterManifest.occurrences.length > beforeManifest.occurrences.length);
  assert.ok(afterManifest.edges.length > beforeManifest.edges.length);
  assert.equal(
    afterManifest.occurrences.length - beforeManifest.occurrences.length,
    afterManifest.edges.length - beforeManifest.edges.length
  );

  const expandedSnapshot = runtimeStore.inspectNeighborhood(
    frontierOccurrence.occurrenceId,
    {
      radius: 1,
      refinementBudget: runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget
    }
  );

  assert.ok(
    expandedSnapshot.edges.some(
      (edge) => edge.sourceOccurrenceId === frontierOccurrence.occurrenceId
    )
  );
  assert.ok(
    expandedSnapshot.occurrences.some(
      (occurrence) => occurrence.ply === frontierOccurrence.ply + 1
    )
  );

  const stabilizedOccurrenceCount = afterManifest.occurrences.length;
  const stabilizedEdgeCount = afterManifest.edges.length;

  runtimeStore.materializeView(frontierOccurrence.occurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 1,
    refinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });

  const repeatedManifest = runtimeStore.getBuilderBootstrapManifest();

  assert.equal(repeatedManifest.occurrences.length, stabilizedOccurrenceCount);
  assert.equal(repeatedManifest.edges.length, stabilizedEdgeCount);
});

test('materializes local neighborhood demand from the current view without explicit click expansion', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const rootOccurrenceId = runtimeStore.getBuilderBootstrapManifest().rootOccurrenceIds[0];
  const beforeManifest = runtimeStore.getBuilderBootstrapManifest();
  const viewState = resolveDynamicViewState(runtimeSource);

  assert.ok(rootOccurrenceId);

  if (!rootOccurrenceId) {
    throw new Error('expected a dynamic root occurrence');
  }

  const runtimeSnapshot = runtimeStore.materializeView(rootOccurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 2,
    refinementBudget: runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });
  const afterManifest = runtimeStore.getBuilderBootstrapManifest();

  assert.ok(afterManifest.occurrences.length > beforeManifest.occurrences.length);
  assert.ok(runtimeSnapshot.occurrences.some((occurrence) => occurrence.ply === 2));
  assert.equal(runtimeSnapshot.renderDemand.scope, 'local-neighborhood');
});

test('retargeting focus expands a pursued line without changing neighborhood settings', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const beforeManifest = runtimeStore.getBuilderBootstrapManifest();
  const viewState = resolveDynamicViewState(runtimeSource);
  const focusOccurrence = beforeManifest.occurrences.find(
    (occurrence) =>
      occurrence.ply === 1 &&
      occurrence.terminal === null &&
      !beforeManifest.transitions.some(
        (transition) => transition.sourceOccurrenceId === occurrence.occurrenceId
      )
  );

  assert.ok(focusOccurrence);

  if (!focusOccurrence) {
    throw new Error('expected a frontier occurrence that can become the new focus');
  }

  const runtimeSnapshot = runtimeStore.materializeView(focusOccurrence.occurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 1,
    refinementBudget: runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });
  const afterManifest = runtimeStore.getBuilderBootstrapManifest();

  assert.ok(afterManifest.occurrences.length > beforeManifest.occurrences.length);
  assert.ok(
    runtimeSnapshot.occurrences.some(
      (occurrence) =>
        occurrence.distance === 1 && occurrence.ply === focusOccurrence.ply + 1
    )
  );
});

test('continues frontier expansion past the initial neighborhood-radius ceiling', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 2,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const initialMaxNeighborhoodRadius =
    runtimeStore.getViewerSceneManifest().runtime.maxNeighborhoodRadius;
  let focusOccurrence = runtimeStore.getBuilderBootstrapManifest().occurrences.find(
    (occurrence) =>
      occurrence.ply === 2 &&
      occurrence.terminal === null &&
      !runtimeStore
        .getBuilderBootstrapManifest()
        .transitions.some(
          (transition) => transition.sourceOccurrenceId === occurrence.occurrenceId
        )
  );

  assert.ok(focusOccurrence);

  const viewState = resolveDynamicViewState(runtimeSource);
  const refinementBudget =
    runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget;

  for (let expansionIndex = 0; expansionIndex < 3; expansionIndex += 1) {
    if (!focusOccurrence) {
      throw new Error('expected an expandable frontier occurrence while deepening the line');
    }

    const beforeIterationManifest = runtimeStore.getBuilderBootstrapManifest();

    runtimeStore.materializeView(focusOccurrence.occurrenceId, {
      scope: 'local-neighborhood',
      neighborhoodRadius: 1,
      refinementBudget,
      cameraDistance: viewState.cameraDistance,
      cameraOrbit: viewState.cameraOrbit
    });

    const manifest = runtimeStore.getBuilderBootstrapManifest();

    assert.ok(manifest.occurrences.length > beforeIterationManifest.occurrences.length);
    const nextFocusOccurrenceId = manifest.transitions
      .filter((transition) => transition.sourceOccurrenceId === focusOccurrence?.occurrenceId)
      .map((transition) => transition.targetOccurrenceId)
      .find((occurrenceId) => {
        const occurrence = manifest.occurrences.find(
          (candidate) => candidate.occurrenceId === occurrenceId
        );

        return occurrence?.terminal === null;
      });

    focusOccurrence = nextFocusOccurrenceId
      ? manifest.occurrences.find(
          (occurrence) => occurrence.occurrenceId === nextFocusOccurrenceId
        )
      : undefined;
  }

  assert.ok(
    runtimeStore
      .getBuilderBootstrapManifest()
      .occurrences.some((occurrence) => occurrence.ply > initialMaxNeighborhoodRadius)
  );
});

test('keeps existing embedding stable while additive expansion fans new children around the pursued line', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 2,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const beforeManifest = runtimeStore.getBuilderBootstrapManifest();
  const focusOccurrenceId = followDynamicPath(beforeManifest, ['e2e4', 'e7e5']);
  const beforeCoordinates = new Map(
    beforeManifest.occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence.embedding.coordinate
    ])
  );
  const viewState = resolveDynamicViewState(runtimeSource);
  const refinementBudget =
    runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget;

  runtimeStore.materializeView(focusOccurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 1,
    refinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });

  const afterManifest = runtimeStore.getBuilderBootstrapManifest();

  assert.ok(afterManifest.occurrences.length > beforeManifest.occurrences.length);

  for (const occurrence of beforeManifest.occurrences) {
    const afterOccurrence = afterManifest.occurrences.find(
      (candidate) => candidate.occurrenceId === occurrence.occurrenceId
    );

    assert.deepEqual(afterOccurrence?.embedding.coordinate, beforeCoordinates.get(occurrence.occurrenceId));
  }

  const childOccurrences = afterManifest.transitions
    .filter((transition) => transition.sourceOccurrenceId === focusOccurrenceId)
    .map((transition) =>
      afterManifest.occurrences.find(
        (occurrence) => occurrence.occurrenceId === transition.targetOccurrenceId
      )
    )
    .filter((occurrence) => occurrence !== undefined);

  assert.ok(childOccurrences.length > 1);
  assert.ok(
    resolveAngularSpan(
      childOccurrences.map((occurrence) => occurrence.embedding.azimuth)
    ) > 0.6
  );
});

test('matches URL path pre-expansion with view-driven materialization on the same object', () => {
  const pathMoves = ['e2e4', 'e7e5', 'g1f3', 'b8c6'];
  const preexpandedSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 32,
      pathMoves
    }
  );
  const interactiveSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 32,
      pathMoves: []
    }
  );
  const interactiveStore = createViewerRuntimeStore(interactiveSource);
  const viewState = resolveDynamicViewState(interactiveSource);
  let currentOccurrenceId =
    interactiveStore.getBuilderBootstrapManifest().rootOccurrenceIds[0];

  assert.ok(currentOccurrenceId);

  if (!currentOccurrenceId) {
    throw new Error('expected a dynamic root occurrence');
  }

  const refinementBudget =
    interactiveStore.getViewerSceneManifest().runtime.defaultRefinementBudget;

  for (const moveUci of pathMoves) {
    let transition = findTransition(
      interactiveStore.getBuilderBootstrapManifest(),
      currentOccurrenceId,
      moveUci
    );

    if (!transition) {
      interactiveStore.materializeView(currentOccurrenceId, {
        scope: 'local-neighborhood',
        neighborhoodRadius: 1,
        refinementBudget,
        cameraDistance: viewState.cameraDistance,
        cameraOrbit: viewState.cameraOrbit
      });
      transition = findTransition(
        interactiveStore.getBuilderBootstrapManifest(),
        currentOccurrenceId,
        moveUci
      );
    }

    assert.ok(transition);

    if (!transition) {
      throw new Error(`expected dynamic path move ${moveUci} to materialize`);
    }

    currentOccurrenceId = transition.targetOccurrenceId;
  }

  const preexpandedManifest = preexpandedSource.runtimeBootstrap.builderBootstrapManifest;
  const interactiveManifest = interactiveStore.getBuilderBootstrapManifest();

  assert.equal(preexpandedManifest.graphObjectId, interactiveManifest.graphObjectId);
  assert.equal(
    preexpandedSource.runtimeBootstrap.initialFocusOccurrenceId,
    currentOccurrenceId
  );
  assert.deepEqual(
    preexpandedManifest.occurrences.map((occurrence) => occurrence.occurrenceId).sort(),
    interactiveManifest.occurrences.map((occurrence) => occurrence.occurrenceId).sort()
  );
  assert.deepEqual(
    collectTransitionKeys(preexpandedManifest),
    collectTransitionKeys(interactiveManifest)
  );
});

test('caps whole-object render demand and assigns low-detail residency tiers', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 2,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const viewState = resolveDynamicViewState(runtimeSource);
  const rootOccurrenceId = runtimeStore.getBuilderBootstrapManifest().occurrences.find(
    (occurrence) => occurrence.ply === 1
  )?.occurrenceId;

  assert.ok(rootOccurrenceId);

  if (!rootOccurrenceId) {
    throw new Error('expected a dynamic root occurrence');
  }

  const runtimeSnapshot = runtimeStore.inspectView(rootOccurrenceId, {
    scope: 'whole-object',
    neighborhoodRadius: 2,
    refinementBudget: 3,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });

  assert.ok(
    runtimeSnapshot.renderDemand.visibleOccurrenceCount <=
      runtimeSnapshot.renderDemand.policy.visibleLowDetailOccurrenceTarget
  );
  assert.ok(
    runtimeSnapshot.edges.length <= runtimeSnapshot.renderDemand.policy.visibleEdgeTarget
  );
  assert.ok(runtimeSnapshot.renderDemand.coldOccurrenceCount > 0);
  assert.ok(
    runtimeSnapshot.occurrences.some((occurrence) => occurrence.lod === 'distant')
  );
});

test('reorders local frontier demand when the camera orbits to a different side', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 20,
      pathMoves: []
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const rootOccurrenceId = runtimeStore.getBuilderBootstrapManifest().rootOccurrenceIds[0];
  const viewState = resolveDynamicViewState(runtimeSource);

  assert.ok(rootOccurrenceId);

  if (!rootOccurrenceId) {
    throw new Error('expected a dynamic root occurrence');
  }

  const forwardView = runtimeStore.inspectView(rootOccurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 2,
    refinementBudget: runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: viewState.cameraOrbit
  });
  const oppositeView = runtimeStore.inspectView(rootOccurrenceId, {
    scope: 'local-neighborhood',
    neighborhoodRadius: 2,
    refinementBudget: runtimeStore.getViewerSceneManifest().runtime.defaultRefinementBudget,
    cameraDistance: viewState.cameraDistance,
    cameraOrbit: {
      azimuth: viewState.cameraOrbit.azimuth + Math.PI,
      elevation: viewState.cameraOrbit.elevation
    }
  });

  assert.notEqual(
    forwardView.renderDemand.frontierExpansionOccurrenceIds[0],
    oppositeView.renderDemand.frontierExpansionOccurrenceIds[0]
  );
});

function followDynamicPath(
  manifest: ReturnType<typeof createDynamicRuntimeSource>['runtimeBootstrap']['builderBootstrapManifest'],
  pathMoves: string[]
) {
  const rootOccurrenceId = manifest.rootOccurrenceIds[0];

  assert.ok(rootOccurrenceId);

  if (!rootOccurrenceId) {
    throw new Error('expected a dynamic root occurrence');
  }

  let currentOccurrenceId = rootOccurrenceId;

  for (const moveUci of pathMoves) {
    const transition = findTransition(manifest, currentOccurrenceId, moveUci);

    assert.ok(transition);

    if (!transition) {
      throw new Error(`expected dynamic path move ${moveUci} to exist`);
    }

    currentOccurrenceId = transition.targetOccurrenceId;
  }

  return currentOccurrenceId;
}

function findTransition(
  manifest: ReturnType<typeof createDynamicRuntimeSource>['runtimeBootstrap']['builderBootstrapManifest'],
  sourceOccurrenceId: string,
  moveUci: string
) {
  return manifest.transitions.find(
    (transition) =>
      transition.sourceOccurrenceId === sourceOccurrenceId &&
      transition.moveUci === moveUci
  );
}

function collectTransitionKeys(
  manifest: ReturnType<typeof createDynamicRuntimeSource>['runtimeBootstrap']['builderBootstrapManifest']
) {
  return manifest.transitions
    .map(
      (transition) =>
        `${transition.sourceOccurrenceId}:${transition.moveUci}:${transition.targetOccurrenceId}`
    )
    .sort();
}

function resolveAngularSpan(angles: number[]) {
  if (angles.length <= 1) {
    return 0;
  }

  const normalizedAngles = angles.map(normalizeAngle).sort((left, right) => left - right);
  const wrappedAngles = [
    ...normalizedAngles,
    normalizedAngles[0]! + (Math.PI * 2)
  ];
  let largestGap = 0;

  for (let index = 1; index < wrappedAngles.length; index += 1) {
    largestGap = Math.max(
      largestGap,
      wrappedAngles[index]! - wrappedAngles[index - 1]!
    );
  }

  return (Math.PI * 2) - largestGap;
}

function normalizeAngle(angle: number) {
  let normalized = angle;

  while (normalized <= -Math.PI) {
    normalized += Math.PI * 2;
  }

  while (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }

  return normalized;
}

function resolveDynamicViewState(
  runtimeSource: ReturnType<typeof createDynamicRuntimeSource>
) {
  return {
    cameraDistance: runtimeSource.navigationEntryPoints[0]?.distance ?? 4.2,
    cameraOrbit: runtimeSource.navigationEntryPoints[0]?.orbit ?? {
      azimuth: 0,
      elevation: 0
    }
  };
}