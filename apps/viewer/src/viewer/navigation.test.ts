import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { BuilderBootstrapManifest, ViewerSceneManifest } from './contracts.ts';
import {
  createAnchoredNavigationEntryPoints,
  resolveInitialNavigationEntryPointId
} from './navigation.ts';

const builderBootstrapManifest = JSON.parse(
  readFileSync(
    new URL('../../../../artifacts/builder/bootstrap.json', import.meta.url),
    'utf8'
  )
) as BuilderBootstrapManifest;
const viewerSceneManifest = JSON.parse(
  readFileSync(
    new URL('../../../../artifacts/viewer/scene-manifest.json', import.meta.url),
    'utf8'
  )
) as ViewerSceneManifest;

test('derives opening, middlegame, and endgame entrypoints from declared regime anchors', () => {
  const entryPoints = createAnchoredNavigationEntryPoints(
    builderBootstrapManifest,
    viewerSceneManifest
  );

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
    viewerSceneManifest.runtime.initialFocusOccurrenceId
  );
  assert.equal(entryPoints[2]?.focusOccurrenceId, 'occ-50c5276a269f4c53');
  assert.equal(entryPoints[2]?.rootGameId, 'endgame-simplification-lab');
  assert.equal(
    viewerSceneManifest.runtime.focusCandidateOccurrenceIds.includes(
      entryPoints[2]?.focusOccurrenceId ?? ''
    ),
    false
  );
});

test('keeps entrypoint derivation stable when annotation phase labels drift', () => {
  const manifestWithMislabeledEndgame = {
    ...builderBootstrapManifest,
    occurrences: builderBootstrapManifest.occurrences.map((occurrence) =>
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
  } satisfies BuilderBootstrapManifest;

  const entryPoints = createAnchoredNavigationEntryPoints(
    manifestWithMislabeledEndgame,
    viewerSceneManifest
  );

  assert.equal(entryPoints[2]?.entryId, 'endgame');
  assert.equal(entryPoints[2]?.focusOccurrenceId, 'occ-50c5276a269f4c53');
  assert.equal(entryPoints[2]?.regimeId, 'endgame-table');
});

test('maps the declared initial focus to the middlegame entrypoint', () => {
  const entryPoints = createAnchoredNavigationEntryPoints(
    builderBootstrapManifest,
    viewerSceneManifest
  );

  assert.equal(
    resolveInitialNavigationEntryPointId(
      entryPoints,
      viewerSceneManifest.runtime.initialFocusOccurrenceId
    ),
    'middlegame'
  );
});

test('fails fast when a required declared regime anchor cannot be derived', () => {
  const manifestWithoutEndgameAnchor = {
    ...builderBootstrapManifest,
    anchors: builderBootstrapManifest.anchors.filter(
      (anchor) => !(anchor.anchorKind === 'navigation-entry' && anchor.entryId === 'endgame')
    )
  } satisfies BuilderBootstrapManifest;

  assert.throws(
    () =>
      createAnchoredNavigationEntryPoints(
        manifestWithoutEndgameAnchor,
        viewerSceneManifest
      ),
    /required declared regime anchor is missing/
  );
});