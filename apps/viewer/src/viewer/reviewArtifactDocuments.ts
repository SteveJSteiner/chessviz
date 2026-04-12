import { materializeRuntimeBootstrap } from './bootstrap.ts';
import type { RuntimeBootstrapMaterialization } from './bootstrap.ts';
import {
  CAMERA_GRAMMAR_REVIEW_DISTANCES,
  createCameraGrammarState,
  describeCameraGrammarBand,
  resolveCameraGrammarRefinementBudget,
  type CameraGrammarState
} from './cameraGrammar.ts';
import {
  resolveOrbitCameraPosition
} from './cameraOrbit.ts';
import {
  formatCastlingRights,
  formatGameName,
  formatOccurrenceLine,
  formatTerminalOutcomeLabel,
  formatTurnLabel,
  listBoardSquares,
  parseStateKey,
  pieceGlyph,
  summarizeMoveSemantics
} from './chessContext.ts';
import {
  N10B_REVIEW_BUDGETS,
  collectContextualResidueSamples,
  createCarrierPresentation,
  createOccurrencePresentation,
  scaleCoordinate
} from './carrierPresentation.ts';
import type {
  BuilderBootstrapManifest,
  BuilderOccurrenceRecord,
  BuilderTransitionRecord,
  NavigationEntryPoint,
  RuntimeArtifactBundle,
  RuntimeCarrierRecord,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  RuntimeOccurrenceLine,
  SceneBootstrap,
  Vector3,
  ViewerSceneManifest
} from './contracts.ts';
import {
  selectCarrierLabelSelections,
  selectOccurrenceLabelSelections
} from './labelPolicy.ts';
import {
  createAnchoredNavigationEntryPoints,
  resolveNavigationEntryPoint
} from './navigation.ts';
import { createRuntimeExplorationKernel } from './runtimeKernel.ts';

type ReviewScene = {
  cameraDistance: number;
  cameraGrammar: CameraGrammarState;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
};

type ViewerReviewArtifact = {
  fileName: string;
  content: string;
};

type Viewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
};

type ReviewLocalTransition = {
  direction: 'incoming' | 'outgoing';
  transition: BuilderTransitionRecord;
  neighborOccurrence: BuilderOccurrenceRecord;
};

type ReviewFocusContext = {
  focusOccurrence: BuilderOccurrenceRecord;
  focusLine: RuntimeOccurrenceLine | null;
  localTransitions: ReviewLocalTransition[];
};

type EntryPointReviewScene = {
  reviewScene: ReviewScene;
  focusContext: ReviewFocusContext;
};

export function buildViewerReviewArtifacts(
  runtimeArtifactBundle: RuntimeArtifactBundle
): ViewerReviewArtifact[] {
  const runtimeBootstrap = materializeRuntimeBootstrap(runtimeArtifactBundle);
  const { builderBootstrapManifest, viewerSceneManifest } = runtimeBootstrap;
  const kernel = createRuntimeExplorationKernel(
    runtimeBootstrap.builderBootstrapManifest,
    runtimeBootstrap.viewerSceneManifest
  );
  const sceneBootstrap = runtimeBootstrap.sceneBootstrap;
  const navigationEntryPoints = createAnchoredNavigationEntryPoints(runtimeBootstrap);
  const middlegameEntryPoint = resolveNavigationEntryPoint(
    navigationEntryPoints,
    'middlegame'
  );
  const focusOccurrenceId = middlegameEntryPoint.focusOccurrenceId;
  const neighborhoodRadius = middlegameEntryPoint.neighborhoodRadius;
  const reviewDistances = [
    CAMERA_GRAMMAR_REVIEW_DISTANCES.structure,
    CAMERA_GRAMMAR_REVIEW_DISTANCES.tactical,
    CAMERA_GRAMMAR_REVIEW_DISTANCES.contextual
  ];
  const reviewScenes = reviewDistances.map((cameraDistance) =>
    buildReviewScene({
      kernel,
      sceneBootstrap,
      runtimeConfig: viewerSceneManifest.runtime,
      navigationEntryPoint: {
        ...middlegameEntryPoint,
        distance: cameraDistance
      }
    })
  );
  const entryPointReviewScenes = navigationEntryPoints.map((navigationEntryPoint) =>
    buildEntryPointReviewScene({
      runtimeBootstrap,
      kernel,
      sceneBootstrap,
      runtimeConfig: viewerSceneManifest.runtime,
      navigationEntryPoint
    })
  );
  const refinementBudgets = reviewScenes.map(
    (reviewScene) => reviewScene.runtimeSnapshot.refinementBudget
  );
  const focusContext = entryPointReviewScenes.find(
    (entryPointReviewScene) =>
      entryPointReviewScene.reviewScene.navigationEntryPoint.entryId === 'middlegame'
  )?.focusContext;

  if (!focusContext) {
    throw new Error('expected middlegame entrypoint review context');
  }

  const focusPosition = parseStateKey(focusContext.focusOccurrence.stateKey);
  const focusLineText = formatOccurrenceLine(focusContext.focusLine);

  return [
    {
      fileName: 'review/anchored-entrypoints.svg',
      content: renderAnchoredEntryPointsDocument(entryPointReviewScenes)
    },
    {
      fileName: 'review/structure-zoom.svg',
      content: renderStructureZoomDocument(
        reviewScenes[0]!,
        focusContext,
        neighborhoodRadius
      )
    },
    {
      fileName: 'review/refinement-steps.svg',
      content: renderRefinementStepsDocument(
        reviewScenes,
        focusContext,
        neighborhoodRadius
      )
    },
    {
      fileName: 'review/camera-grammar.svg',
      content: renderCameraGrammarDocument(
        reviewScenes,
        focusContext,
        neighborhoodRadius
      )
    },
    {
      fileName: 'review/evidence-index.json',
      content: JSON.stringify(
        {
          graphObjectId: builderBootstrapManifest.graphObjectId,
          sceneId: viewerSceneManifest.sceneId,
          focusOccurrenceId,
          navigationEntryPoints: navigationEntryPoints.map((entryPoint) => ({
            entryId: entryPoint.entryId,
            focusOccurrenceId: entryPoint.focusOccurrenceId,
            rootGameId: entryPoint.rootGameId,
            anchorPly: entryPoint.anchorPly,
            neighborhoodRadius: entryPoint.neighborhoodRadius,
            distance: roundNumber(entryPoint.distance)
          })),
          rootGameId:
            focusContext.focusLine?.rootGameId ??
            focusContext.focusOccurrence.embedding.rootGameId,
          focusLine: focusLineText,
          focusTurn: formatTurnLabel(focusPosition.activeColor),
          neighborhoodRadius,
          cameraDistances: reviewScenes.map((reviewScene) =>
            roundNumber(reviewScene.cameraDistance)
          ),
          refinementBudgets,
          localMoves: focusContext.localTransitions.map((entry) => ({
            direction: entry.direction,
            san: entry.transition.moveFacts.san,
            uci: entry.transition.moveUci,
            semantics: summarizeMoveSemantics(
              entry.transition.moveFacts,
              entry.transition.moveFamily
            )
          })),
          artifacts: [
            {
              file: 'anchored-entrypoints.svg',
              regime: 'anchored-entrypoints',
              entryIds: navigationEntryPoints.map((entryPoint) => entryPoint.entryId),
              graphObjectId: builderBootstrapManifest.graphObjectId,
              focusBoardIncluded: false,
              moveLabelsIncluded: true,
              rootLabelsIncluded: true,
              terminalLabelsIncluded: true
            },
            {
              file: 'structure-zoom.svg',
              regime: 'structure-zoom',
              cameraDistance: roundNumber(reviewScenes[0]?.cameraDistance ?? 0),
              refinementBudget: reviewScenes[0]?.runtimeSnapshot.refinementBudget,
              expectedBands: ['structure'],
              focusBoardIncluded: true,
              moveLabelsIncluded: true,
              rootLabelsIncluded: true,
              terminalLabelsIncluded: true
            },
            {
              file: 'refinement-steps.svg',
              regime: 'refinement-steps',
              cameraDistances: reviewScenes.map((reviewScene) =>
                roundNumber(reviewScene.cameraDistance)
              ),
              refinementBudgets,
              expectedBands: [
                ['structure'],
                ['structure', 'tactical'],
                ['structure', 'tactical', 'contextual']
              ],
              focusBoardIncluded: false,
              moveLabelsIncluded: true,
              rootLabelsIncluded: true,
              terminalLabelsIncluded: true
            },
            {
              file: 'camera-grammar.svg',
              regime: 'camera-grammar',
              cameraDistances: reviewScenes.map((reviewScene) =>
                roundNumber(reviewScene.cameraDistance)
              ),
              refinementBudgets,
              expectedBands: reviewScenes.map((reviewScene) => reviewScene.cameraGrammar.band),
              liveLabelPolicyApplied: true
            },
            {
              file: 'review-notes-template.md',
              regime: 'human-verdict-template'
            }
          ]
        },
        null,
        2
      )
    },
    {
      fileName: 'review/review-notes-template.md',
      content: renderReviewNotesTemplate(
        builderBootstrapManifest.graphObjectId,
        viewerSceneManifest.sceneId,
        {
          edgeCount: builderBootstrapManifest.edges.length,
          occurrenceCount: builderBootstrapManifest.occurrences.length
        },
        navigationEntryPoints,
        focusContext
      )
    }
  ];
}

