import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type {
  BuilderBootstrapManifest,
  Vector3,
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

test('describes the owning chess line for an occurrence with SAN history', () => {
  const kernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );
  const line = kernel.describeOccurrenceLine('occ-65caf3375c92984c');

  assert.ok(line);

  if (!line) {
    throw new Error('expected scholars mate focus line to resolve');
  }

  assert.equal(line.rootGameId, 'scholars-mate-white');
  assert.deepEqual(
    line.moves.map((move) => move.san ?? move.uci),
    ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6']
  );
  assert.equal(line.moves.at(-1)?.targetOccurrenceId, 'occ-65caf3375c92984c');
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
      (carrier) =>
        carrier.validation.endpointLocked &&
        carrier.validation.finiteCoordinates &&
        carrier.validation.projectedProgressMonotone &&
        carrier.validation.nonDegenerateSegments &&
        carrier.validation.coarseDominant
    )
  );
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
  assert.ok(
    maxDeviationFromChord(captureStructure.samples) >
      maxDeviationFromChord(quietStructure.samples)
  );
});

function maxDeviationFromChord(samples: Vector3[]): number {
  const source = samples[0];
  const target = samples.at(-1);

  if (!source || !target) {
    return 0;
  }

  const chord = subtract(target, source);
  const chordLength = magnitude(chord);
  const tangent = chordLength === 0 ? ([1, 0, 0] as Vector3) : scale(chord, 1 / chordLength);

  return samples.reduce((maximumDeviation, sample) => {
    const projection = dot(subtract(sample, source), tangent);
    const projectedPoint = add(source, scale(tangent, projection));
    return Math.max(maximumDeviation, magnitude(subtract(sample, projectedPoint)));
  }, 0);
}

function add(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(vector: Vector3, scalar: number): Vector3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dot(left: Vector3, right: Vector3): number {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function magnitude(vector: Vector3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}