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
  formatSubtreeLabel,
  formatTerminalOutcomeLabel,
  formatTurnLabel,
  listBoardSquares,
  parseStateKey,
  pieceGlyph,
  shortOccurrenceId,
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
  BuilderRepeatedStateRelationRecord,
  BuilderTransitionRecord,
  NavigationEntryPoint,
  NavigationEntryPointId,
  RuntimeArtifactBundle,
  RuntimeCarrierRecord,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  RuntimeTranspositionGroup,
  RuntimeTranspositionLink,
  RuntimeTranspositionOccurrence,
  RuntimeTranspositionSurfaceSnapshot,
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
import { buildRuntimeTranspositionSurface } from './transpositionSurface.ts';

type ReviewGraphViewScope = 'local-neighborhood' | 'whole-object';

type ReviewScene = {
  cameraDistance: number;
  cameraGrammar: CameraGrammarState;
  graphViewScope: ReviewGraphViewScope;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  transpositionSurface: RuntimeTranspositionSurfaceSnapshot;
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
  localTransitions: ReviewLocalTransition[];
};

type EntryPointReviewScene = {
  reviewScene: ReviewScene;
  focusContext: ReviewFocusContext;
};

type TranspositionReviewContext = {
  relation: BuilderRepeatedStateRelationRecord;
  focusContext: ReviewFocusContext;
  relationOccurrences: BuilderOccurrenceRecord[];
  localScene: ReviewScene;
  localGroup: RuntimeTranspositionGroup;
  wholeObjectScene: ReviewScene;
  wholeObjectGroup: RuntimeTranspositionGroup;
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
      builderBootstrapManifest,
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
  const transpositionReviewContext = buildTranspositionReviewContext({
    builderBootstrapManifest,
    kernel,
    navigationEntryPoints,
    runtimeConfig: viewerSceneManifest.runtime,
    sceneBootstrap
  });

  if (!focusContext) {
    throw new Error('expected middlegame entrypoint review context');
  }

  const focusPosition = parseStateKey(focusContext.focusOccurrence.stateKey);

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
      fileName: 'review/transposition-relations.svg',
      content: renderTranspositionRelationsDocument(transpositionReviewContext)
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
            subtreeKey: entryPoint.subtreeKey,
            anchorPly: entryPoint.anchorPly,
            neighborhoodRadius: entryPoint.neighborhoodRadius,
            distance: roundNumber(entryPoint.distance)
          })),
          subtreeKey: focusContext.focusOccurrence.embedding.subtreeKey,
          focusNode: {
            occurrenceId: focusContext.focusOccurrence.occurrenceId,
            ply: focusContext.focusOccurrence.ply,
            phaseLabel: focusContext.focusOccurrence.annotations.phaseLabel,
            materialSignature: focusContext.focusOccurrence.annotations.materialSignature
          },
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
          transpositionReview: {
            stateKey: transpositionReviewContext.relation.stateKey,
            focusOccurrenceId: transpositionReviewContext.focusContext.focusOccurrence.occurrenceId,
            occurrenceIds: transpositionReviewContext.relation.occurrenceIds,
            localNeighborhoodRadius: transpositionReviewContext.localScene.runtimeSnapshot.radius,
            localCameraDistance: roundNumber(transpositionReviewContext.localScene.cameraDistance),
            wholeObjectCameraDistance: roundNumber(
              transpositionReviewContext.wholeObjectScene.cameraDistance
            ),
            localOffViewOccurrenceIds: transpositionReviewContext.localGroup.offViewOccurrenceIds,
            wholeObjectLinkCount: transpositionReviewContext.wholeObjectGroup.links.length
          },
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
              file: 'transposition-relations.svg',
              regime: 'transposition-relations',
              stateKey: transpositionReviewContext.relation.stateKey,
              occurrenceIds: transpositionReviewContext.relation.occurrenceIds,
              localNeighborhoodRadius: transpositionReviewContext.localScene.runtimeSnapshot.radius,
              localOffViewOccurrenceIds: transpositionReviewContext.localGroup.offViewOccurrenceIds,
              wholeObjectOccurrenceCount: transpositionReviewContext.wholeObjectGroup.occurrences.length,
              wholeObjectLinkCount: transpositionReviewContext.wholeObjectGroup.links.length
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
        transpositionReviewContext
      )
    }
  ];
}