function buildEntryPointReviewScene({
  runtimeBootstrap,
  kernel,
  sceneBootstrap,
  runtimeConfig,
  navigationEntryPoint
}: {
  runtimeBootstrap: RuntimeBootstrapMaterialization;
  kernel: ReturnType<typeof createRuntimeExplorationKernel>;
  sceneBootstrap: SceneBootstrap;
  runtimeConfig: ViewerSceneManifest['runtime'];
  navigationEntryPoint: NavigationEntryPoint;
}): EntryPointReviewScene {
  return {
    reviewScene: buildReviewScene({
      kernel,
      sceneBootstrap,
      runtimeConfig,
      navigationEntryPoint
    }),
    focusContext: buildReviewFocusContext(
      runtimeBootstrap.builderBootstrapManifest,
      kernel,
      navigationEntryPoint.focusOccurrenceId
    )
  };
}

function buildReviewScene({
  kernel,
  sceneBootstrap,
  runtimeConfig,
  navigationEntryPoint
}: {
  kernel: ReturnType<typeof createRuntimeExplorationKernel>;
  sceneBootstrap: SceneBootstrap;
  runtimeConfig: ViewerSceneManifest['runtime'];
  navigationEntryPoint: NavigationEntryPoint;
}): ReviewScene {
  const refinementBudget = resolveCameraGrammarRefinementBudget(
    navigationEntryPoint.distance,
    runtimeConfig
  );
  const runtimeSnapshot = kernel.inspectNeighborhood(
    navigationEntryPoint.focusOccurrenceId,
    {
      radius: navigationEntryPoint.neighborhoodRadius,
      refinementBudget
    }
  );
  const carrierSurface = kernel.inspectCarrierSurface(
    runtimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    { refinementBudget }
  );

  return {
    cameraDistance: navigationEntryPoint.distance,
    cameraGrammar: createCameraGrammarState({
      cameraDistance: navigationEntryPoint.distance,
      runtimeConfig,
      runtimeSnapshot
    }),
    sceneBootstrap,
    navigationEntryPoint,
    runtimeSnapshot,
    carrierSurface
  };
}

function renderAnchoredEntryPointsDocument(
  entryPointReviewScenes: EntryPointReviewScene[]
) {
  const width = 1700;
  const viewports = [
    { x: 40, y: 176, width: 516, height: 620 },
    { x: 592, y: 176, width: 516, height: 620 },
    { x: 1144, y: 176, width: 516, height: 620 }
  ] as const;
  const graphObjectId = entryPointReviewScenes[0]?.reviewScene.runtimeSnapshot.graphObjectId;
  const captionCards = entryPointReviewScenes.map((entryPointReviewScene, index) =>
    buildAnchoredEntryPointCaptionCard(
      viewports[index]!,
      entryPointReviewScene.reviewScene
    )
  );
  const captionBottom = Math.max(...captionCards.map((captionCard) => captionCard.bottom));
  const expectedReadText =
    'Each panel is the same graph object under a different anchor and camera stance. Opening should read as full-material branching, middlegame as branch-rich local complexity, and endgame as simplified routing without turning into a different diagram family.';
  const expectedReadLines = wrapText(expectedReadText, 138);
  const expectedReadY = captionBottom + 28;
  const expectedReadHeight = 48 + (expectedReadLines.length * 20);
  const legendY = expectedReadY + expectedReadHeight + 34;
  const height = legendY + 40;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#ece6d8" />',
    `<rect x="24" y="24" width="1652" height="${height - 48}" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />`,
    '<text x="40" y="62" class="eyebrow">N12 anchored entrypoints review</text>',
    '<text x="40" y="96" class="title">Opening, middlegame, and endgame over one object</text>',
    `<text x="40" y="124" class="subtitle">${escapeXml(graphObjectId ?? 'unknown graph object')} · preset switches move camera and anchor without changing diagram family</text>`,
    ...entryPointReviewScenes.map((entryPointReviewScene, index) =>
      renderScenePanel(
        entryPointReviewScene.reviewScene,
        entryPointReviewScene.focusContext,
        viewports[index]!,
        `anchored-entrypoint-panel-${index}`
      )
    ),
    ...captionCards.map((captionCard) => captionCard.markup),
    renderInfoCard(40, expectedReadY, 1620, 'Expected read', expectedReadText, 138, 'copy'),
    renderBandLegendRow(
      40,
      legendY,
      '#566574',
      '#87a9c8',
      '#dcecff',
      'Entrypoints change anchor and emphasis only. Carrier semantics and label grammar stay continuous across all three views.'
    ),
    '</svg>'
  ].join('');
}

