import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type {
  BuilderBootstrapManifest,
  ViewerSceneManifest
} from './contracts.ts';
import { createRuntimeExplorationKernel } from './runtimeKernel.ts';
import { buildRuntimeTranspositionSurface } from './transpositionSurface.ts';

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

test('whole-object surface builds visible transposition links from repeated-state relations', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const snapshot = kernel.inspectWholeGraph(
    viewerSceneManifest.runtime.initialFocusOccurrenceId,
    {
      refinementBudget: 6
    }
  );
  const surface = buildRuntimeTranspositionSurface(
    builderBootstrapManifest,
    snapshot,
    'whole-object'
  );

  assert.equal(surface.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.ok(surface.groups.length > 0);
  assert.ok(surface.links.length > 0);

  for (const group of surface.groups) {
    assert.ok(group.occurrences.length >= 2);
    assert.equal(group.links.length, group.occurrences.length - 1);
    assert.equal(group.offViewOccurrenceIds.length, 0);
  }
});

test('local surface promotes off-view siblings for the focused transposition cluster', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const focusOccurrenceId = builderBootstrapManifest.repeatedStateRelations.find(
    (relation) => relation.occurrenceIds.length === 2
  )?.occurrenceIds[0];

  if (!focusOccurrenceId) {
    throw new Error('expected repeated-state relation with two occurrences in builder fixture');
  }

  const snapshot = kernel.inspectNeighborhood(focusOccurrenceId, {
    radius: 1,
    refinementBudget: 6
  });
  const surface = buildRuntimeTranspositionSurface(
    builderBootstrapManifest,
    snapshot,
    'local-neighborhood'
  );
  const focusGroup = surface.groups.find((group) =>
    group.occurrences.some((occurrence) => occurrence.isFocus)
  );

  assert.ok(focusGroup);

  if (!focusGroup) {
    throw new Error('expected focused local surface to expose a transposition group');
  }

  assert.equal(focusGroup.emphasis, 'focus');
  assert.ok(focusGroup.offViewOccurrenceIds.length > 0);
  assert.equal(focusGroup.links.length, focusGroup.occurrences.length - 1);
  assert.ok(
    focusGroup.links.every(
      (link) => link.sourceOccurrenceId === focusOccurrenceId
        || link.targetOccurrenceId === focusOccurrenceId
    )
  );
});