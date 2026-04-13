import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type {
  BuilderBootstrapManifest,
  ViewerSceneManifest
} from './contracts.ts';
import { resolveCameraGrammarRefinementBudget } from './cameraGrammar.ts';
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

test('keeps neighborhood topology stable across refinement budgets', () => {
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
  assert.equal(firstSnapshot.refinementBudget, 3);
  assert.equal(refinedSnapshot.refinementBudget, 6);
  assert.equal(firstSnapshot.cacheState, 'miss');
  assert.equal(refinedSnapshot.cacheState, 'hit');
  assert.deepEqual(
    refinedSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    firstSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  assert.deepEqual(
    refinedSnapshot.edges.map((edge) => edgeKey(edge.sourceOccurrenceId, edge.targetOccurrenceId)),
    firstSnapshot.edges.map((edge) => edgeKey(edge.sourceOccurrenceId, edge.targetOccurrenceId))
  );
});

test('preserves the qgd-bogo-a root neighborhood across the 4.6 to 4.7 zoom threshold', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const focusOccurrenceId = builderBootstrapManifest.occurrences.find(
    (occurrence) => occurrence.path[0] === 'game:qgd-bogo-a' && occurrence.ply === 0
  )?.occurrenceId;

  if (!focusOccurrenceId) {
    throw new Error('expected qgd-bogo-a root occurrence in builder fixture');
  }

  const fartherBudget = resolveCameraGrammarRefinementBudget(
    4.7,
    viewerSceneManifest.runtime
  );
  const closerBudget = resolveCameraGrammarRefinementBudget(
    4.6,
    viewerSceneManifest.runtime
  );
  const fartherSnapshot = kernel.inspectNeighborhood(focusOccurrenceId, {
    radius: 4,
    refinementBudget: fartherBudget
  });
  const closerSnapshot = kernel.inspectNeighborhood(focusOccurrenceId, {
    radius: 4,
    refinementBudget: closerBudget
  });

  assert.equal(fartherBudget, 3);
  assert.equal(closerBudget, 6);
  assert.deepEqual(
    closerSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    fartherSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  assert.deepEqual(
    closerSnapshot.edges.map((edge) => edgeKey(edge.sourceOccurrenceId, edge.targetOccurrenceId)),
    fartherSnapshot.edges.map((edge) => edgeKey(edge.sourceOccurrenceId, edge.targetOccurrenceId))
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

test('can inspect the whole graph instead of only a local neighborhood window', () => {
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

  assert.equal(snapshot.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.equal(snapshot.objectIdentityStable, true);
  assert.equal(snapshot.refinementBudget, 6);
  assert.equal(snapshot.occurrences.length, builderBootstrapManifest.occurrences.length);
  assert.equal(snapshot.edges.length, builderBootstrapManifest.edges.length);
  assert.equal(
    snapshot.occurrences.filter((occurrence) => !Number.isFinite(occurrence.distance)).length > 0,
    true
  );
});

test('surfaces local terminal anchors and repeated-state relations from builder data', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const drawAnchor = builderBootstrapManifest.anchors.find(
    (anchor) =>
      anchor.anchorKind === 'terminal-outcome' && anchor.anchorId === 'terminal:draw'
  );
  const drawSnapshot = drawAnchor?.occurrenceIds
    .map((occurrenceId) =>
      kernel.inspectNeighborhood(occurrenceId, {
        radius: 1,
        refinementBudget: 6
      })
    )
    .find(
      (snapshot) =>
        snapshot.repeatedStateRelations.length > 0 &&
        snapshot.terminalAnchors.some((anchor) => anchor.anchorId === 'terminal:draw')
    );

  if (!drawSnapshot) {
    throw new Error('expected draw terminal anchor to expose a repeated-state neighborhood');
  }

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

test('derives multiscale carriers with topology preservation and zoom-monotone band reveal', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const occurrenceIds = builderBootstrapManifest.occurrences.map(
    (occurrence) => occurrence.occurrenceId
  );
  const structureSurface = kernel.inspectCarrierSurface(occurrenceIds, {
    refinementBudget: 3
  });
  const tacticalSurface = kernel.inspectCarrierSurface(occurrenceIds, {
    refinementBudget: 6
  });
  const contextualSurface = kernel.inspectCarrierSurface(occurrenceIds, {
    refinementBudget: 12
  });

  assert.equal(structureSurface.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.equal(structureSurface.carriers.length, tacticalSurface.carriers.length);
  assert.equal(structureSurface.carriers.length, contextualSurface.carriers.length);
  assert.ok(structureSurface.carriers.length > 0);
  assert.ok(
    structureSurface.carriers.every(
      (carrier) => carrier.activeBands.length === 1 && carrier.activeBands[0] === 'structure'
    )
  );
  assert.ok(
    tacticalSurface.carriers.some((carrier) => carrier.activeBands.includes('tactical'))
  );
  assert.ok(
    contextualSurface.carriers.some((carrier) => carrier.activeBands.includes('contextual'))
  );

  const quietStructure = structureSurface.carriers.find((carrier) => carrier.san === 'd4');
  const captureStructure = structureSurface.carriers.find(
    (carrier) => carrier.san === 'Qxf7#'
  );

  assert.ok(quietStructure);
  assert.ok(captureStructure);

  if (!quietStructure || !captureStructure) {
    throw new Error('expected quiet and capture-mate carriers in fixture surface');
  }

  const quietTactical = tacticalSurface.carriers.find(
    (carrier) =>
      carrier.sourceOccurrenceId === quietStructure.sourceOccurrenceId &&
      carrier.targetOccurrenceId === quietStructure.targetOccurrenceId
  );
  const quietContextual = contextualSurface.carriers.find(
    (carrier) =>
      carrier.sourceOccurrenceId === quietStructure.sourceOccurrenceId &&
      carrier.targetOccurrenceId === quietStructure.targetOccurrenceId
  );

  assert.ok(quietTactical);
  assert.ok(quietContextual);

  if (!quietTactical || !quietContextual) {
    throw new Error('expected quiet carrier to survive across refinement levels');
  }

  assert.deepEqual(quietStructure.activeBands, ['structure']);
  assert.deepEqual(quietTactical.activeBands, ['structure', 'tactical']);
  assert.deepEqual(quietContextual.activeBands, [
    'structure',
    'tactical',
    'contextual'
  ]);
  assert.ok(quietStructure.samples.length < quietContextual.samples.length);
  assert.ok(captureStructure.departureStrength > quietStructure.departureStrength);
});

function edgeKey(sourceOccurrenceId: string, targetOccurrenceId: string) {
  return `${sourceOccurrenceId}->${targetOccurrenceId}`;
}