function buildReviewFocusContext(
  builderBootstrapManifest: BuilderBootstrapManifest,
  kernel: ReturnType<typeof createRuntimeExplorationKernel>,
  focusOccurrenceId: string
): ReviewFocusContext {
  const focusOccurrence = kernel.resolveOccurrence(focusOccurrenceId);
  if (!focusOccurrence) {
    throw new Error(`unknown focus occurrence: ${focusOccurrenceId}`);
  }

  const localTransitions = builderBootstrapManifest.transitions
    .filter(
      (transition) =>
        transition.sourceOccurrenceId === focusOccurrenceId ||
        transition.targetOccurrenceId === focusOccurrenceId
    )
    .map((transition) => {
      const direction =
        transition.targetOccurrenceId === focusOccurrenceId ? 'incoming' : 'outgoing';
      const neighborOccurrenceId =
        direction === 'incoming'
          ? transition.sourceOccurrenceId
          : transition.targetOccurrenceId;
      const neighborOccurrence = kernel.resolveOccurrence(neighborOccurrenceId);

      if (!neighborOccurrence) {
        return null;
      }

      return {
        direction,
        transition,
        neighborOccurrence
      } satisfies ReviewLocalTransition;
    })
    .filter((entry): entry is ReviewLocalTransition => entry !== null)
    .sort((left, right) => {
      const leftDirectionRank = left.direction === 'incoming' ? 0 : 1;
      const rightDirectionRank = right.direction === 'incoming' ? 0 : 1;
      if (leftDirectionRank !== rightDirectionRank) {
        return leftDirectionRank - rightDirectionRank;
      }

      if (left.transition.ply !== right.transition.ply) {
        return left.transition.ply - right.transition.ply;
      }

      return left.transition.moveFacts.san.localeCompare(right.transition.moveFacts.san);
    });

  return {
    focusOccurrence,
    focusLine: kernel.describeOccurrenceLine(focusOccurrenceId) ?? null,
    localTransitions
  };
}

function renderStructureZoomDocument(
  reviewScene: ReviewScene,
  focusContext: ReviewFocusContext,
  neighborhoodRadius: number
) {
  const width = 1500;
  const height = 980;
  const viewport = { x: 48, y: 158, width: 930, height: 720 };
  const focusPosition = parseStateKey(focusContext.focusOccurrence.stateKey);
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#f2ecdf" />',
    '<rect x="24" y="24" width="1452" height="932" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />',
    '<text x="48" y="62" class="eyebrow">Viewer review artifact</text>',
    `<text x="48" y="96" class="title">${escapeXml(buildStructureZoomTitle(focusContext))}</text>`,
    `<text x="48" y="124" class="subtitle">${escapeXml(formatGameName(rootGameId))} · ${escapeXml(formatTurnLabel(focusPosition.activeColor))} · radius ${neighborhoodRadius} · distance ${reviewScene.cameraDistance.toFixed(1)} · budget ${reviewScene.runtimeSnapshot.refinementBudget}</text>`,
    renderScenePanel(reviewScene, focusContext, viewport, 'structure-panel'),
    '<rect x="1012" y="158" width="428" height="790" rx="26" fill="#fdfaf3" stroke="#dcd3c4" />',
    '<text x="1036" y="188" class="section">Reference check</text>',
    renderWrappedTextBlock(
      1036,
      216,
      buildFocusSummary(focusContext),
      39,
      20,
      'copy'
    ),
    renderBoardCard(1046, 332, 360, focusContext.focusOccurrence.stateKey),
    renderInfoCard(
      1036,
      756,
      380,
      'Owning line',
      formatOccurrenceLine(focusContext.focusLine),
      39,
      'copy'
    ),
    '<text x="1036" y="836" class="section">Moves touching focus</text>',
    renderLocalMoveList(1036, 852, 380, focusContext.localTransitions, 2),
    '<text x="48" y="930" class="section">How to read the ribbons</text>',
    renderBandLegendRow(
      48,
      954,
      '#566574',
      '#87a9c8',
      '#dcecff',
      'Outer ribbon keeps the coarse move path readable; inner glow and dots add tactical and contextual residue.'
    ),
    '</svg>'
  ].join('');
}

function renderRefinementStepsDocument(
  reviewScenes: ReviewScene[],
  focusContext: ReviewFocusContext,
  neighborhoodRadius: number
) {
  const width = 1700;
  const height = 920;
  const viewports = [
    { x: 40, y: 176, width: 516, height: 620 },
    { x: 592, y: 176, width: 516, height: 620 },
    { x: 1144, y: 176, width: 516, height: 620 }
  ] as const;
  const focusPosition = parseStateKey(focusContext.focusOccurrence.stateKey);
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#ece4d7" />',
    '<rect x="24" y="24" width="1652" height="872" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />',
    '<text x="40" y="62" class="eyebrow">Viewer refinement review</text>',
    `<text x="40" y="96" class="title">${escapeXml(buildRefinementTitle(focusContext))}</text>`,
    `<text x="40" y="124" class="subtitle">${escapeXml(formatGameName(rootGameId))} · ${escapeXml(formatTurnLabel(focusPosition.activeColor))} · fixed radius ${neighborhoodRadius}</text>`,
    ...reviewScenes.map((reviewScene, index) =>
      renderScenePanel(
        reviewScene,
        focusContext,
        viewports[index]!,
        `refinement-panel-${index}`
      )
    ),
    ...reviewScenes.map((reviewScene, index) =>
      renderPanelCaption(viewports[index]!, reviewScene.runtimeSnapshot.refinementBudget)
    ),
    '<text x="40" y="850" class="section">Expected read</text>',
    renderWrappedTextBlock(
      40,
      878,
      'The same move labels stay attached to the same carriers while additional ribbons and labels join the neighborhood as the camera moves closer.',
      118,
      20,
      'copy'
    ),
    renderBandLegendRow(
      40,
      902,
      '#566574',
      '#87a9c8',
      '#dcecff',
      'Structure stays visually dominant while the inner bands add forcing and contextual detail.'
    ),
    '</svg>'
  ].join('');
}

