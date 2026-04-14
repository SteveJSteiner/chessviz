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
      branch: '12'
    })
  );

  assert.equal(options.maxDepth, 3);
  assert.equal(options.maxBranching, 12);
  assert.match(options.fen, / 0 1$/);
});

test('builds a browser-generated legal-move graph from a seed FEN', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 1,
      maxBranching: 20
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
      maxBranching: 8
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
      maxBranching: 20
    }
  );
  const runtimeStore = createViewerRuntimeStore(runtimeSource);
  const beforeManifest = runtimeStore.getBuilderBootstrapManifest();
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

  const expansion = runtimeStore.expandFocusOccurrence(frontierOccurrence.occurrenceId);

  assert.equal(expansion.didExpand, true);
  assert.ok(expansion.occurrenceDelta > 0);
  assert.equal(expansion.edgeDelta, expansion.occurrenceDelta);

  const afterManifest = runtimeStore.getBuilderBootstrapManifest();

  assert.equal(afterManifest.graphObjectId, beforeManifest.graphObjectId);
  assert.ok(afterManifest.occurrences.length > beforeManifest.occurrences.length);
  assert.ok(afterManifest.edges.length > beforeManifest.edges.length);

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

  const repeatedExpansion = runtimeStore.expandFocusOccurrence(
    frontierOccurrence.occurrenceId
  );

  assert.equal(repeatedExpansion.didExpand, false);
});

test('continues frontier expansion past the initial neighborhood-radius ceiling', () => {
  const runtimeSource = createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    {
      fen: DEFAULT_POSITION,
      maxDepth: 2,
      maxBranching: 20
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

  for (let expansionIndex = 0; expansionIndex < 3; expansionIndex += 1) {
    if (!focusOccurrence) {
      throw new Error('expected an expandable frontier occurrence while deepening the line');
    }

    const expansion = runtimeStore.expandFocusOccurrence(focusOccurrence.occurrenceId);

    assert.equal(expansion.didExpand, true);

    const manifest = runtimeStore.getBuilderBootstrapManifest();
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