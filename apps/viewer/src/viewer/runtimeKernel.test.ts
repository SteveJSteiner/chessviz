import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type {
  BuilderBootstrapManifest,
  ViewerSceneManifest
} from './contracts.ts';
import { createRuntimeExplorationKernel } from './runtimeKernel.ts';

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

test('loads stable neighborhoods and refines locally without ontology swap', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const firstSnapshot = kernel.inspectNeighborhood(
    viewerSceneManifest.runtime.initialFocusOccurrenceId,
    {
      radius: 1,
      refinementBudget: 3
    }
  );
  const refinedSnapshot = kernel.inspectNeighborhood(
    viewerSceneManifest.runtime.initialFocusOccurrenceId,
    {
      radius: 1,
      refinementBudget: 6
    }
  );

  assert.equal(firstSnapshot.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.equal(refinedSnapshot.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.equal(firstSnapshot.objectIdentityStable, true);
  assert.equal(refinedSnapshot.objectIdentityStable, true);
  assert.equal(firstSnapshot.cacheState, 'miss');
  assert.equal(refinedSnapshot.cacheState, 'hit');
  assert.deepEqual(
    refinedSnapshot.occurrences
      .slice(0, firstSnapshot.occurrences.length)
      .map((occurrence) => occurrence.occurrenceId),
    firstSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
});

test('tracks cache hits and evicts old neighborhoods under capacity pressure', () => {
  const kernel = createRuntimeExplorationKernel(builderBootstrapManifest, {
    ...viewerSceneManifest,
    runtime: {
      ...viewerSceneManifest.runtime,
      cacheCapacity: 2
    }
  });
  const [firstFocus, secondFocus, thirdFocus] =
    viewerSceneManifest.runtime.focusCandidateOccurrenceIds;

  assert.ok(firstFocus);
  assert.ok(secondFocus);
  assert.ok(thirdFocus);

  kernel.inspectNeighborhood(firstFocus, { radius: 1, refinementBudget: 4 });
  kernel.inspectNeighborhood(secondFocus, { radius: 1, refinementBudget: 4 });
  kernel.inspectNeighborhood(thirdFocus, { radius: 1, refinementBudget: 4 });
  const revisitedSnapshot = kernel.inspectNeighborhood(firstFocus, {
    radius: 1,
    refinementBudget: 4
  });

  assert.equal(revisitedSnapshot.cacheState, 'miss');
  assert.equal(revisitedSnapshot.cacheStats.evictions, 2);
  assert.equal(revisitedSnapshot.cacheStats.entryCount, 2);
});

test('surfaces local terminal anchors and repeated-state relations from builder data', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const drawFocusOccurrenceId = builderBootstrapManifest.terminalAnchors.find(
    (anchor) => anchor.anchorId === 'terminal:draw'
  )?.occurrenceIds[0];

  if (!drawFocusOccurrenceId) {
    throw new Error('expected draw terminal anchor to resolve to an occurrence');
  }

  const drawSnapshot = kernel.inspectNeighborhood(drawFocusOccurrenceId, {
    radius: 1,
    refinementBudget: 6
  });

  assert.ok(
    drawSnapshot.terminalAnchors.some((anchor) => anchor.anchorId === 'terminal:draw')
  );
  assert.ok(drawSnapshot.repeatedStateRelations.length > 0);
});

test('surfaces builder-owned transition facts and departure rules without board reconstruction', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const transitionSurface = kernel.inspectTransitionSurface(
    builderBootstrapManifest.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const quietTransition = transitionSurface.transitions.find(
    (transition) => transition.moveFacts.san === 'd4'
  );
  const captureMateTransition = transitionSurface.transitions.find(
    (transition) => transition.moveFacts.san === 'Qxf7#'
  );

  assert.ok(quietTransition);
  assert.ok(captureMateTransition);

  if (!quietTransition || !captureMateTransition) {
    throw new Error('expected quiet and capture-mate transitions in fixture surface');
  }

  const quietRule = kernel.resolveDepartureRule(
    quietTransition.sourceOccurrenceId,
    quietTransition.targetOccurrenceId
  );
  const captureMateRule = kernel.resolveDepartureRule(
    captureMateTransition.sourceOccurrenceId,
    captureMateTransition.targetOccurrenceId
  );
  const resolvedTransition = kernel.resolveTransition(
    captureMateTransition.sourceOccurrenceId,
    captureMateTransition.targetOccurrenceId
  );

  assert.ok(quietRule);
  assert.ok(captureMateRule);
  assert.ok(resolvedTransition);

  if (!quietRule || !captureMateRule || !resolvedTransition) {
    throw new Error('expected transition surface lookup to resolve exported records');
  }

  assert.equal(quietTransition.moveFamily.interactionClass, 'quiet');
  assert.equal(captureMateTransition.moveFamily.interactionClass, 'capture');
  assert.equal(captureMateTransition.moveFamily.forcingClass, 'checkmate');
  assert.equal(captureMateRule.centerlineProfile, 'terminal-snap');
  assert.ok(captureMateRule.departureStrength > quietRule.departureStrength);
  assert.equal(resolvedTransition.moveFacts.isCapture, true);
});