function renderCameraGrammarDocument(
  reviewScenes: ReviewScene[],
  focusContext: ReviewFocusContext,
  neighborhoodRadius: number
) {
  const width = 1700;
  const height = 980;
  const viewports = [
    { x: 40, y: 176, width: 516, height: 620 },
    { x: 592, y: 176, width: 516, height: 620 },
    { x: 1144, y: 176, width: 516, height: 620 }
  ] as const;
  const focusPosition = parseStateKey(focusContext.focusOccurrence.stateKey);
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#eee7db" />',
    '<rect x="24" y="24" width="1652" height="932" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />',
    '<text x="40" y="62" class="eyebrow">N11 camera grammar review</text>',
    `<text x="40" y="96" class="title">${escapeXml(buildCameraGrammarTitle(focusContext))}</text>`,
    `<text x="40" y="124" class="subtitle">${escapeXml(formatGameName(rootGameId))} · ${escapeXml(formatTurnLabel(focusPosition.activeColor))} · radius ${neighborhoodRadius}</text>`,
    ...reviewScenes.map((reviewScene, index) =>
      renderScenePanel(
        reviewScene,
        focusContext,
        viewports[index]!,
        `camera-grammar-panel-${index}`
      )
    ),
    ...reviewScenes.map((reviewScene, index) =>
      renderCameraGrammarCaption(viewports[index]!, reviewScene)
    ),
    '<text x="40" y="850" class="section">Expected live read</text>',
    renderWrappedTextBlock(
      40,
      878,
      'Zooming closer should add tactical and contextual detail on the same carriers, while zooming back out should return to the coarse structure read without changing the move-family interpretation.',
      118,
      20,
      'copy'
    ),
    renderBandLegendRow(
      40,
      930,
      '#566574',
      '#87a9c8',
      '#dcecff',
      'One camera grammar, one object: context at distance, tighter focus up close, and monotone band reveal throughout.'
    ),
    '</svg>'
  ].join('');
}

function renderReviewNotesTemplate(
  graphObjectId: string,
  sceneId: string,
  graphScale: {
    edgeCount: number;
    occurrenceCount: number;
  },
  navigationEntryPoints: NavigationEntryPoint[],
  focusContext: ReviewFocusContext
) {
  const focusPosition = parseStateKey(focusContext.focusOccurrence.stateKey);

  return [
    '# N12 Review Notes',
    '',
    'Use this file as the human verdict record for the live N12 interactive review.',
    'Do not answer the camera-affordance question from the static SVG artifacts alone; they are supporting evidence only.',
    '',
    '## Run context',
    `- graphObjectId: ${graphObjectId}`,
    `- sceneId: ${sceneId}`,
    `- graphOccurrenceCount: ${graphScale.occurrenceCount}`,
    `- graphEdgeCount: ${graphScale.edgeCount}`,
    `- scaleGate: ${graphScale.occurrenceCount >= 1000 ? 'meets the requested 1000+ node live-view threshold' : `insufficient for the requested 1000+ node live-view threshold (${graphScale.occurrenceCount} total nodes in current artifact set)`}`,
    ...navigationEntryPoints.map(
      (entryPoint) =>
        `- ${entryPoint.entryId} anchor: ${entryPoint.focusOccurrenceId} · ${formatGameName(entryPoint.rootGameId)} · ply ${entryPoint.anchorPly} · radius ${entryPoint.neighborhoodRadius} · distance ${entryPoint.distance.toFixed(1)}`
    ),
    `- middlegame focusLine: ${formatOccurrenceLine(focusContext.focusLine)}`,
    `- middlegame focusTurn: ${formatTurnLabel(focusPosition.activeColor)}`,
    `- structureDistance: ${CAMERA_GRAMMAR_REVIEW_DISTANCES.structure.toFixed(1)}`,
    `- tacticalDistance: ${CAMERA_GRAMMAR_REVIEW_DISTANCES.tactical.toFixed(1)}`,
    `- contextualDistance: ${CAMERA_GRAMMAR_REVIEW_DISTANCES.contextual.toFixed(1)}`,
    `- structureBudget: ${N10B_REVIEW_BUDGETS.structure}`,
    `- tacticalBudget: ${N10B_REVIEW_BUDGETS.tactical}`,
    `- contextualBudget: ${N10B_REVIEW_BUDGETS.contextual}`,
    '',
    '## Required live review',
    '- switch the viewer to whole-object scope before recording the verdict; local-neighborhood mode is not sufficient for the scale gate',
    '- run the interactive viewer and switch across the opening, middlegame, and endgame entrypoints in one session',
    '- drag on the canvas to orbit and use scroll or the distance slider to test camera affordances directly',
    '- click nodes or move cards after switching entrypoints to confirm local exploration still feels continuous',
    '- record screenshots or screen capture from the live viewer after the interactive pass',
    '',
    '## Supporting artifacts',
    '- review/anchored-entrypoints.svg',
    '- review/structure-zoom.svg',
    '- review/refinement-steps.svg',
    '- review/camera-grammar.svg',
    '',
    '## Reviewer',
    '- name:',
    '- date:',
    '',
    '## Anchored entrypoint verdict',
    '- opening, middlegame, and endgame read as one object rather than three substitute diagrams:',
    '- switching presets changed anchor, emphasis, and camera stance without changing graph identity:',
    '- local exploration still felt available after switching presets:',
    '- the board reference stayed secondary and confirmatory rather than becoming the primary interface:',
    '',
    '## Camera grammar carryover',
    '- orbiting still kept the focused position legible while preserving surrounding branch context:',
    '- zooming closer still added tactical/contextual detail on the same carriers rather than swapping representations:',
    '- zooming back out still restored the coarse reading without contradictory emphasis:',
    '- what still needs iteration:',
    '',
    '## Settlement note',
    '- N12 settled: no / yes',
    '- if yes, reference the commit that updates plan/completion-log.md and plan/continuation.md',
    '',
    'Do not mark N12 settled without recorded human review.'
  ].join('\n');
}

