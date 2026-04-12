import assert from 'node:assert/strict';
import test from 'node:test';
import { materializeRuntimeBootstrap } from './bootstrap.ts';
import {
  createAnchoredNavigationEntryPoints,
  resolveInitialNavigationEntryPointId
} from './navigation.ts';
import {
  loadRuntimeArtifactBundleFromImportMetaUrl
} from './runtimeArtifactFiles.ts';

const runtimeArtifactBundle = loadRuntimeArtifactBundleFromImportMetaUrl(
  import.meta.url
);

test('derives opening, middlegame, and endgame entrypoints from declared regime anchors', () => {
  const runtimeBootstrap = materializeRuntimeBootstrap(runtimeArtifactBundle);
  const entryPoints = createAnchoredNavigationEntryPoints(runtimeBootstrap);

  assert.deepEqual(
    entryPoints.map((entryPoint) => entryPoint.entryId),
    ['opening', 'middlegame', 'endgame']
  );
  assert.equal(entryPoints[0]?.focusOccurrenceId, 'occ-27e2be7f2bf706c6');
  assert.equal(entryPoints[0]?.anchorId, 'entry:opening');
  assert.equal(entryPoints[0]?.anchorPly, 0);
  assert.equal(entryPoints[0]?.regimeId, 'opening-table');
  assert.equal(
    entryPoints[1]?.focusOccurrenceId,
    runtimeBootstrap.initialFocusOccurrenceId
  );
  assert.equal(entryPoints[2]?.focusOccurrenceId, 'occ-50c5276a269f4c53');
  assert.equal(entryPoints[2]?.rootGameId, 'endgame-simplification-lab');
  assert.equal(
    runtimeArtifactBundle.viewerSceneManifest.runtime.focusCandidateOccurrenceIds.includes(
      entryPoints[2]?.focusOccurrenceId ?? ''
    ),
    false
  );
});


test('keeps entrypoint derivation stable when annotation phase labels drift', () => {
  const runtimeBootstrap = materializeRuntimeBootstrap({
    ...runtimeArtifactBundle,
    builderBootstrapManifest: {
      ...runtimeArtifactBundle.builderBootstrapManifest,
      occurrences: runtimeArtifactBundle.builderBootstrapManifest.occurrences.map(
        (occurrence) =>
          occurrence.occurrenceId === 'occ-50c5276a269f4c53'
            ? {
                ...occurrence,
                annotations: {
                  ...occurrence.annotations,
                  phaseLabel: 'opening'
                }
              }
            : occurrence
      )
    }
  });
  const entryPoints = createAnchoredNavigationEntryPoints(runtimeBootstrap);

  assert.equal(entryPoints[2]?.entryId, 'endgame');
  assert.equal(entryPoints[2]?.focusOccurrenceId, 'occ-50c5276a269f4c53');
  assert.equal(entryPoints[2]?.regimeId, 'endgame-table');
});

test('maps the declared initial focus to the middlegame entrypoint', () => {
  const runtimeBootstrap = materializeRuntimeBootstrap(runtimeArtifactBundle);
  const entryPoints = createAnchoredNavigationEntryPoints(runtimeBootstrap);

  assert.equal(
    resolveInitialNavigationEntryPointId(
      entryPoints,
      runtimeBootstrap.initialFocusOccurrenceId
    ),
    'middlegame'
  );
});

test('fails fast when a required declared regime anchor cannot be derived', () => {
  assert.throws(
    () =>
      materializeRuntimeBootstrap({
        ...runtimeArtifactBundle,
        builderBootstrapManifest: {
          ...runtimeArtifactBundle.builderBootstrapManifest,
          anchors: runtimeArtifactBundle.builderBootstrapManifest.anchors.filter(
            (anchor) =>
              !(
                anchor.anchorKind === 'navigation-entry' &&
                anchor.entryId === 'endgame'
              )
          )
        }
      }),
    /declared anchor is missing/
  );
});

test('fails fast when declared anchor metadata fractures entrypoint continuity', () => {
  assert.throws(
    () =>
      materializeRuntimeBootstrap({
        ...runtimeArtifactBundle,
        builderBootstrapManifest: {
          ...runtimeArtifactBundle.builderBootstrapManifest,
          anchors: runtimeArtifactBundle.builderBootstrapManifest.anchors.map((anchor) =>
            anchor.anchorKind === 'navigation-entry' && anchor.entryId === 'opening'
              ? {
                  ...anchor,
                  anchorPly: 2
                }
              : anchor
          )
        }
      }),
    /anchoring continuity/
  );
});