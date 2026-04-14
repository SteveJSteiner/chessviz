import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_POSITION } from 'chess.js';
import { createDynamicRuntimeSource, resolveDynamicRuntimeOptions } from './dynamicRuntime.ts';
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