function renderScenePanel(
  reviewScene: ReviewScene,
  focusContext: ReviewFocusContext,
  viewport: Viewport,
  panelId: string
) {
  const projector = createProjector(reviewScene, viewport);
  const carrierLabelSelections = selectCarrierLabelSelections({
    cameraDistance: reviewScene.cameraDistance,
    carriers: reviewScene.carrierSurface.carriers,
    focusOccurrenceId: reviewScene.runtimeSnapshot.focusOccurrenceId,
    occurrences: reviewScene.runtimeSnapshot.occurrences
  });
  const occurrenceLabelSelections = selectOccurrenceLabelSelections({
    cameraDistance: reviewScene.cameraDistance,
    occurrences: reviewScene.runtimeSnapshot.occurrences
  });
  const carrierMarkup = reviewScene.carrierSurface.carriers
    .map((carrier) => renderCarrierMarkup(carrier, projector))
    .filter((carrier): carrier is { depth: number; markup: string } => carrier !== null)
    .sort((left, right) => right.depth - left.depth)
    .map((carrier) => carrier.markup)
    .join('');
  const nodeMarkup = reviewScene.runtimeSnapshot.occurrences
    .map((occurrence) => renderOccurrenceMarkup(occurrence, projector, reviewScene.sceneBootstrap))
    .filter((occurrence): occurrence is { depth: number; markup: string } => occurrence !== null)
    .sort((left, right) => right.depth - left.depth)
    .map((occurrence) => occurrence.markup)
    .join('');
  const carrierLabelMarkup = carrierLabelSelections
    .map((selection) =>
      renderCarrierLabelMarkup(
        selection.carrier,
        focusContext,
        projector,
        viewport,
        selection.opacity,
        selection.scale
      )
    )
    .filter((label): label is { depth: number; markup: string } => label !== null)
    .sort((left, right) => right.depth - left.depth)
    .map((label) => label.markup)
    .join('');
  const occurrenceLabelMarkup = occurrenceLabelSelections
    .map((selection) =>
      renderOccurrenceDataLabelMarkup(
        selection.kind,
        selection.occurrence,
        reviewScene,
        projector,
        viewport,
        selection.opacity,
        selection.scale
      )
    )
    .filter((label): label is { depth: number; markup: string } => label !== null)
    .sort((left, right) => right.depth - left.depth)
    .map((label) => label.markup)
    .join('');
  const focusPoint = projector.project(scaleCoordinate(reviewScene.navigationEntryPoint.focus));
  const clipId = `${panelId}-clip`;

  return [
    `<defs><clipPath id="${clipId}"><rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" rx="26" /></clipPath></defs>`,
    `<rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" rx="26" fill="#fdfbf6" stroke="#dcd3c4" />`,
    `<ellipse cx="${roundNumber(viewport.x + (viewport.width * 0.5))}" cy="${roundNumber(viewport.y + (viewport.height * 0.88))}" rx="${roundNumber(viewport.width * 0.28)}" ry="${roundNumber(viewport.height * 0.06)}" fill="#ece3d3" opacity="0.72" />`,
    `<g clip-path="url(#${clipId})">`,
    carrierMarkup,
    nodeMarkup,
    carrierLabelMarkup,
    occurrenceLabelMarkup,
    focusPoint.visible
      ? `<circle cx="${roundNumber(focusPoint.x)}" cy="${roundNumber(focusPoint.y)}" r="10" fill="none" stroke="#7a4b12" stroke-width="2.4" opacity="0.8" />`
      : '',
    '</g>'
  ].join('');
}

function renderCarrierMarkup(
  carrier: RuntimeCarrierRecord,
  projector: ReturnType<typeof createProjector>
) {
  const projectedSamples = carrier.samples.map((sample) =>
    projector.project(scaleCoordinate(sample))
  );
  const visibleSamples = projectedSamples.filter((sample) => sample.visible);
  if (visibleSamples.length < 2) {
    return null;
  }

  const presentation = createCarrierPresentation(carrier);
  const path = buildPathData(visibleSamples);
  const averageDepth =
    visibleSamples.reduce((depth, sample) => depth + sample.depth, 0) /
    visibleSamples.length;
  const contextualDots = carrier.activeBands.includes('contextual')
    ? collectContextualResidueSamples(carrier)
        .map((sample) => projector.project(scaleCoordinate(sample)))
        .filter((sample) => sample.visible)
        .map(
          (sample) =>
            `<circle cx="${roundNumber(sample.x)}" cy="${roundNumber(sample.y)}" r="${presentation.contextualDotRadius * 14}" fill="${presentation.contextualColor}" opacity="0.9" />`
        )
        .join('')
    : '';

  return {
    depth: averageDepth,
    markup: [
      `<path d="${path}" fill="none" stroke="${presentation.haloColor}" stroke-width="${presentation.haloRadius * 26}" stroke-linecap="round" stroke-linejoin="round" opacity="0.32" />`,
      `<path d="${path}" fill="none" stroke="${presentation.structureColor}" stroke-width="${presentation.structureRadius * 24}" stroke-linecap="round" stroke-linejoin="round" opacity="0.96" />`,
      carrier.activeBands.includes('tactical')
        ? `<path d="${path}" fill="none" stroke="${presentation.tacticalColor}" stroke-width="${presentation.tacticalRadius * 18}" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />`
        : '',
      contextualDots
    ].join('')
  };
}

function renderCarrierLabelMarkup(
  carrier: RuntimeCarrierRecord,
  focusContext: ReviewFocusContext,
  projector: ReturnType<typeof createProjector>,
  viewport: Viewport,
  opacity: number,
  scale: number
) {
  const centerSample =
    carrier.samples[Math.floor(carrier.samples.length * 0.5)] ?? carrier.samples[0];
  if (!centerSample) {
    return null;
  }

  const projected = projector.project(scaleCoordinate(centerSample));
  if (!projected.visible) {
    return null;
  }

  const presentation = createCarrierPresentation(carrier);
  const label = formatCarrierLabel(carrier, focusContext);
  const labelScale = Math.max(scale, 0.8);
  const labelWidth = Math.max(78, ((label.length * 7.2) + 16) * labelScale);
  const labelHeight = 22 * labelScale;
  const focusOccurrenceId = focusContext.focusOccurrence.occurrenceId;
  const isOutgoing = carrier.sourceOccurrenceId === focusOccurrenceId;
  const isFocusAdjacent =
    isOutgoing || carrier.targetOccurrenceId === focusOccurrenceId;
  const isAlongFocusLine = isLineTransition(carrier, focusContext.focusLine);
  const fillColor = isOutgoing
    ? '#deebf4'
    : isFocusAdjacent || isAlongFocusLine
      ? '#fdebd2'
      : '#f7f1e6';
  const strokeColor = isOutgoing
    ? '#3a6b87'
    : isFocusAdjacent || isAlongFocusLine
      ? '#c27b1b'
      : presentation.structureColor;
  const labelX = clampNumber(
    projected.x + ((carrier.ply % 2) === 0 ? -(labelWidth * 0.45) : -(labelWidth * 0.2)),
    viewport.x + 8,
    viewport.x + viewport.width - labelWidth - 8
  );
  const labelY = clampNumber(
    projected.y + ((carrier.ply % 2) === 0 ? -28 : 12),
    viewport.y + 8,
    viewport.y + viewport.height - labelHeight - 8
  );

  return {
    depth: projected.depth,
    markup: [
      `<rect x="${roundNumber(labelX)}" y="${roundNumber(labelY)}" width="${roundNumber(labelWidth)}" height="${roundNumber(labelHeight)}" rx="${roundNumber(labelHeight * 0.5)}" fill="${fillColor}" stroke="${strokeColor}" opacity="${roundNumber(opacity)}" />`,
      `<text x="${roundNumber(labelX + (9 * labelScale))}" y="${roundNumber(labelY + (15 * labelScale))}" class="move-label" style="font-size:${roundNumber(12 * labelScale)}px">${escapeXml(label)}</text>`
    ].join('')
  };
}

