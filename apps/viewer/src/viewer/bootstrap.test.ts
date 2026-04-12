import assert from 'node:assert/strict';
import test from 'node:test';
import { materializeRuntimeBootstrap } from './bootstrap.ts';
import {
  loadRuntimeArtifactBundleFromImportMetaUrl
} from './runtimeArtifactFiles.ts';

const runtimeArtifactBundle = loadRuntimeArtifactBundleFromImportMetaUrl(
  import.meta.url
);

test('materializes initial focus and focus candidates from declared anchors plus resolver-backed seeds', () => {
  const runtimeBootstrap = materializeRuntimeBootstrap(runtimeArtifactBundle);

  assert.equal(runtimeBootstrap.initialFocusOccurrenceId, 'occ-25c32c2bc0227f68');
  assert.deepEqual(runtimeBootstrap.focusCandidateOccurrenceIds.slice(0, 3), [
    'occ-27e2be7f2bf706c6',
    'occ-25c32c2bc0227f68',
    'occ-50c5276a269f4c53'
  ]);
  assert.equal(
    runtimeBootstrap.viewerSceneManifest.runtime.initialFocusOccurrenceId,
    runtimeBootstrap.initialFocusOccurrenceId
  );
  assert.deepEqual(
    runtimeBootstrap.resolvedFocusCandidates.slice(0, 3).map(
      (resolvedOccurrence) => resolvedOccurrence.resolvedRegimeId
    ),
    ['opening-table', 'middlegame-procedural', 'endgame-table']
  );
  assert.equal(
    runtimeBootstrap.viewerSceneManifest.runtime.focusCandidateOccurrenceIds.includes(
      'occ-50c5276a269f4c53'
    ),
    true
  );
  assert.notDeepEqual(
    runtimeBootstrap.focusCandidateOccurrenceIds,
    runtimeArtifactBundle.viewerSceneManifest.runtime.focusCandidateOccurrenceIds
  );
});