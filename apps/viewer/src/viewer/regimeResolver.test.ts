import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeRegimeResolver } from './regimeResolver.ts';
import {
  loadRuntimeArtifactBundleFromImportMetaUrl
} from './runtimeArtifactFiles.ts';

const runtimeArtifactBundle = loadRuntimeArtifactBundleFromImportMetaUrl(
  import.meta.url
);

test('resolves the declared opening anchor through the published opening table shards', () => {
  const resolver = createRuntimeRegimeResolver(runtimeArtifactBundle);
  const resolvedOccurrence = resolver.resolveOccurrenceId('occ-27e2be7f2bf706c6');

  assert.equal(resolvedOccurrence.resolvedRegimeId, 'opening-table');
  assert.equal(resolvedOccurrence.source.kind, 'opening-table');

  if (resolvedOccurrence.source.kind !== 'opening-table') {
    throw new Error('expected opening-table resolution source');
  }

  assert.equal(
    resolvedOccurrence.source.entry.positionKey,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
  );
  assert.equal(
    resolvedOccurrence.source.manifestPath,
    'builder/opening-table/manifest.json'
  );
  assert.equal(resolvedOccurrence.source.shardId, 'ply-000-003');
});


test('resolves middlegame occurrences through the procedural fallback policy', () => {
  const resolver = createRuntimeRegimeResolver(runtimeArtifactBundle);
  const resolvedOccurrence = resolver.resolveOccurrenceId('occ-25c32c2bc0227f68');

  assert.equal(resolvedOccurrence.resolvedRegimeId, 'middlegame-procedural');
  assert.equal(resolvedOccurrence.source.kind, 'middlegame-procedural');

  if (resolvedOccurrence.source.kind !== 'middlegame-procedural') {
    throw new Error('expected middlegame procedural resolution source');
  }

  assert.equal(
    resolvedOccurrence.source.policy.policyId,
    'n11e.adjacency-neighborhood.v1'
  );
  assert.equal(resolvedOccurrence.source.defaultNeighborhoodRadius, 2);
  assert.equal(resolvedOccurrence.source.defaultRefinementBudget, 8);
});

test('resolves the declared endgame anchor through the published endgame table shard', () => {
  const resolver = createRuntimeRegimeResolver(runtimeArtifactBundle);
  const resolvedOccurrence = resolver.resolveOccurrenceId('occ-50c5276a269f4c53');

  assert.equal(resolvedOccurrence.resolvedRegimeId, 'endgame-table');
  assert.equal(resolvedOccurrence.source.kind, 'endgame-table');

  if (resolvedOccurrence.source.kind !== 'endgame-table') {
    throw new Error('expected endgame-table resolution source');
  }

  assert.equal(
    resolvedOccurrence.source.entry.positionKey,
    'rn3b2/ppp1pp2/3k3p/8/7P/3PP3/PP3PK1/1R6 b - -'
  );
  assert.equal(
    resolvedOccurrence.source.entry.terminalPayload.outcomeClass,
    'white-win'
  );
  assert.equal(
    resolvedOccurrence.source.manifestPath,
    'builder/endgame-table/manifest.json'
  );
});

test('fails fast when a required published table shard payload is missing', () => {
  assert.throws(
    () =>
      createRuntimeRegimeResolver({
        ...runtimeArtifactBundle,
        endgameTableShardsByRelativePath: {}
      }),
    /table manifest shard is missing payload/
  );
});

test('fails fast when middlegame fallback is allowed to preempt published table resolution', () => {
  assert.throws(
    () =>
      createRuntimeRegimeResolver({
        ...runtimeArtifactBundle,
        webCorpusManifest: {
          ...runtimeArtifactBundle.webCorpusManifest,
          resolverInputs: runtimeArtifactBundle.webCorpusManifest.resolverInputs.map(
            (resolverInput) =>
              resolverInput.regimeId === 'middlegame-procedural'
                ? {
                    ...resolverInput,
                    priority: 5
                  }
                : resolverInput
          )
        }
      }),
    /middlegame procedural fallback must be the terminal runtime resolver input/
  );
});