function renderOccurrenceDataLabelMarkup(
  kind: 'root' | 'terminal',
  occurrence: RuntimeNeighborhoodOccurrence,
  reviewScene: ReviewScene,
  projector: ReturnType<typeof createProjector>,
  viewport: Viewport,
  opacity: number,
  scale: number
) {
  const projected = projector.project(scaleCoordinate(occurrence.embedding.coordinate));
  if (!projected.visible) {
    return null;
  }

  const label = buildOccurrenceDataLabel(kind, occurrence, reviewScene);
  if (!label) {
    return null;
  }

  const labelScale = Math.max(scale, 0.8);
  const labelWidth = Math.max(92, ((label.text.length * 7.4) + 18) * labelScale);
  const labelHeight = 22 * labelScale;
  const labelX = clampNumber(
    occurrence.terminal ? projected.x + 16 : projected.x - (labelWidth * 0.5),
    viewport.x + 8,
    viewport.x + viewport.width - labelWidth - 8
  );
  const labelY = clampNumber(
    occurrence.terminal ? projected.y - 18 : projected.y - 34,
    viewport.y + 8,
    viewport.y + viewport.height - labelHeight - 8
  );
  const labelAnchorX = labelX > projected.x ? labelX : labelX + labelWidth;
  const labelAnchorY = labelY + (labelHeight * 0.5);
  const leader = occurrence.terminal
    ? `<line x1="${roundNumber(projected.x)}" y1="${roundNumber(projected.y)}" x2="${roundNumber(labelAnchorX)}" y2="${roundNumber(labelAnchorY)}" stroke="${label.strokeColor}" stroke-width="1.5" opacity="${roundNumber(Math.min(opacity + 0.08, 1))}" />`
    : '';

  return {
    depth: projected.depth + 0.01,
    markup: [
      leader,
      `<rect x="${roundNumber(labelX)}" y="${roundNumber(labelY)}" width="${roundNumber(labelWidth)}" height="${roundNumber(labelHeight)}" rx="${roundNumber(labelHeight * 0.5)}" fill="${label.fillColor}" stroke="${label.strokeColor}" opacity="${roundNumber(opacity)}" />`,
      `<text x="${roundNumber(labelX + (9 * labelScale))}" y="${roundNumber(labelY + (15 * labelScale))}" class="move-label" style="font-size:${roundNumber(12 * labelScale)}px">${escapeXml(label.text)}</text>`
    ].join('')
  };
}

function renderOccurrenceMarkup(
  occurrence: RuntimeNeighborhoodOccurrence,
  projector: ReturnType<typeof createProjector>,
  sceneBootstrap: SceneBootstrap
) {
  const projected = projector.project(scaleCoordinate(occurrence.embedding.coordinate));
  if (!projected.visible) {
    return null;
  }

  const presentation = createOccurrencePresentation(occurrence, sceneBootstrap.accentColor);
  const radius = presentation.radius * 38;
  const haloRadius = presentation.haloRadius * 38;

  return {
    depth: projected.depth,
    markup: [
      `<circle cx="${roundNumber(projected.x)}" cy="${roundNumber(projected.y)}" r="${roundNumber(haloRadius)}" fill="${presentation.haloColor}" opacity="${occurrence.isFocus ? '0.46' : '0.22'}" />`,
      `<circle cx="${roundNumber(projected.x)}" cy="${roundNumber(projected.y)}" r="${roundNumber(radius)}" fill="${presentation.fillColor}" />`,
      `<circle cx="${roundNumber(projected.x)}" cy="${roundNumber(projected.y)}" r="${roundNumber(radius + 3)}" fill="none" stroke="${presentation.ringColor}" stroke-width="${occurrence.isFocus ? '2.4' : '1.4'}" opacity="${occurrence.isFocus ? '0.95' : '0.55'}" />`
    ].join('')
  };
}

function createProjector(reviewScene: ReviewScene, viewport: Viewport) {
  const scaledFocus = scaleCoordinate(reviewScene.cameraGrammar.lookAt);
  const cameraPosition = resolveOrbitCameraPosition(
    scaledFocus,
    reviewScene.cameraDistance,
    reviewScene.navigationEntryPoint.orbit
  );
  const upHint: Vector3 = [0, 1, 0];
  const forward = normalize(subtract(scaledFocus, cameraPosition), [0, 0, -1]);
  const right = normalize(cross(forward, upHint), [1, 0, 0]);
  const up = normalize(cross(right, forward), [0, 1, 0]);
  const aspectRatio = viewport.width / viewport.height;
  const fovScale = Math.tan((reviewScene.sceneBootstrap.camera.fov * Math.PI) / 360);

  return {
    project(point: Vector3): ProjectedPoint {
      const relativePoint = subtract(point, cameraPosition);
      const xCamera = dot(relativePoint, right);
      const yCamera = dot(relativePoint, up);
      const zCamera = dot(relativePoint, forward);

      if (zCamera <= 0.1) {
        return { x: 0, y: 0, depth: zCamera, visible: false };
      }

      const ndcX = xCamera / (zCamera * fovScale * aspectRatio);
      const ndcY = yCamera / (zCamera * fovScale);

      return {
        x: viewport.x + ((ndcX + 1) * 0.5 * viewport.width),
        y: viewport.y + ((1 - (ndcY + 1) * 0.5) * viewport.height),
        depth: zCamera,
        visible: Number.isFinite(ndcX) && Number.isFinite(ndcY)
      };
    }
  };
}

function buildFocusSummary(focusContext: ReviewFocusContext) {
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;
  const lineText = formatOccurrenceLine(focusContext.focusLine);

  return `The geometry remains primary here: SAN labels sit on the carriers themselves, terminal outcomes sit on terminal nodes, and this board is only a static reference check for the position after ${lineText} in ${formatGameName(rootGameId)}.`;
}

function buildStructureZoomTitle(focusContext: ReviewFocusContext) {
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;
  const incoming = focusContext.localTransitions
    .filter((entry) => entry.direction === 'incoming')
    .map((entry) => entry.transition.moveFacts.san)
    .join(', ');
  const outgoing = focusContext.localTransitions
    .filter((entry) => entry.direction === 'outgoing')
    .map((entry) => entry.transition.moveFacts.san)
    .join(', ');

  if (incoming && outgoing) {
    return `${formatGameName(rootGameId)}: ${incoming} to ${outgoing}`;
  }
  if (incoming || outgoing) {
    return `${formatGameName(rootGameId)}: ${incoming || outgoing}`;
  }
  return formatGameName(rootGameId);
}

function buildRefinementTitle(focusContext: ReviewFocusContext) {
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;
  const outgoing = focusContext.localTransitions
    .filter((entry) => entry.direction === 'outgoing')
    .map((entry) => entry.transition.moveFacts.san)
    .join(', ');

  if (outgoing) {
    return `${formatGameName(rootGameId)}: refinement toward ${outgoing}`;
  }
  return `${formatGameName(rootGameId)}: refinement steps`;
}

function buildCameraGrammarTitle(focusContext: ReviewFocusContext) {
  const rootGameId =
    focusContext.focusLine?.rootGameId ?? focusContext.focusOccurrence.embedding.rootGameId;

  return `${formatGameName(rootGameId)}: camera grammar pass`;
}

