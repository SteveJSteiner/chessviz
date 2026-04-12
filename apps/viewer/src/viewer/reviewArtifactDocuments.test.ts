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

test('builds deterministic N11 review artifacts from the fixture manifests', () => {
  const artifacts = buildViewerReviewArtifacts(
    builderBootstrapManifest,
    viewerSceneManifest
  );

  assert.deepEqual(
    artifacts.map((artifact) => artifact.fileName),
    [
      'review/anchored-entrypoints.svg',
      'review/structure-zoom.svg',
      'review/refinement-steps.svg',
      'review/camera-grammar.svg',
      'review/evidence-index.json',
      'review/review-notes-template.md'
    ]
  );

  const structureZoom = artifacts.find(
    (artifact) => artifact.fileName === 'review/structure-zoom.svg'
  )?.content;
  const anchoredEntrypoints = artifacts.find(
    (artifact) => artifact.fileName === 'review/anchored-entrypoints.svg'
  )?.content;
  const refinementSteps = artifacts.find(
    (artifact) => artifact.fileName === 'review/refinement-steps.svg'
  )?.content;
  const cameraGrammar = artifacts.find(
    (artifact) => artifact.fileName === 'review/camera-grammar.svg'
  )?.content;
  const evidenceIndex = artifacts.find(
    (artifact) => artifact.fileName === 'review/evidence-index.json'
  )?.content;
  const reviewNotes = artifacts.find(
    (artifact) => artifact.fileName === 'review/review-notes-template.md'
  )?.content;

  assert.ok(anchoredEntrypoints);
  assert.ok(structureZoom);
  assert.ok(refinementSteps);
  assert.ok(cameraGrammar);
  assert.ok(evidenceIndex);
  assert.ok(reviewNotes);

  assert.match(anchoredEntrypoints!, /N12 anchored entrypoints review/i);
  assert.match(
    anchoredEntrypoints!,
    /Opening, middlegame, and endgame over one object/
  );
  assert.match(anchoredEntrypoints!, /Endgame Simplification Lab/);
  assert.match(
    structureZoom!,
    /Italian Branch Lab: Nf6 to b4, d3, d4, h3, Ng5, O-O/
  );
  assert.match(structureZoom!, /Focus board/);
  assert.match(structureZoom!, /Owning line/);
  assert.match(structureZoom!, /in Nf6/);
  assert.match(structureZoom!, /out [^<]+/);
  assert.match(
    refinementSteps!,
    /Italian Branch Lab: refinement toward b4, d3, d4, h3, Ng5, O-O/i
  );
  assert.match(refinementSteps!, /Budget 3/);
  assert.match(refinementSteps!, /Budget 6/);
  assert.match(refinementSteps!, /Budget 12/);
  assert.equal(/Focus board/.test(refinementSteps!), false);
  assert.match(cameraGrammar!, /N11 camera grammar review/);
  assert.match(cameraGrammar!, /Context-Preserving Structure View/);
  assert.match(reviewNotes!, /Do not mark N12 settled without recorded human review/);
  assert.match(reviewNotes!, /Anchored entrypoint verdict/);

  const parsedEvidenceIndex = JSON.parse(evidenceIndex!);
  assert.equal(parsedEvidenceIndex.graphObjectId, builderBootstrapManifest.graphObjectId);
  assert.equal(parsedEvidenceIndex.sceneId, viewerSceneManifest.sceneId);
  assert.deepEqual(
    parsedEvidenceIndex.navigationEntryPoints.map(
      (entryPoint: { entryId: string }) => entryPoint.entryId
    ),
    ['opening', 'middlegame', 'endgame']
  );
  assert.equal(parsedEvidenceIndex.focusLine, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6');
  assert.equal(parsedEvidenceIndex.focusTurn, 'White to move');
  assert.deepEqual(parsedEvidenceIndex.cameraDistances, [5, 3.85, 2.8]);
  assert.deepEqual(parsedEvidenceIndex.refinementBudgets, [3, 6, 12]);
  assert.equal(parsedEvidenceIndex.artifacts[0].regime, 'anchored-entrypoints');
  assert.equal(parsedEvidenceIndex.artifacts[1].rootLabelsIncluded, true);
  assert.equal(parsedEvidenceIndex.artifacts[2].focusBoardIncluded, false);
  assert.equal(parsedEvidenceIndex.artifacts[3].regime, 'camera-grammar');
});