import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSubtreeLabel } from './chessContext.ts';
import { buildViewerReviewArtifacts } from './reviewArtifactDocuments.ts';
import {
  loadRuntimeArtifactBundleFromImportMetaUrl
} from './runtimeArtifactFiles.ts';

const runtimeArtifactBundle = loadRuntimeArtifactBundleFromImportMetaUrl(
  import.meta.url
);

test('builds deterministic viewer review artifacts from the published runtime artifacts', () => {
  const artifacts = buildViewerReviewArtifacts(runtimeArtifactBundle);

  assert.deepEqual(
    artifacts.map((artifact) => artifact.fileName),
    [
      'review/anchored-entrypoints.svg',
      'review/structure-zoom.svg',
      'review/refinement-steps.svg',
      'review/camera-grammar.svg',
      'review/transposition-relations.svg',
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
  const transpositionRelations = artifacts.find(
    (artifact) => artifact.fileName === 'review/transposition-relations.svg'
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
  assert.ok(transpositionRelations);
  assert.ok(evidenceIndex);
  assert.ok(reviewNotes);

  const parsedEvidenceIndex = JSON.parse(evidenceIndex!);
  const focusSubtreeLabel = formatSubtreeLabel(parsedEvidenceIndex.subtreeKey);
  const endgameSubtreeLabel = formatSubtreeLabel(
    parsedEvidenceIndex.navigationEntryPoints[2].subtreeKey
  );

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
  assert.match(anchoredEntrypoints!, new RegExp(escapeRegExp(endgameSubtreeLabel)));
  assert.match(
    structureZoom!,
    new RegExp(
      `${escapeRegExp(focusSubtreeLabel)}: Nf6 to b4, d3, d4, h3, Ng5, O-O`
    )
  );
  assert.match(structureZoom!, /Focus board/);
  assert.match(structureZoom!, /Focused node/);
  assert.match(structureZoom!, new RegExp(escapeRegExp(focusSubtreeLabel)));
  assert.match(structureZoom!, /out [^<]+/);
  assert.match(
    refinementSteps!,
    new RegExp(
      `${escapeRegExp(focusSubtreeLabel)}: refinement toward b4, d3, d4, h3, Ng5, O-O`,
      'i'
    )
  );
  assert.match(refinementSteps!, /Budget 3/);
  assert.match(refinementSteps!, /Budget 6/);
  assert.match(refinementSteps!, /Budget 12/);
  assert.equal(/Focus board/.test(refinementSteps!), false);
  assert.match(cameraGrammar!, /N11 camera grammar review/);
  assert.match(cameraGrammar!, /Context-Preserving Structure View/);
  assert.match(transpositionRelations!, /N13 transposition relation review/i);
  assert.match(
    transpositionRelations!,
    /Repeated states remain visible relations across separate occurrences/
  );
  assert.match(transpositionRelations!, /Local neighborhood/);
  assert.match(transpositionRelations!, /Whole object/);
  assert.match(reviewNotes!, /live N13 interactive review/);
  assert.match(reviewNotes!, /static SVG artifacts alone/i);
  assert.match(reviewNotes!, /graphOccurrenceCount: 118/);
  assert.match(reviewNotes!, /insufficient for the requested 1000\+ node live-view threshold/i);
  assert.match(reviewNotes!, /## Required live review/);
  assert.match(reviewNotes!, /whole-object scope/);
  assert.match(reviewNotes!, /## Supporting artifacts/);
  assert.match(reviewNotes!, /transposition-relations\.svg/);
  assert.match(reviewNotes!, /Do not mark N13 settled without recorded human review/);
  assert.match(reviewNotes!, /Relation verdict/);
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
  assert.equal(typeof parsedEvidenceIndex.subtreeKey, 'string');
  assert.equal(parsedEvidenceIndex.focusTurn, 'White to move');
  assert.equal(typeof parsedEvidenceIndex.transpositionReview.stateKey, 'string');
  assert.ok(parsedEvidenceIndex.transpositionReview.occurrenceIds.length >= 2);
  assert.ok(parsedEvidenceIndex.transpositionReview.wholeObjectLinkCount >= 1);
  assert.deepEqual(parsedEvidenceIndex.cameraDistances, [5, 3.85, 2.8]);
  assert.deepEqual(parsedEvidenceIndex.refinementBudgets, [3, 6, 12]);
  assert.equal(parsedEvidenceIndex.artifacts[0].regime, 'anchored-entrypoints');
  assert.equal(parsedEvidenceIndex.artifacts[1].rootLabelsIncluded, true);
  assert.equal(parsedEvidenceIndex.artifacts[2].focusBoardIncluded, false);
  assert.equal(parsedEvidenceIndex.artifacts[3].regime, 'camera-grammar');
  assert.ok(
    parsedEvidenceIndex.artifacts.some(
      (artifact: { file: string; regime: string }) =>
        artifact.file === 'transposition-relations.svg' && artifact.regime === 'transposition-relations'
    )
  );
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}