function formatCarrierLabel(
  carrier: RuntimeCarrierRecord,
  focusContext: ReviewFocusContext
) {
  const focusOccurrenceId = focusContext.focusOccurrence.occurrenceId;
  if (carrier.sourceOccurrenceId === focusOccurrenceId) {
    return `out ${carrier.san}`;
  }
  if (
    carrier.targetOccurrenceId === focusOccurrenceId ||
    isLineTransition(carrier, focusContext.focusLine)
  ) {
    return `in ${carrier.san}`;
  }

  return carrier.san;
}

function isLineTransition(
  carrier: RuntimeCarrierRecord,
  focusLine: RuntimeOccurrenceLine | null
) {
  if (!focusLine) {
    return false;
  }

  return focusLine.moves.some(
    (move) =>
      move.sourceOccurrenceId === carrier.sourceOccurrenceId &&
      move.targetOccurrenceId === carrier.targetOccurrenceId
  );
}

function buildOccurrenceDataLabel(
  kind: 'root' | 'terminal',
  occurrence: RuntimeNeighborhoodOccurrence,
  reviewScene: ReviewScene
) {
  if (kind === 'root') {
    return {
      text: formatGameName(occurrence.embedding.rootGameId),
      fillColor: '#f7f1e6',
      strokeColor: '#7a6a55'
    };
  }

  if (kind !== 'terminal' || !occurrence.terminal) {
    return null;
  }

  const incomingCarrier = reviewScene.carrierSurface.carriers.find(
    (carrier) => carrier.targetOccurrenceId === occurrence.occurrenceId
  );
  const outcomeText = formatTerminalOutcomeLabel(occurrence.terminal.wdlLabel);
  const text = incomingCarrier?.san
    ? `${incomingCarrier.san} · ${outcomeText}`
    : outcomeText;

  return {
    text,
    fillColor: '#ecf5ea',
    strokeColor: '#2f6b38'
  };
}

function renderInfoCard(
  x: number,
  y: number,
  width: number,
  heading: string,
  text: string,
  maxCharacters: number,
  className: string
) {
  const lines = wrapText(text, maxCharacters);
  const height = 48 + (lines.length * 20);

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="#f4eee4" stroke="#ddd5c7" />`,
    `<text x="${x + 16}" y="${y + 26}" class="metric-label">${escapeXml(heading)}</text>`,
    ...lines.map(
      (line, index) =>
        `<text x="${x + 16}" y="${y + 48 + (index * 20)}" class="${className}">${escapeXml(line)}</text>`
    )
  ].join('');
}

function renderLocalMoveList(
  x: number,
  y: number,
  width: number,
  localTransitions: ReviewLocalTransition[],
  maxMoves: number
) {
  if (localTransitions.length === 0) {
    return renderWrappedTextBlock(
      x,
      y,
      'No named incoming or outgoing moves were found for this focus occurrence.',
      Math.max(20, Math.floor(width / 8.5)),
      20,
      'copy'
    );
  }

  const visibleTransitions = localTransitions.slice(0, maxMoves);
  const rowHeight = 44;
  const rowStride = 52;
  const moveRows = visibleTransitions.map((entry, index) => {
    const rowY = y + (index * rowStride);
    const moveLabel = entry.transition.moveFacts.san || entry.transition.moveUci;
    const semantics = summarizeMoveSemantics(
      entry.transition.moveFacts,
      entry.transition.moveFamily
    );

    return [
      `<rect x="${x}" y="${rowY}" width="${width}" height="${rowHeight}" rx="14" fill="#f4eee4" stroke="#ddd5c7" />`,
      `<text x="${x + 16}" y="${rowY + 16}" class="metric-label">${escapeXml(entry.direction === 'incoming' ? 'Into focus' : 'From focus')}</text>`,
      `<text x="${x + 16}" y="${rowY + 34}" class="section-small">${escapeXml(moveLabel)}</text>`,
      `<text x="${x + 108}" y="${rowY + 34}" class="copy">${escapeXml(semantics)}</text>`
    ].join('');
  });
  const overflowCount = localTransitions.length - visibleTransitions.length;

  return [
    ...moveRows,
    overflowCount > 0
      ? `<text x="${x}" y="${y + (visibleTransitions.length * rowStride) + 18}" class="copy">${escapeXml(`+ ${overflowCount} more local moves in the fixture graph`)}</text>`
      : ''
  ].join('');
}

function renderBoardCard(
  x: number,
  y: number,
  width: number,
  stateKey: string
) {
  const parsedStateKey = parseStateKey(stateKey);
  const boardPadding = 18;
  const boardX = x + boardPadding;
  const boardY = y + 44;
  const boardSize = width - (boardPadding * 2);
  const squareSize = boardSize / 8;
  const footerY = boardY + boardSize + 24;
  const cardHeight = boardSize + 90;
  const enPassant = parsedStateKey.enPassant === '-' ? 'none' : parsedStateKey.enPassant;

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${cardHeight}" rx="22" fill="#f4eee4" stroke="#ddd5c7" />`,
    `<text x="${x + boardPadding}" y="${y + 28}" class="metric-label">Focus board</text>`,
    ...listBoardSquares(parsedStateKey).flatMap((square) => {
      const squareX = boardX + (square.fileIndex * squareSize);
      const squareY = boardY + (square.rankIndex * squareSize);
      const squareFill = square.squareColor === 'light' ? '#ead8ba' : '#9e7a52';
      const glyph = square.piece ? pieceGlyph(square.piece.code) : '';

      return [
        `<rect x="${roundNumber(squareX)}" y="${roundNumber(squareY)}" width="${roundNumber(squareSize)}" height="${roundNumber(squareSize)}" fill="${squareFill}" />`,
        square.piece
          ? `<text x="${roundNumber(squareX + (squareSize * 0.5))}" y="${roundNumber(squareY + (squareSize * 0.54))}" class="board-piece ${square.piece.color}">${glyph}</text>`
          : '',
        square.rankIndex === 7
          ? `<text x="${roundNumber(squareX + (squareSize * 0.5))}" y="${roundNumber(boardY + boardSize + 16)}" class="board-label" text-anchor="middle">${escapeXml(square.algebraic[0] ?? '')}</text>`
          : '',
        square.fileIndex === 0
          ? `<text x="${roundNumber(boardX - 8)}" y="${roundNumber(squareY + (squareSize * 0.58))}" class="board-label" text-anchor="end">${escapeXml(square.algebraic[1] ?? '')}</text>`
          : ''
      ];
    }),
    `<text x="${x + boardPadding}" y="${footerY}" class="board-copy">${escapeXml(formatTurnLabel(parsedStateKey.activeColor))}</text>`,
    `<text x="${x + boardPadding}" y="${footerY + 20}" class="board-copy">${escapeXml(`Castling ${formatCastlingRights(parsedStateKey.castling)} · e.p. ${enPassant}`)}</text>`
  ].join('');
}