function buildTranspositionReviewContext({
  builderBootstrapManifest,
  kernel,
  navigationEntryPoints,
  runtimeConfig,
  sceneBootstrap
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  kernel: ReturnType<typeof createRuntimeExplorationKernel>;
  navigationEntryPoints: NavigationEntryPoint[];
  runtimeConfig: ViewerSceneManifest['runtime'];
  sceneBootstrap: SceneBootstrap;
}) {
  const relation = selectTranspositionReviewRelation(
    builderBootstrapManifest.repeatedStateRelations
  );

  if (!relation) {
    throw new Error('expected repeated-state relation for N13 review artifacts');
  }

  const relationOccurrences = relation.occurrenceIds
    .map((occurrenceId) => kernel.resolveOccurrence(occurrenceId))
    .filter((occurrence): occurrence is BuilderOccurrenceRecord => occurrence !== undefined)
    .sort((left, right) => {
      if (left.ply !== right.ply) {
        return left.ply - right.ply;
      }

      if (left.embedding.subtreeKey !== right.embedding.subtreeKey) {
        return left.embedding.subtreeKey.localeCompare(right.embedding.subtreeKey);
      }

      return left.occurrenceId.localeCompare(right.occurrenceId);
    });

  if (relationOccurrences.length < 2) {
    throw new Error('expected N13 review relation to resolve at least two occurrences');
  }

  const focusOccurrence = relationOccurrences[0]!;
  const reviewEntryPoint = resolveNavigationEntryPoint(
    navigationEntryPoints,
    resolveNavigationEntryPointIdFromPhase(focusOccurrence.annotations.phaseLabel)
  );
  const transpositionEntryPoint = {
    ...reviewEntryPoint,
    label: `${formatSubtreeLabel(focusOccurrence.embedding.subtreeKey)} transposition`,
    description:
      'Known repeated-state case used for N13 supporting evidence; local scope keeps the focus neighborhood while whole-object scope confirms the relation stays on the shared graph.',
    focusOccurrenceId: focusOccurrence.occurrenceId,
    neighborhoodRadius: 1,
    subtreeKey: focusOccurrence.embedding.subtreeKey,
    anchorPly: focusOccurrence.ply
  } satisfies NavigationEntryPoint;
  const localTranspositionEntryPoint = {
    ...transpositionEntryPoint,
    distance: Math.max(
      CAMERA_GRAMMAR_REVIEW_DISTANCES.contextual,
      reviewEntryPoint.distance - 1
    )
  } satisfies NavigationEntryPoint;
  const wholeObjectTranspositionEntryPoint = {
    ...transpositionEntryPoint,
    distance: Math.max(
      CAMERA_GRAMMAR_REVIEW_DISTANCES.structure,
      reviewEntryPoint.distance
    )
  } satisfies NavigationEntryPoint;
  const focusContext = buildReviewFocusContext(
    builderBootstrapManifest,
    kernel,
    focusOccurrence.occurrenceId
  );
  const localBaseScene = buildReviewScene({
    builderBootstrapManifest,
    kernel,
    sceneBootstrap,
    runtimeConfig,
    navigationEntryPoint: localTranspositionEntryPoint
  });
  const wholeObjectBaseScene = buildReviewScene({
    builderBootstrapManifest,
    kernel,
    sceneBootstrap,
    runtimeConfig,
    navigationEntryPoint: wholeObjectTranspositionEntryPoint,
    graphViewScope: 'whole-object'
  });
  const localGroup = resolveTranspositionReviewGroup(localBaseScene, relation.stateKey);
  const wholeObjectGroup = resolveTranspositionReviewGroup(
    wholeObjectBaseScene,
    relation.stateKey
  );
  const localScene = isolateTranspositionReviewScene(localBaseScene, localGroup);
  const wholeObjectScene = isolateTranspositionReviewScene(
    wholeObjectBaseScene,
    wholeObjectGroup
  );

  return {
    relation,
    focusContext,
    relationOccurrences,
    localScene,
    localGroup,
    wholeObjectScene,
    wholeObjectGroup
  } satisfies TranspositionReviewContext;
}

function selectTranspositionReviewRelation(
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[]
) {
  return repeatedStateRelations
    .filter((relation) => relation.occurrenceIds.length > 1)
    .sort((left, right) => {
      const leftPairRank = left.occurrenceIds.length === 2 ? 0 : 1;
      const rightPairRank = right.occurrenceIds.length === 2 ? 0 : 1;
      if (leftPairRank !== rightPairRank) {
        return leftPairRank - rightPairRank;
      }

      if (left.occurrenceIds.length !== right.occurrenceIds.length) {
        return left.occurrenceIds.length - right.occurrenceIds.length;
      }

      return left.stateKey.localeCompare(right.stateKey);
    })[0] ?? null;
}

