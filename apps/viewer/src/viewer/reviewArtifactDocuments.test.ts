import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { BuilderBootstrapManifest, ViewerSceneManifest } from './contracts.ts';
import { buildViewerReviewArtifacts } from './reviewArtifactDocuments.ts';

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

test('builds deterministic N10b review artifacts from the fixture manifests', () => {
  const artifacts = buildViewerReviewArtifacts(
    builderBootstrapManifest,
    viewerSceneManifest
  );

  assert.deepEqual(
    artifacts.map((artifact) => artifact.fileName),
    [
      'review/structure-zoom.svg',
      'review/refinement-steps.svg',
      'review/evidence-index.json',
      'review/review-notes-template.md'
    ]
  );

  const structureZoom = artifacts.find(
    (artifact) => artifact.fileName === 'review/structure-zoom.svg'
  )?.content;
  const refinementSteps = artifacts.find(
    (artifact) => artifact.fileName === 'review/refinement-steps.svg'
  )?.content;
  const evidenceIndex = artifacts.find(
    (artifact) => artifact.fileName === 'review/evidence-index.json'
  )?.content;
  const reviewNotes = artifacts.find(
    (artifact) => artifact.fileName === 'review/review-notes-template.md'
  )?.content;

  assert.ok(structureZoom);
  assert.ok(refinementSteps);
  assert.ok(evidenceIndex);
  assert.ok(reviewNotes);

  assert.match(structureZoom!, /Scholar(?:'|&apos;)s Mate: Nf6 to Qxf7#/);
  assert.match(structureZoom!, /Focus board/);
  assert.match(structureZoom!, /Owning line/);
  assert.match(structureZoom!, /out Qxf7#/);
  assert.match(refinementSteps!, /Scholar(?:'|&apos;)s Mate: refinement toward Qxf7#/i);
  assert.match(refinementSteps!, /Budget 3/);
  assert.match(refinementSteps!, /Budget 6/);
  assert.match(refinementSteps!, /Budget 12/);
  assert.equal(/Focus board/.test(refinementSteps!), false);
  assert.match(reviewNotes!, /Do not mark N10b settled without recorded human review/);
  assert.match(reviewNotes!, /Direct-label verdict/);

  const parsedEvidenceIndex = JSON.parse(evidenceIndex!);
  assert.equal(parsedEvidenceIndex.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.equal(parsedEvidenceIndex.sceneId, viewerSceneManifest.sceneId);
  assert.equal(parsedEvidenceIndex.focusLine, '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6');
  assert.equal(parsedEvidenceIndex.focusTurn, 'White to move');
  assert.deepEqual(parsedEvidenceIndex.refinementBudgets, [3, 6, 12]);
  assert.equal(parsedEvidenceIndex.artifacts[0].rootLabelsIncluded, true);
  assert.equal(parsedEvidenceIndex.artifacts[1].focusBoardIncluded, false);
});