function renderWrappedTextBlock(
  x: number,
  y: number,
  text: string,
  maxCharacters: number,
  lineHeight: number,
  className: string
) {
  return wrapText(text, maxCharacters)
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + (index * lineHeight)}" class="${className}">${escapeXml(line)}</text>`
    )
    .join('');
}

function wrapText(text: string, maxCharacters: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && nextLine.length > maxCharacters) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    currentLine = nextLine;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function renderBandLegendRow(
  x: number,
  y: number,
  structureColor: string,
  tacticalColor: string,
  contextualColor: string,
  label: string
) {
  return [
    `<line x1="${x}" y1="${y}" x2="${x + 54}" y2="${y}" stroke="${structureColor}" stroke-width="12" stroke-linecap="round" />`,
    `<line x1="${x + 12}" y1="${y}" x2="${x + 42}" y2="${y}" stroke="${tacticalColor}" stroke-width="4.5" stroke-linecap="round" />`,
    `<circle cx="${x + 56}" cy="${y}" r="4" fill="${contextualColor}" />`,
    `<circle cx="${x + 68}" cy="${y}" r="4" fill="${contextualColor}" />`,
    `<text x="${x + 92}" y="${y + 5}" class="copy">${escapeXml(label)}</text>`
  ].join('');
}

function renderPanelCaption(viewport: Viewport, refinementBudget: number) {
  return [
    `<text x="${viewport.x}" y="${viewport.y - 22}" class="section">Budget ${refinementBudget}</text>`,
    `<text x="${viewport.x}" y="${viewport.y + viewport.height + 28}" class="copy">${escapeXml(bandCaption(refinementBudget))}</text>`
  ].join('');
}

function buildAnchoredEntryPointCaptionCard(
  viewport: Viewport,
  reviewScene: ReviewScene
) {
  const entryPoint = reviewScene.navigationEntryPoint;
  const cardX = viewport.x;
  const cardY = viewport.y + viewport.height + 18;
  const descriptionLines = wrapText(entryPoint.description, 54);
  const cardHeight = 76 + (descriptionLines.length * 18);

  return {
    bottom: cardY + cardHeight,
    markup: [
      `<text x="${viewport.x}" y="${viewport.y - 22}" class="section">${escapeXml(`${entryPoint.label} · ply ${entryPoint.anchorPly}`)}</text>`,
      `<rect x="${cardX}" y="${cardY}" width="${viewport.width}" height="${cardHeight}" rx="18" fill="#f4eee4" stroke="#ddd5c7" />`,
      `<text x="${cardX + 18}" y="${cardY + 26}" class="section-small">${escapeXml(formatGameName(entryPoint.rootGameId))}</text>`,
      `<text x="${cardX + 18}" y="${cardY + 48}" class="copy">${escapeXml(`Radius ${reviewScene.runtimeSnapshot.radius} · distance ${reviewScene.cameraDistance.toFixed(1)}`)}</text>`,
      ...descriptionLines.map(
        (line, index) =>
          `<text x="${cardX + 18}" y="${cardY + 72 + (index * 18)}" class="copy">${escapeXml(line)}</text>`
      )
    ].join('')
  };
}

function renderCameraGrammarCaption(viewport: Viewport, reviewScene: ReviewScene) {
  const stage = describeCameraGrammarBand(reviewScene.cameraGrammar.band);

  return [
    `<text x="${viewport.x}" y="${viewport.y - 22}" class="section">${escapeXml(stage.label)}</text>`,
    `<text x="${viewport.x}" y="${viewport.y + viewport.height + 28}" class="copy">${escapeXml(`Distance ${reviewScene.cameraDistance.toFixed(1)} · budget ${reviewScene.runtimeSnapshot.refinementBudget} · ${stage.description}`)}</text>`
  ].join('');
}

function bandCaption(refinementBudget: number) {
  if (refinementBudget >= N10B_REVIEW_BUDGETS.contextual) {
    return 'Structure stays readable while tactical and contextual residue become visible.';
  }
  if (refinementBudget >= N10B_REVIEW_BUDGETS.tactical) {
    return 'A brighter inner core appears without changing the coarse move read.';
  }
  return 'Only the coarse structure ribbon is active.';
}

function renderSvgStyleBlock() {
  return [
    '<style>',
    '.eyebrow { font: 700 14px "Avenir Next", "Segoe UI", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; fill: #7a6a55; }',
    '.title { font: 700 30px "Iowan Old Style", "Palatino Linotype", serif; fill: #231f18; }',
    '.subtitle { font: 400 16px "Avenir Next", "Segoe UI", sans-serif; fill: #5f5547; }',
    '.section { font: 700 17px "Avenir Next", "Segoe UI", sans-serif; fill: #2c271f; }',
    '.section-small { font: 700 17px "Avenir Next", "Segoe UI", sans-serif; fill: #231f18; }',
    '.copy { font: 400 15px "Avenir Next", "Segoe UI", sans-serif; fill: #5f5547; }',
    '.metric-label { font: 700 12px "Avenir Next", "Segoe UI", sans-serif; letter-spacing: 0.08em; text-transform: uppercase; fill: #7a6a55; }',
    '.move-label { font: 700 12px "Avenir Next", "Segoe UI", sans-serif; fill: #231f18; }',
    '.board-label { font: 700 11px "Avenir Next", "Segoe UI", sans-serif; fill: #7a6a55; }',
    '.board-copy { font: 400 13px "Avenir Next", "Segoe UI", sans-serif; fill: #5f5547; }',
    '.board-piece { font: 700 28px "Georgia", "Times New Roman", serif; text-anchor: middle; dominant-baseline: middle; paint-order: stroke; }',
    '.board-piece.white { fill: #f0e6d0; stroke: #2b2116; stroke-width: 1.8px; }',
    '.board-piece.black { fill: #2a221b; stroke: #f7f0e4; stroke-width: 0.65px; }',
    '</style>'
  ].join('');
}

function buildPathData(samples: ProjectedPoint[]) {
  return samples.reduce((path, sample, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path}${command}${roundNumber(sample.x)} ${roundNumber(sample.y)} `;
  }, '');
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function subtract(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cross(left: Vector3, right: Vector3): Vector3 {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0])
  ];
}

function dot(left: Vector3, right: Vector3) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function normalize(vector: Vector3, fallback: Vector3): Vector3 {
  const vectorMagnitude = Math.hypot(vector[0], vector[1], vector[2]);
  if (vectorMagnitude <= 1e-6) {
    return fallback;
  }

  return [
    vector[0] / vectorMagnitude,
    vector[1] / vectorMagnitude,
    vector[2] / vectorMagnitude
  ];
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundNumber(value: number) {
  return Math.round(value * 1_000) / 1_000;
}