function resolveNavigationEntryPointIdFromPhase(
  phaseLabel: string
): NavigationEntryPointId {
  if (phaseLabel === 'opening') {
    return 'opening';
  }
  if (phaseLabel === 'endgame') {
    return 'endgame';
  }

  return 'middlegame';
}

function resolveTranspositionReviewGroup(
  reviewScene: ReviewScene,
  stateKey: string
) {
  const relationGroup = reviewScene.transpositionSurface.groups.find(
    (group) => group.stateKey === stateKey
  );

  if (!relationGroup) {
    throw new Error(`expected transposition review group for state ${stateKey}`);
  }

  return relationGroup;
}

function isolateTranspositionReviewScene(
  reviewScene: ReviewScene,
  relationGroup: RuntimeTranspositionGroup
) {
  return {
    ...reviewScene,
    transpositionSurface: {
      graphObjectId: reviewScene.transpositionSurface.graphObjectId,
      groups: [relationGroup],
      links: relationGroup.links
    }
  } satisfies ReviewScene;
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
      builderBootstrapManifest: runtimeBootstrap.builderBootstrapManifest,
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
  builderBootstrapManifest,
  kernel,
  sceneBootstrap,
  runtimeConfig,
  navigationEntryPoint,
  graphViewScope = 'local-neighborhood'
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  kernel: ReturnType<typeof createRuntimeExplorationKernel>;
  sceneBootstrap: SceneBootstrap;
  runtimeConfig: ViewerSceneManifest['runtime'];
  navigationEntryPoint: NavigationEntryPoint;
  graphViewScope?: ReviewGraphViewScope;
}): ReviewScene {
  const refinementBudget = resolveCameraGrammarRefinementBudget(
    navigationEntryPoint.distance,
    runtimeConfig
  );
  const runtimeSnapshot =
    graphViewScope === 'whole-object'
      ? kernel.inspectWholeGraph(navigationEntryPoint.focusOccurrenceId, {
          refinementBudget
        })
      : kernel.inspectNeighborhood(navigationEntryPoint.focusOccurrenceId, {
          radius: navigationEntryPoint.neighborhoodRadius,
          refinementBudget
        });
  const carrierSurface = kernel.inspectCarrierSurface(
    runtimeSnapshot.occurrences.map((occurrence) => occurrence.occurrenceId),
    { refinementBudget }
  );
  const transpositionSurface = buildRuntimeTranspositionSurface(
    builderBootstrapManifest,
    runtimeSnapshot,
    graphViewScope
  );

  return {
    cameraDistance: navigationEntryPoint.distance,
    cameraGrammar: createCameraGrammarState({
      cameraDistance: navigationEntryPoint.distance,
      runtimeConfig,
      runtimeSnapshot
    }),
    graphViewScope,
    sceneBootstrap,
    navigationEntryPoint,
    runtimeSnapshot,
    carrierSurface,
    transpositionSurface
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
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#f2ecdf" />',
    '<rect x="24" y="24" width="1452" height="932" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />',
    '<text x="48" y="62" class="eyebrow">Viewer review artifact</text>',
    `<text x="48" y="96" class="title">${escapeXml(buildStructureZoomTitle(focusContext))}</text>`,
    `<text x="48" y="124" class="subtitle">${escapeXml(formatSubtreeLabel(subtreeKey))} · ${escapeXml(formatTurnLabel(focusPosition.activeColor))} · radius ${neighborhoodRadius} · distance ${reviewScene.cameraDistance.toFixed(1)} · budget ${reviewScene.runtimeSnapshot.refinementBudget}</text>`,
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
      'Focused node',
      buildFocusNodeDescriptor(focusContext),
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
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#ece4d7" />',
    '<rect x="24" y="24" width="1652" height="872" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />',
    '<text x="40" y="62" class="eyebrow">Viewer refinement review</text>',
    `<text x="40" y="96" class="title">${escapeXml(buildRefinementTitle(focusContext))}</text>`,
    `<text x="40" y="124" class="subtitle">${escapeXml(formatSubtreeLabel(subtreeKey))} · ${escapeXml(formatTurnLabel(focusPosition.activeColor))} · fixed radius ${neighborhoodRadius}</text>`,
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
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#eee7db" />',
    '<rect x="24" y="24" width="1652" height="932" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />',
    '<text x="40" y="62" class="eyebrow">N11 camera grammar review</text>',
    `<text x="40" y="96" class="title">${escapeXml(buildCameraGrammarTitle(focusContext))}</text>`,
    `<text x="40" y="124" class="subtitle">${escapeXml(formatSubtreeLabel(subtreeKey))} · ${escapeXml(formatTurnLabel(focusPosition.activeColor))} · radius ${neighborhoodRadius}</text>`,
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

function renderTranspositionRelationsDocument(
  transpositionReviewContext: TranspositionReviewContext
) {
  const width = 1700;
  const leftViewport = { x: 40, y: 176, width: 768, height: 620 };
  const rightViewport = { x: 892, y: 176, width: 768, height: 620 };
  const localCaption = renderTranspositionSceneCaption(
    leftViewport,
    'Local neighborhood',
    transpositionReviewContext.localScene,
    transpositionReviewContext.localGroup,
    'The focus neighborhood stays intact while the repeated sibling is promoted as an off-view echo instead of collapsing into the same node.'
  );
  const wholeObjectCaption = renderTranspositionSceneCaption(
    rightViewport,
    'Whole object',
    transpositionReviewContext.wholeObjectScene,
    transpositionReviewContext.wholeObjectGroup,
    'Whole-object scope keeps the repeated occurrences stitched into the same graph view so the relation reads as part of one object.'
  );
  const occurrenceCardY = Math.max(localCaption.bottom, wholeObjectCaption.bottom) + 24;
  const expectedReadY = occurrenceCardY;
  const legendY = occurrenceCardY + 188;
  const height = legendY + 42;
  const focusOccurrence = transpositionReviewContext.focusContext.focusOccurrence;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    renderSvgStyleBlock(),
    '<rect width="100%" height="100%" fill="#ede6da" />',
    `<rect x="24" y="24" width="1652" height="${height - 48}" rx="28" fill="#fbf7ef" stroke="#ddd5c7" />`,
    '<text x="40" y="62" class="eyebrow">N13 transposition relation review</text>',
    '<text x="40" y="96" class="title">Repeated states remain visible relations across separate occurrences</text>',
    `<text x="40" y="124" class="subtitle">${escapeXml(formatSubtreeLabel(focusOccurrence.embedding.subtreeKey))} · focus ply ${focusOccurrence.ply} · current graph size ${transpositionReviewContext.wholeObjectScene.runtimeSnapshot.occurrences.length}</text>`,
    renderScenePanel(
      transpositionReviewContext.localScene,
      transpositionReviewContext.focusContext,
      leftViewport,
      'transposition-local-panel',
      { showTranspositionSurface: true }
    ),
    renderScenePanel(
      transpositionReviewContext.wholeObjectScene,
      transpositionReviewContext.focusContext,
      rightViewport,
      'transposition-whole-panel',
      { showTranspositionSurface: true }
    ),
    localCaption.markup,
    wholeObjectCaption.markup,
    renderTranspositionOccurrenceCard(
      40,
      occurrenceCardY,
      768,
      transpositionReviewContext
    ),
    renderInfoCard(
      892,
      expectedReadY,
      768,
      'Expected read',
      'The repeated state should read as a stitched relation between separate occurrences. Local scope should keep the focus occurrence primary while whole-object scope should keep the same relation readable without turning it into a detached overlay or collapsing node identity.',
      88,
      'copy'
    ),
    renderTranspositionLegendRow(
      40,
      legendY,
      'Dark stitched arcs and amber knots come directly from the repeated-state query surface. Pale echo nodes mark off-view repeated occurrences without merging them into the visible neighborhood.'
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
  transpositionReviewContext: TranspositionReviewContext
) {
  const focusOccurrence = transpositionReviewContext.focusContext.focusOccurrence;
  const focusPosition = parseStateKey(focusOccurrence.stateKey);

  return [
    '# N13 Review Notes',
    '',
    'Use this file as the human verdict record for the live N13 interactive review.',
    'Do not answer the transposition-legibility question from the static SVG artifacts alone; they are supporting evidence only.',
    '',
    '## Run context',
    `- graphObjectId: ${graphObjectId}`,
    `- sceneId: ${sceneId}`,
    `- graphOccurrenceCount: ${graphScale.occurrenceCount}`,
    `- graphEdgeCount: ${graphScale.edgeCount}`,
    `- scaleGate: ${graphScale.occurrenceCount >= 1000 ? 'meets the requested 1000+ node live-view threshold' : `insufficient for the requested 1000+ node live-view threshold (${graphScale.occurrenceCount} total nodes in current artifact set)`}`,
    ...navigationEntryPoints.map(
      (entryPoint) =>
        `- ${entryPoint.entryId} anchor: ${entryPoint.focusOccurrenceId} · ${formatSubtreeLabel(entryPoint.subtreeKey)} · ply ${entryPoint.anchorPly} · radius ${entryPoint.neighborhoodRadius} · distance ${entryPoint.distance.toFixed(1)}`
    ),
    `- transpositionStateKey: ${transpositionReviewContext.relation.stateKey}`,
    `- transpositionOccurrenceCount: ${transpositionReviewContext.relation.occurrenceIds.length}`,
    `- transpositionFocusNode: ${buildFocusNodeDescriptor(transpositionReviewContext.focusContext)}`,
    `- transpositionFocusTurn: ${formatTurnLabel(focusPosition.activeColor)}`,
    `- transpositionLocalRadius: ${transpositionReviewContext.localScene.runtimeSnapshot.radius}`,
    `- transpositionLocalDistance: ${transpositionReviewContext.localScene.cameraDistance.toFixed(1)}`,
    `- transpositionWholeObjectDistance: ${transpositionReviewContext.wholeObjectScene.cameraDistance.toFixed(1)}`,
    `- transpositionLocalOffViewEchoes: ${transpositionReviewContext.localGroup.offViewOccurrenceIds.length}`,
    `- transpositionWholeObjectLinks: ${transpositionReviewContext.wholeObjectGroup.links.length}`,
    '',
    '## Required live review',
    '- start from the known repeated-state focus recorded above or select that occurrence from the focus menu in the live viewer',
    '- inspect both local-neighborhood scope and whole-object scope in one session before recording the verdict',
    '- drag on the canvas to orbit and use scroll or the distance slider to test whether the stitched relation stays readable across camera changes',
    '- switch across the opening, middlegame, and endgame entrypoints before and after inspecting the repeated-state focus to confirm the relation still reads as part of the same shared object',
    '- click the repeated occurrence cards or echo nodes to confirm the viewer changes focus without merging occurrence identity',
    '- record screenshots or screen capture from the live viewer after the interactive pass',
    '',
    '## Supporting artifacts',
    '- review/transposition-relations.svg',
    '- review/anchored-entrypoints.svg',
    '- review/structure-zoom.svg',
    '- review/refinement-steps.svg',
    '- review/camera-grammar.svg',
    '',
    '## Reviewer',
    '- name:',
    '- date:',
    '',
    '## Relation verdict',
    '- the known repeated state rendered as multiple occurrences rather than collapsing into a single node:',
    '- the stitched relation stayed readable in whole-object scope:',
    '- the local-neighborhood view surfaced the off-view echo without losing the focused occurrence as the primary anchor:',
    '- switching entrypoints or focusing the repeated sibling still read as one shared object rather than a detached overlay:',
    '',
    '## Carryover checks',
    '- orbiting still kept the focused repeated position legible while preserving the surrounding branch context:',
    '- zooming closer still changed only legibility and emphasis, not occurrence identity or regime continuity:',
    '- zooming back out still kept the repeated-state relation visible enough to track without introducing a regime seam:',
    '- what still needs iteration:',
    '',
    '## Settlement note',
    '- N13 settled: no / yes',
    '- if yes, reference the commit that updates plan/completion-log.md and plan/continuation.md',
    '',
    'Do not mark N13 settled without recorded human review.'
  ].join('\n');
}

function renderScenePanel(
  reviewScene: ReviewScene,
  focusContext: ReviewFocusContext,
  viewport: Viewport,
  panelId: string,
  options?: {
    showTranspositionSurface?: boolean;
  }
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
  const transpositionLinkMarkup = options?.showTranspositionSurface
    ? reviewScene.transpositionSurface.links
        .map((link) => renderTranspositionLinkMarkup(link, projector))
        .filter((link): link is { depth: number; markup: string } => link !== null)
        .sort((left, right) => right.depth - left.depth)
        .map((link) => link.markup)
        .join('')
    : '';
  const nodeMarkup = reviewScene.runtimeSnapshot.occurrences
    .map((occurrence) => renderOccurrenceMarkup(occurrence, projector, reviewScene.sceneBootstrap))
    .filter((occurrence): occurrence is { depth: number; markup: string } => occurrence !== null)
    .sort((left, right) => right.depth - left.depth)
    .map((occurrence) => occurrence.markup)
    .join('');
  const transpositionEchoMarkup = options?.showTranspositionSurface
    ? reviewScene.transpositionSurface.groups
        .flatMap((group) => group.occurrences)
        .filter((occurrence) => !occurrence.isVisibleInNeighborhood)
        .map((occurrence) => renderTranspositionEchoMarkup(occurrence, projector))
        .filter(
          (occurrence): occurrence is { depth: number; markup: string } => occurrence !== null
        )
        .sort((left, right) => right.depth - left.depth)
        .map((occurrence) => occurrence.markup)
        .join('')
    : '';
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
  const focusPoint = projector.project(
    scaleCoordinate(reviewScene.cameraGrammar.focusCoordinate)
  );
  const clipId = `${panelId}-clip`;

  return [
    `<defs><clipPath id="${clipId}"><rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" rx="26" /></clipPath></defs>`,
    `<rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" rx="26" fill="#fdfbf6" stroke="#dcd3c4" />`,
    `<ellipse cx="${roundNumber(viewport.x + (viewport.width * 0.5))}" cy="${roundNumber(viewport.y + (viewport.height * 0.88))}" rx="${roundNumber(viewport.width * 0.28)}" ry="${roundNumber(viewport.height * 0.06)}" fill="#ece3d3" opacity="0.72" />`,
    `<g clip-path="url(#${clipId})">`,
    carrierMarkup,
    transpositionLinkMarkup,
    nodeMarkup,
    transpositionEchoMarkup,
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
  const fillColor = isOutgoing
    ? '#deebf4'
    : isFocusAdjacent
      ? '#fdebd2'
      : '#f7f1e6';
  const strokeColor = isOutgoing
    ? '#3a6b87'
    : isFocusAdjacent
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

function renderTranspositionLinkMarkup(
  link: RuntimeTranspositionLink,
  projector: ReturnType<typeof createProjector>
) {
  const projectedSamples = link.samples.map((sample) =>
    projector.project(scaleCoordinate(sample))
  );
  const visibleSamples = projectedSamples.filter((sample) => sample.visible);
  if (visibleSamples.length < 2) {
    return null;
  }

  const averageDepth =
    visibleSamples.reduce((depth, sample) => depth + sample.depth, 0) /
    visibleSamples.length;
  const touchesGhost =
    !link.sourceVisibleInNeighborhood || !link.targetVisibleInNeighborhood;
  const path = buildPathData(visibleSamples);
  const centerSample = visibleSamples[Math.floor(visibleSamples.length / 2)] ?? visibleSamples[0];
  const coreColor = link.emphasis === 'focus' ? '#0f172a' : '#334155';
  const haloColor = link.emphasis === 'focus' ? '#dbe7f6' : '#e2e8f0';
  const haloWidth = touchesGhost ? 15 : link.emphasis === 'focus' ? 12 : 9;
  const coreWidth = touchesGhost ? 7 : link.emphasis === 'focus' ? 5.8 : 4.2;

  return {
    depth: averageDepth + 0.02,
    markup: [
      `<path d="${path}" fill="none" stroke="${haloColor}" stroke-width="${haloWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${touchesGhost ? '0.72' : '0.42'}" />`,
      `<path d="${path}" fill="none" stroke="${coreColor}" stroke-width="${coreWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${touchesGhost ? '0.92' : '0.78'}" />`,
      centerSample
        ? `<circle cx="${roundNumber(centerSample.x)}" cy="${roundNumber(centerSample.y)}" r="${touchesGhost ? '8' : '6'}" fill="#d97706" opacity="0.94" />`
        : ''
    ].join('')
  };
}

function renderTranspositionEchoMarkup(
  occurrence: RuntimeTranspositionOccurrence,
  projector: ReturnType<typeof createProjector>
) {
  const projected = projector.project(scaleCoordinate(occurrence.coordinate));
  if (!projected.visible) {
    return null;
  }

  return {
    depth: projected.depth + 0.01,
    markup: [
      `<circle cx="${roundNumber(projected.x)}" cy="${roundNumber(projected.y)}" r="10" fill="#eff6ff" stroke="#0f172a" stroke-width="3" opacity="0.94" />`,
      `<circle cx="${roundNumber(projected.x)}" cy="${roundNumber(projected.y)}" r="3.5" fill="#d97706" opacity="0.95" />`
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
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;

  return `The geometry remains primary here: SAN labels sit on the carriers themselves, terminal outcomes sit on terminal nodes, and this board is only a static reference check for ${buildFocusNodeDescriptor(focusContext)} in ${formatSubtreeLabel(subtreeKey)}.`;
}

function buildStructureZoomTitle(focusContext: ReviewFocusContext) {
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;
  const incoming = focusContext.localTransitions
    .filter((entry) => entry.direction === 'incoming')
    .map((entry) => entry.transition.moveFacts.san)
    .join(', ');
  const outgoing = focusContext.localTransitions
    .filter((entry) => entry.direction === 'outgoing')
    .map((entry) => entry.transition.moveFacts.san)
    .join(', ');

  if (incoming && outgoing) {
    return `${formatSubtreeLabel(subtreeKey)}: ${incoming} to ${outgoing}`;
  }
  if (incoming || outgoing) {
    return `${formatSubtreeLabel(subtreeKey)}: ${incoming || outgoing}`;
  }
  return formatSubtreeLabel(subtreeKey);
}

function buildRefinementTitle(focusContext: ReviewFocusContext) {
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;
  const outgoing = focusContext.localTransitions
    .filter((entry) => entry.direction === 'outgoing')
    .map((entry) => entry.transition.moveFacts.san)
    .join(', ');

  if (outgoing) {
    return `${formatSubtreeLabel(subtreeKey)}: refinement toward ${outgoing}`;
  }
  return `${formatSubtreeLabel(subtreeKey)}: refinement steps`;
}

function buildCameraGrammarTitle(focusContext: ReviewFocusContext) {
  const subtreeKey = focusContext.focusOccurrence.embedding.subtreeKey;

  return `${formatSubtreeLabel(subtreeKey)}: camera grammar pass`;
}

function buildFocusNodeDescriptor(focusContext: ReviewFocusContext) {
  const { focusOccurrence } = focusContext;
  const descriptor = `ply ${focusOccurrence.ply} · ${focusOccurrence.annotations.phaseLabel} · ${focusOccurrence.annotations.materialSignature}`;

  if (!focusOccurrence.terminal) {
    return descriptor;
  }

  return `${descriptor} · terminal ${formatTerminalOutcomeLabel(focusOccurrence.terminal.wdlLabel)}`;
}

function formatCarrierLabel(
  carrier: RuntimeCarrierRecord,
  focusContext: ReviewFocusContext
) {
  const focusOccurrenceId = focusContext.focusOccurrence.occurrenceId;
  if (carrier.sourceOccurrenceId === focusOccurrenceId) {
    return `out ${carrier.san}`;
  }
  if (carrier.targetOccurrenceId === focusOccurrenceId) {
    return `in ${carrier.san}`;
  }

  return carrier.san;
}

function buildOccurrenceDataLabel(
  kind: 'root' | 'terminal',
  occurrence: RuntimeNeighborhoodOccurrence,
  reviewScene: ReviewScene
) {
  if (kind === 'root') {
    return {
      text: formatSubtreeLabel(occurrence.embedding.subtreeKey),
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

function renderTranspositionSceneCaption(
  viewport: Viewport,
  title: string,
  reviewScene: ReviewScene,
  relationGroup: RuntimeTranspositionGroup,
  description: string
) {
  const cardY = viewport.y + viewport.height + 18;
  const descriptionLines = wrapText(description, 70);
  const cardHeight = 78 + (descriptionLines.length * 18);
  const statLine =
    reviewScene.graphViewScope === 'whole-object'
      ? `${relationGroup.occurrences.length} occurrences · ${relationGroup.links.length} stitched links`
      : `radius ${reviewScene.runtimeSnapshot.radius} · visible ${relationGroup.visibleOccurrenceIds.length} · off-view echoes ${relationGroup.offViewOccurrenceIds.length}`;

  return {
    bottom: cardY + cardHeight,
    markup: [
      `<text x="${viewport.x}" y="${viewport.y - 22}" class="section">${escapeXml(title)}</text>`,
      `<rect x="${viewport.x}" y="${cardY}" width="${viewport.width}" height="${cardHeight}" rx="18" fill="#f4eee4" stroke="#ddd5c7" />`,
      `<text x="${viewport.x + 18}" y="${cardY + 26}" class="section-small">${escapeXml(statLine)}</text>`,
      `<text x="${viewport.x + 18}" y="${cardY + 48}" class="copy">${escapeXml(`Focus ${shortOccurrenceId(reviewScene.runtimeSnapshot.focusOccurrenceId)} · distance ${reviewScene.cameraDistance.toFixed(1)}`)}</text>`,
      ...descriptionLines.map(
        (line, index) =>
          `<text x="${viewport.x + 18}" y="${cardY + 72 + (index * 18)}" class="copy">${escapeXml(line)}</text>`
      )
    ].join('')
  };
}

function renderTranspositionOccurrenceCard(
  x: number,
  y: number,
  width: number,
  transpositionReviewContext: TranspositionReviewContext
) {
  const stateKeyLines = wrapText(
    transpositionReviewContext.relation.stateKey,
    Math.max(42, Math.floor((width - 32) / 8.4))
  );
  const rowY = y + 76 + (stateKeyLines.length * 18);
  const rowHeight = 52;
  const cardHeight = rowY - y + (transpositionReviewContext.relationOccurrences.length * rowHeight) + 18;

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${cardHeight}" rx="18" fill="#f4eee4" stroke="#ddd5c7" />`,
    `<text x="${x + 16}" y="${y + 26}" class="metric-label">Repeated-state cluster</text>`,
    ...stateKeyLines.map(
      (line, index) =>
        `<text x="${x + 16}" y="${y + 50 + (index * 18)}" class="copy">${escapeXml(line)}</text>`
    ),
    ...transpositionReviewContext.relationOccurrences.map((occurrence, index) => {
      const currentRowY = rowY + (index * rowHeight);
      const isFocus = occurrence.occurrenceId === transpositionReviewContext.focusContext.focusOccurrence.occurrenceId;
      const localStatus = describeTranspositionOccurrenceStatus(
        occurrence,
        transpositionReviewContext.localGroup,
        transpositionReviewContext.focusContext.focusOccurrence.occurrenceId
      );

      return [
        `<rect x="${x + 12}" y="${currentRowY}" width="${width - 24}" height="44" rx="14" fill="#fbf7ef" stroke="#ddd5c7" />`,
        `<circle cx="${x + 34}" cy="${currentRowY + 22}" r="7" fill="${isFocus ? '#d97706' : '#0f172a'}" />`,
        `<text x="${x + 50}" y="${currentRowY + 16}" class="metric-label">${escapeXml(isFocus ? 'Focus occurrence' : 'Repeated sibling')}</text>`,
        `<text x="${x + 50}" y="${currentRowY + 34}" class="section-small">${escapeXml(`${formatSubtreeLabel(occurrence.embedding.subtreeKey)} · ply ${occurrence.ply} · ${occurrence.annotations.phaseLabel}`)}</text>`,
        `<text x="${x + 340}" y="${currentRowY + 34}" class="copy">${escapeXml(`${localStatus} · ${shortOccurrenceId(occurrence.occurrenceId)}`)}</text>`
      ].join('');
    })
  ].join('');
}

function describeTranspositionOccurrenceStatus(
  occurrence: BuilderOccurrenceRecord,
  relationGroup: RuntimeTranspositionGroup,
  focusOccurrenceId: string
) {
  if (occurrence.occurrenceId === focusOccurrenceId) {
    return 'local focus';
  }
  if (relationGroup.visibleOccurrenceIds.includes(occurrence.occurrenceId)) {
    return 'visible in local scope';
  }

  return 'off-view echo in local scope';
}

function renderTranspositionLegendRow(
  x: number,
  y: number,
  label: string
) {
  const path = `M${x} ${y} C ${x + 18} ${y - 18}, ${x + 42} ${y + 18}, ${x + 62} ${y}`;

  return [
    `<path d="${path}" fill="none" stroke="#dbe7f6" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.72" />`,
    `<path d="${path}" fill="none" stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />`,
    `<circle cx="${x + 34}" cy="${y}" r="6" fill="#d97706" opacity="0.94" />`,
    `<circle cx="${x + 98}" cy="${y}" r="10" fill="#eff6ff" stroke="#0f172a" stroke-width="3" opacity="0.94" />`,
    `<circle cx="${x + 98}" cy="${y}" r="3.5" fill="#d97706" opacity="0.95" />`,
    `<text x="${x + 124}" y="${y + 5}" class="copy">${escapeXml(label)}</text>`
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
      `<text x="${cardX + 18}" y="${cardY + 26}" class="section-small">${escapeXml(formatSubtreeLabel(entryPoint.subtreeKey))}</text>`,
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
