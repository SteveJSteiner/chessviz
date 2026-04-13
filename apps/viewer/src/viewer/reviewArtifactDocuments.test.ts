import assert from 'node:assert/strict';
import test from 'node:test';
import { buildViewerReviewArtifacts } from './reviewArtifactDocuments.ts';
import {
  loadRuntimeArtifactBundleFromImportMetaUrl
} from './runtimeArtifactFiles.ts';

const runtimeArtifactBundle = loadRuntimeArtifactBundleFromImportMetaUrl(
  import.meta.url
);

test('builds deterministic N11 review artifacts from the published runtime artifacts', () => {
  const artifacts = buildViewerReviewArtifacts(runtimeArtifactBundle);

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
  const anchoredHeightMatch = anchoredEntrypoints!.match(/<svg[^>]+height="(\d+)"/i);
  assert.ok(anchoredHeightMatch);
  assert.ok(Number(anchoredHeightMatch?.[1] ?? '0') >= 1100);
  assert.match(anchoredEntrypoints!, /Radius 3 · distance 5\.0/);
  assert.match(anchoredEntrypoints!, /Expected read/);
  assert.match(anchoredEntrypoints!, /Endgame Simplification Lab/);
  assert.match(
    structureZoom!,
    /Italian Branch Lab: Nf6 to b4, d3, d4, h3, Ng5, O-O/
  );
  assert.match(structureZoom!, /Focus board/);
  assert.match(structureZoom!, /Focused node/);
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
  assert.match(reviewNotes!, /live N12 interactive review/);
  assert.match(reviewNotes!, /static SVG artifacts alone/i);
  assert.match(reviewNotes!, /graphOccurrenceCount: 118/);
  assert.match(reviewNotes!, /insufficient for the requested 1000\+ node live-view threshold/i);
  assert.match(reviewNotes!, /## Required live review/);
  assert.match(reviewNotes!, /whole-object scope/);
  assert.match(reviewNotes!, /## Supporting artifacts/);
  assert.match(reviewNotes!, /Do not mark N12 settled without recorded human review/);
  assert.match(reviewNotes!, /Anchored entrypoint verdict/);

  const parsedEvidenceIndex = JSON.parse(evidenceIndex!);
  assert.equal(
    parsedEvidenceIndex.graphObjectId,
    runtimeArtifactBundle.builderBootstrapManifest.graphObjectId
  );
  assert.equal(
    parsedEvidenceIndex.sceneId,
    runtimeArtifactBundle.viewerSceneManifest.sceneId
  );
  assert.deepEqual(
    parsedEvidenceIndex.navigationEntryPoints.map(
      (entryPoint: { entryId: string }) => entryPoint.entryId
    ),
    ['opening', 'middlegame', 'endgame']
  );
  assert.equal(
    parsedEvidenceIndex.focusNode.occurrenceId,
    parsedEvidenceIndex.focusOccurrenceId
  );
  assert.equal(typeof parsedEvidenceIndex.focusNode.phaseLabel, 'string');
  assert.equal(typeof parsedEvidenceIndex.focusNode.materialSignature, 'string');
  assert.equal(parsedEvidenceIndex.focusTurn, 'White to move');
  assert.deepEqual(parsedEvidenceIndex.cameraDistances, [5, 3.85, 2.8]);
  assert.deepEqual(parsedEvidenceIndex.refinementBudgets, [3, 6, 12]);
  assert.equal(parsedEvidenceIndex.artifacts[0].regime, 'anchored-entrypoints');
  assert.equal(parsedEvidenceIndex.artifacts[1].rootLabelsIncluded, true);
  assert.equal(parsedEvidenceIndex.artifacts[2].focusBoardIncluded, false);
  assert.equal(parsedEvidenceIndex.artifacts[3].regime, 'camera-grammar');
});