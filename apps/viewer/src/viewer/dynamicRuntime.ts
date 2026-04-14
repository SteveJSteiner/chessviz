import { Chess, DEFAULT_POSITION, type Move, type PieceSymbol, validateFen } from 'chess.js';
import { createSceneBootstrap, materializeRuntimeBootstrap } from './bootstrap.ts';
import { deriveCameraOrbitState } from './cameraOrbit.ts';
import type {
  BuilderAnchorRecord,
  BuilderBootstrapManifest,
  BuilderCoverageMetadataRecord,
  BuilderDepartureRuleRecord,
  BuilderMoveFamilyRecord,
  BuilderMoveFactRecord,
  BuilderOccurrenceRecord,
  BuilderRegimeDeclaration,
  BuilderResolverInputRecord,
  BuilderTransitionRecord,
  NavigationEntryPoint,
  NavigationEntryPointId,
  RuntimeArtifactBundle,
  SceneBootstrap,
  ViewerSceneManifest
} from './contracts.ts';
import { clampLiveViewDistance, LIVE_VIEW_DISTANCE } from './labelPolicy.ts';
import {
  createAnchoredNavigationEntryPoints,
  resolveInitialNavigationEntryPointId
} from './navigation.ts';

const DYNAMIC_SCHEMA_VERSION = '2026-04-13.dynamic.v1';
const DYNAMIC_SOURCE_VERSION = '2026-04-13.dynamic-js';
const DYNAMIC_SOURCE_LOCATION = 'browser://viewer/dynamic-runtime';
const DYNAMIC_COVERAGE_ID = 'coverage:dynamic-runtime';
const DYNAMIC_RESOLVER_INPUT_ID = 'resolver:dynamic-runtime';
const DEFAULT_DYNAMIC_DEPTH = 2;
const DEFAULT_DYNAMIC_BRANCHING = 20;
const MAX_DYNAMIC_DEPTH = 4;
const MAX_DYNAMIC_BRANCHING = 32;

const PIECE_NAME_BY_SYMBOL: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king'
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

type ViewerRuntimeBootstrap = {
  builderBootstrapManifest: BuilderBootstrapManifest;
  viewerSceneManifest: ViewerSceneManifest;
  sceneBootstrap: SceneBootstrap;
  initialFocusOccurrenceId: string;
};

export type ViewerRuntimeSource = {
  runtimeBootstrap: ViewerRuntimeBootstrap;
  navigationEntryPoints: NavigationEntryPoint[];
  initialEntryPointId: NavigationEntryPointId;
  mode: 'dynamic' | 'artifacts';
};

export type DynamicRuntimeOptions = {
  fen: string;
  maxDepth: number;
  maxBranching: number;
};

type GeneratedOccurrence = {
  occurrenceId: string;
  stateKey: string;
  path: string[];
  ply: number;
  phaseLabel: string;
  materialSignature: string;
  subtreeKey: string;
  coordinate: [number, number, number];
  azimuth: number;
  elevation: number;
  ballRadius: number;
  terminal: BuilderOccurrenceRecord['terminal'];
};

type GeneratedTransition = {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  moveUci: string;
  ply: number;
  moveFacts: BuilderMoveFactRecord;
  moveFamily: BuilderMoveFamilyRecord;
};

type DynamicOccurrenceScore = {
  rawScore: number;
  frequencySignal: number;
  terminalPullSignal: number;
  centralitySignal: number;
  normalizedScore: number;
  priorityRank: number;
  priorityBand: 'frontier' | 'context' | 'detail';
  retainFromZoom: 'far' | 'mid' | 'close';
};

type QueueEntry = {
  boardFen: string;
  occurrenceId: string;
  path: string[];
  ply: number;
  depth: number;
  subtreeKey: string;
  sectorStart: number;
  sectorEnd: number;
};

export function resolveViewerRuntimeSource(
  runtimeArtifactBundle: RuntimeArtifactBundle,
  locationSearch: string
): ViewerRuntimeSource {
  const searchParams = new URLSearchParams(locationSearch);

  if (searchParams.get('source') === 'artifacts') {
    return createArtifactRuntimeSource(runtimeArtifactBundle);
  }

  return createDynamicRuntimeSource(
    runtimeArtifactBundle.viewerSceneManifest,
    resolveDynamicRuntimeOptions(searchParams)
  );
}

export function resolveDynamicRuntimeOptions(
  searchParams: URLSearchParams
): DynamicRuntimeOptions {
  return {
    fen: normalizeFenInput(
      searchParams.get('fen') ?? searchParams.get('state') ?? DEFAULT_POSITION
    ),
    maxDepth: parseIntegerParameter(
      searchParams.get('depth'),
      DEFAULT_DYNAMIC_DEPTH,
      1,
      MAX_DYNAMIC_DEPTH
    ),
    maxBranching: parseIntegerParameter(
      searchParams.get('branch'),
      DEFAULT_DYNAMIC_BRANCHING,
      1,
      MAX_DYNAMIC_BRANCHING
    )
  };
}

export function createDynamicRuntimeSource(
  baseSceneManifest: ViewerSceneManifest,
  options: DynamicRuntimeOptions
): ViewerRuntimeSource {
  const builderBootstrapManifest = buildDynamicBootstrapManifest(options);
  const rootOccurrence = builderBootstrapManifest.occurrences[0];

  if (!rootOccurrence) {
    throw new Error('dynamic runtime generation produced no root occurrence');
  }

  const focusCandidateOccurrenceIds = resolveDynamicFocusCandidates(
    builderBootstrapManifest,
    rootOccurrence.occurrenceId
  );
  const viewerSceneManifest = {
    ...baseSceneManifest,
    sceneId: 'dynamic-runtime-exploration',
    title: 'Dynamic Runtime Graph',
    summary: `Browser-generated legal-move graph from ${rootOccurrence.stateKey}. Depth ${options.maxDepth}, branch cap ${options.maxBranching}.`,
    runtime: {
      ...baseSceneManifest.runtime,
      graphObjectId: builderBootstrapManifest.graphObjectId,
      bootstrap: {
        ...baseSceneManifest.runtime.bootstrap,
        representationSchemaVersion: DYNAMIC_SCHEMA_VERSION,
        seedSurface: 'browser-dynamic-fen',
        focusCandidatesSource: 'browser-dynamic-salience',
        entrypointDerivation: 'browser-dynamic-single-entry',
        webCorpusManifest: 'not-used',
        openingTableManifest: 'not-used',
        endgameTableManifest: 'not-used',
        middlegameProceduralPolicy: 'browser-legal-move-expansion'
      },
      initialFocusOccurrenceId: rootOccurrence.occurrenceId,
      focusCandidateOccurrenceIds,
      defaultNeighborhoodRadius: Math.min(
        baseSceneManifest.runtime.defaultNeighborhoodRadius,
        options.maxDepth
      ),
      maxNeighborhoodRadius: Math.max(
        baseSceneManifest.runtime.maxNeighborhoodRadius,
        options.maxDepth
      )
    }
  } satisfies ViewerSceneManifest;
  const sceneBootstrap = createSceneBootstrap(viewerSceneManifest);
  const navigationEntryPoints = [
    createDynamicNavigationEntryPoint(rootOccurrence, viewerSceneManifest)
  ];

  return {
    runtimeBootstrap: {
      builderBootstrapManifest,
      viewerSceneManifest,
      sceneBootstrap,
      initialFocusOccurrenceId: rootOccurrence.occurrenceId
    },
    navigationEntryPoints,
    initialEntryPointId: 'middlegame',
    mode: 'dynamic'
  };
}

function createArtifactRuntimeSource(
  runtimeArtifactBundle: RuntimeArtifactBundle
): ViewerRuntimeSource {
  const runtimeBootstrap = materializeRuntimeBootstrap(runtimeArtifactBundle);
  const navigationEntryPoints = createAnchoredNavigationEntryPoints(runtimeBootstrap);

  return {
    runtimeBootstrap: {
      builderBootstrapManifest: runtimeBootstrap.builderBootstrapManifest,
      viewerSceneManifest: runtimeBootstrap.viewerSceneManifest,
      sceneBootstrap: runtimeBootstrap.sceneBootstrap,
      initialFocusOccurrenceId: runtimeBootstrap.initialFocusOccurrenceId
    },
    navigationEntryPoints,
    initialEntryPointId: resolveInitialNavigationEntryPointId(
      navigationEntryPoints,
      runtimeBootstrap.initialFocusOccurrenceId
    ),
    mode: 'artifacts'
  };
}

function createDynamicNavigationEntryPoint(
  rootOccurrence: BuilderOccurrenceRecord,
  viewerSceneManifest: ViewerSceneManifest
): NavigationEntryPoint {
  return {
    anchorId: 'entry:dynamic',
    entryId: 'middlegame',
    label: 'Dynamic',
    description: 'Legal-move graph generated in the browser from the current FEN seed.',
    regimeId: 'middlegame-procedural',
    focusOccurrenceId: rootOccurrence.occurrenceId,
    focus: rootOccurrence.embedding.coordinate,
    distance: clampLiveViewDistance(LIVE_VIEW_DISTANCE.default),
    neighborhoodRadius: viewerSceneManifest.runtime.defaultNeighborhoodRadius,
    orbit: deriveCameraOrbitState(viewerSceneManifest.camera.position),
    subtreeKey: rootOccurrence.embedding.subtreeKey,
    anchorPly: rootOccurrence.ply
  };
}

function buildDynamicBootstrapManifest(
  options: DynamicRuntimeOptions
): BuilderBootstrapManifest {
  const rootBoard = new Chess(options.fen);
  const rootStateKey = toCanonicalStateKey(rootBoard.fen());
  const graphObjectId = `dynamic:${hashString(`${rootStateKey}|${options.maxDepth}|${options.maxBranching}`)}`;
  const rootOccurrenceId = `occ-${hashString(`${rootStateKey}|dynamic:root`)}`;
  const coverageMetadata = createDynamicCoverageMetadata(rootBoard, options.maxDepth);
  const resolverInputs = createDynamicResolverInputs();
  const regimeDeclarations = createDynamicRegimeDeclarations();
  const queue: QueueEntry[] = [
    {
      boardFen: rootBoard.fen(),
      occurrenceId: rootOccurrenceId,
      path: ['dynamic:root'],
      ply: 0,
      depth: 0,
      subtreeKey: 'root',
      sectorStart: -Math.PI,
      sectorEnd: Math.PI
    }
  ];
  const generatedOccurrences: GeneratedOccurrence[] = [];
  const generatedTransitions: GeneratedTransition[] = [];
  const edges: BuilderBootstrapManifest['edges'] = [];
  const outgoingCounts = new Map<string, number>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const board = new Chess(current.boardFen);
    const orderedMoves = orderMoves(board.moves({ verbose: true })).slice(
      0,
      options.maxBranching
    );
    const phaseLabel = resolvePhaseLabel(board, current.ply);
    const terminal = resolveTerminal(board);
    const coordinate = resolveCoordinate(
      current.depth,
      current.sectorStart,
      current.sectorEnd,
      phaseLabel,
      terminal !== null
    );

    generatedOccurrences.push({
      occurrenceId: current.occurrenceId,
      stateKey: toCanonicalStateKey(board.fen()),
      path: current.path,
      ply: current.ply,
      phaseLabel,
      materialSignature: materialSignature(board),
      subtreeKey: current.subtreeKey,
      coordinate,
      azimuth: current.depth === 0 ? 0 : roundNumber((current.sectorStart + current.sectorEnd) * 0.5),
      elevation:
        current.depth === 0
          ? 0
          : roundNumber(Math.atan2(coordinate[1], Math.hypot(coordinate[0], coordinate[2]))),
      ballRadius: roundNumber(0.08 + (current.depth * 0.012)),
      terminal
    });

    if (terminal || current.depth >= options.maxDepth || orderedMoves.length === 0) {
      outgoingCounts.set(current.occurrenceId, 0);
      continue;
    }

    outgoingCounts.set(current.occurrenceId, orderedMoves.length);

    for (const [index, move] of orderedMoves.entries()) {
      const childBoard = new Chess(move.after);
      const childStateKey = toCanonicalStateKey(childBoard.fen());
      const moveUci = toMoveUci(move);
      const nextPly = current.ply + 1;
      const path = [...current.path, `${nextPly}:${moveUci}`];
      const occurrenceId = `occ-${hashString(`${childStateKey}|${path.join('|')}`)}`;
      const segmentSpan = (current.sectorEnd - current.sectorStart) / orderedMoves.length;
      const sectorStart = current.sectorStart + (segmentSpan * index);
      const sectorEnd = sectorStart + segmentSpan;
      const subtreeKey = current.subtreeKey === 'root' ? moveUci : current.subtreeKey;
      const moveFacts = resolveMoveFacts(move, childBoard);
      const moveFamily = resolveMoveFamily(moveFacts);

      queue.push({
        boardFen: childBoard.fen(),
        occurrenceId,
        path,
        ply: nextPly,
        depth: current.depth + 1,
        subtreeKey,
        sectorStart,
        sectorEnd
      });
      edges.push({
        sourceOccurrenceId: current.occurrenceId,
        targetOccurrenceId: occurrenceId
      });
      generatedTransitions.push({
        sourceOccurrenceId: current.occurrenceId,
        targetOccurrenceId: occurrenceId,
        moveUci,
        ply: nextPly,
        moveFacts,
        moveFamily
      });
    }
  }

  const stateOccurrences = groupOccurrenceIdsByState(generatedOccurrences);
  const occurrenceScores = computeOccurrenceScores(generatedOccurrences, stateOccurrences);
  const occurrences = generatedOccurrences.map((occurrence) =>
    buildOccurrenceRecord(occurrence, occurrenceScores, graphObjectId)
  );
  const occurrenceById = new Map(
    occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence])
  );
  const transitions = generatedTransitions.map((transition) =>
    buildTransitionRecord(transition, graphObjectId, occurrenceById)
  );
  const departureRules = generatedTransitions.map((transition) =>
    buildDepartureRuleRecord(transition)
  );
  const rootOccurrenceIds = [rootOccurrenceId];
  const leafOccurrenceIds = occurrences
    .filter((occurrence) => (outgoingCounts.get(occurrence.occurrenceId) ?? 0) === 0)
    .map((occurrence) => occurrence.occurrenceId);
  const priorityFrontierOccurrenceIds = occurrences
    .slice()
    .sort((left, right) => {
      if (right.salience.normalizedScore !== left.salience.normalizedScore) {
        return right.salience.normalizedScore - left.salience.normalizedScore;
      }

      return left.ply - right.ply;
    })
    .slice(0, Math.min(16, occurrences.length))
    .map((occurrence) => occurrence.occurrenceId);
  const anchors = buildDynamicAnchors(occurrences, rootOccurrenceId);
  const repeatedStateRelations = [...stateOccurrences.entries()]
    .filter(([, occurrenceIds]) => occurrenceIds.length > 1)
    .map(([stateKey, occurrenceIds]) => ({
      stateKey,
      occurrenceIds
    }));

  return {
    schemaVersion: DYNAMIC_SCHEMA_VERSION,
    graphObjectId,
    sourceName: 'browser-dynamic-runtime',
    version: DYNAMIC_SOURCE_VERSION,
    identitySemantics: {
      occurrenceKeyField: 'occurrenceId',
      positionKeyField: 'stateKey',
      pathKeyField: 'path',
      continuityKeyField: 'stateKey'
    },
    coverageMetadata,
    resolverInputs,
    regimeDeclarations,
    anchors,
    rootOccurrenceIds,
    leafOccurrenceIds,
    priorityFrontierOccurrenceIds,
    occurrences,
    edges,
    transitions,
    departureRules,
    repeatedStateRelations,
    salienceConfig: {
      frequencyWeight: 0.4,
      terminalPullWeight: 0.4,
      centralityWeight: 0.2,
      normalization: 'dynamic-js-minmax',
      topKFrontier: Math.min(16, occurrences.length)
    },
    embeddingConfig: {
      seed: 13,
      rootRingRadius: 0,
      maxRadius: roundNumber(0.42 + (options.maxDepth * 0.38)),
      radialScale: 0.38,
      moveAngleScale: 1,
      moveAngleDecay: 1,
      repeatedStatePull: 0,
      phasePitch: 0.08,
      terminalPitch: 0.06
    }
  };
}

function buildOccurrenceRecord(
  occurrence: GeneratedOccurrence,
  occurrenceScores: Map<string, DynamicOccurrenceScore>,
  graphObjectId: string
): BuilderOccurrenceRecord {
  const score = occurrenceScores.get(occurrence.occurrenceId);

  if (!score) {
    throw new Error(`missing occurrence score for ${occurrence.occurrenceId}`);
  }

  return {
    occurrenceId: occurrence.occurrenceId,
    stateKey: occurrence.stateKey,
    path: occurrence.path,
    ply: occurrence.ply,
    identity: {
      occurrenceKey: occurrence.occurrenceId,
      positionKey: occurrence.stateKey,
      pathKey: occurrence.path.join('|'),
      continuityKey: occurrence.stateKey
    },
    annotations: {
      phaseLabel: occurrence.phaseLabel,
      materialSignature: occurrence.materialSignature
    },
    regime: {
      regimeId: 'middlegame-procedural',
      candidateRegimeIds: ['middlegame-procedural'],
      resolverInputId: DYNAMIC_RESOLVER_INPUT_ID,
      selectionRule: 'browser-dynamic-legal-move-generation'
    },
    provenance: createDynamicProvenance(
      `occurrence ${occurrence.occurrenceId} generated from ${graphObjectId}`
    ),
    salience: {
      rawScore: score.rawScore,
      normalizedScore: score.normalizedScore,
      frequencySignal: score.frequencySignal,
      terminalPullSignal: score.terminalPullSignal,
      centralitySignal: score.centralitySignal,
      priorityHint: {
        priorityRank: score.priorityRank,
        priorityBand: score.priorityBand,
        retainFromZoom: score.retainFromZoom
      },
      provenance: createDynamicProvenance(
        `dynamic salience score for ${occurrence.occurrenceId}`
      )
    },
    terminal: occurrence.terminal,
    embedding: {
      coordinate: occurrence.coordinate,
      ballRadius: occurrence.ballRadius,
      azimuth: occurrence.azimuth,
      elevation: occurrence.elevation,
      subtreeKey: occurrence.subtreeKey,
      terminalAnchorId: occurrence.terminal?.anchorId ?? null
    }
  };
}

function buildTransitionRecord(
  transition: GeneratedTransition,
  graphObjectId: string,
  occurrenceById: Map<string, BuilderOccurrenceRecord>
): BuilderTransitionRecord {
  const sourceOccurrence = occurrenceById.get(transition.sourceOccurrenceId);
  const targetOccurrence = occurrenceById.get(transition.targetOccurrenceId);

  if (!sourceOccurrence || !targetOccurrence) {
    throw new Error(
      `dynamic transition references unknown occurrence in ${graphObjectId}`
    );
  }

  return {
    sourceOccurrenceId: transition.sourceOccurrenceId,
    targetOccurrenceId: transition.targetOccurrenceId,
    identity: {
      transitionKey: `${transition.sourceOccurrenceId}:${transition.targetOccurrenceId}`,
      sourceOccurrenceKey: transition.sourceOccurrenceId,
      targetOccurrenceKey: transition.targetOccurrenceId,
      sourcePositionKey: sourceOccurrence.stateKey,
      targetPositionKey: targetOccurrence.stateKey
    },
    provenance: createDynamicProvenance(
      `transition ${transition.moveUci} from ${transition.sourceOccurrenceId} to ${transition.targetOccurrenceId}`
    ),
    moveUci: transition.moveUci,
    ply: transition.ply,
    moveFacts: transition.moveFacts,
    moveFamily: transition.moveFamily
  };
}

function buildDepartureRuleRecord(
  transition: GeneratedTransition
): BuilderDepartureRuleRecord {
  const profile = resolveDepartureProfile(transition.moveFamily, transition.moveFacts);

  return {
    sourceOccurrenceId: transition.sourceOccurrenceId,
    targetOccurrenceId: transition.targetOccurrenceId,
    moveUci: transition.moveUci,
    ply: transition.ply,
    moveFamily: transition.moveFamily,
    centerlineProfile: profile.centerlineProfile,
    departureStrength: profile.departureStrength,
    lateralOffset: profile.lateralOffset,
    verticalLift: profile.verticalLift,
    curvature: profile.curvature,
    twist: profile.twist
  };
}

function buildDynamicAnchors(
  occurrences: BuilderOccurrenceRecord[],
  rootOccurrenceId: string
): BuilderAnchorRecord[] {
  const rootOccurrence = occurrences.find(
    (occurrence) => occurrence.occurrenceId === rootOccurrenceId
  );

  if (!rootOccurrence) {
    throw new Error('dynamic root anchor occurrence is missing');
  }

  return [
    {
      anchorId: 'entry:dynamic',
      anchorKind: 'navigation-entry',
      label: 'Dynamic seed',
      occurrenceIds: [rootOccurrenceId],
      regimeId: 'middlegame-procedural',
      provenance: createDynamicProvenance('dynamic navigation entry anchor'),
      entryId: 'middlegame',
      wdlLabel: null,
      outcomeClass: null,
      anchorPly: rootOccurrence.ply,
      subtreeKey: rootOccurrence.embedding.subtreeKey
    },
    ...occurrences
      .filter((occurrence) => occurrence.terminal !== null)
      .map((occurrence) => ({
        anchorId: `terminal:${occurrence.occurrenceId}`,
        anchorKind: 'terminal-outcome' as const,
        label: `Terminal ${occurrence.terminal?.wdlLabel ?? ''}`,
        occurrenceIds: [occurrence.occurrenceId],
        regimeId: 'middlegame-procedural' as const,
        provenance: createDynamicProvenance(
          `dynamic terminal anchor for ${occurrence.occurrenceId}`
        ),
        entryId: null,
        wdlLabel: occurrence.terminal?.wdlLabel ?? null,
        outcomeClass: occurrence.terminal?.outcomeClass ?? null,
        anchorPly: occurrence.ply,
        subtreeKey: occurrence.embedding.subtreeKey
      }))
  ];
}

function createDynamicCoverageMetadata(
  rootBoard: Chess,
  maxDepth: number
): BuilderCoverageMetadataRecord[] {
  return [
    {
      coverageMetadataId: DYNAMIC_COVERAGE_ID,
      regimeId: 'middlegame-procedural',
      coverageKind: 'browser-dynamic-legal-move-bfs',
      summary: 'Legal moves expanded in-browser from a seed FEN/state key.',
      occurrenceCount: 0,
      maxPly: maxDepth,
      supportedMaterialSignatures: [materialSignature(rootBoard)]
    }
  ];
}

function createDynamicResolverInputs(): BuilderResolverInputRecord[] {
  return [
    {
      resolverInputId: DYNAMIC_RESOLVER_INPUT_ID,
      regimeId: 'middlegame-procedural',
      priority: 1,
      selector: 'browser-dynamic-generator',
      coverageMetadataId: DYNAMIC_COVERAGE_ID,
      isFallback: true
    }
  ];
}

function createDynamicRegimeDeclarations(): BuilderRegimeDeclaration[] {
  return [
    {
      regimeId: 'middlegame-procedural',
      label: 'Dynamic Runtime',
      backingKind: 'procedural',
      schemaVersion: DYNAMIC_SCHEMA_VERSION,
      coverageMetadataId: DYNAMIC_COVERAGE_ID,
      resolverInputId: DYNAMIC_RESOLVER_INPUT_ID,
      provenance: createDynamicProvenance('dynamic runtime regime declaration')
    }
  ];
}

function resolveDynamicFocusCandidates(
  builderBootstrapManifest: BuilderBootstrapManifest,
  rootOccurrenceId: string
) {
  const rankedIds = builderBootstrapManifest.occurrences
    .slice()
    .sort((left, right) => {
      if (right.salience.normalizedScore !== left.salience.normalizedScore) {
        return right.salience.normalizedScore - left.salience.normalizedScore;
      }

      return left.ply - right.ply;
    })
    .map((occurrence) => occurrence.occurrenceId);

  return [rootOccurrenceId, ...rankedIds.filter((occurrenceId) => occurrenceId !== rootOccurrenceId)].slice(
    0,
    Math.min(16, rankedIds.length + 1)
  );
}

function computeOccurrenceScores(
  occurrences: GeneratedOccurrence[],
  stateOccurrences: Map<string, string[]>
) {
  const rawScores = occurrences.map((occurrence) => {
    const repeatCount = stateOccurrences.get(occurrence.stateKey)?.length ?? 1;
    const frequencySignal = roundNumber(Math.min(1, repeatCount / 3));
    const terminalPullSignal = occurrence.terminal ? 1 : 0;
    const centralitySignal = roundNumber(1 / (occurrence.ply + 1));
    const rawScore = roundNumber(
      (frequencySignal * 0.4) +
        (terminalPullSignal * 0.4) +
        (centralitySignal * 0.2)
    );

    return {
      occurrenceId: occurrence.occurrenceId,
      rawScore,
      frequencySignal,
      terminalPullSignal,
      centralitySignal
    };
  });
  const rawValues = rawScores.map((score) => score.rawScore);
  const minimum = Math.min(...rawValues);
  const maximum = Math.max(...rawValues);
  const orderedIds = rawScores
    .slice()
    .sort((left, right) => right.rawScore - left.rawScore)
    .map((score) => score.occurrenceId);

  return new Map(
    rawScores.map((score) => {
      const priorityRank = orderedIds.indexOf(score.occurrenceId) + 1;
      const normalizedScore =
        maximum === minimum ? 1 : roundNumber((score.rawScore - minimum) / (maximum - minimum));

      return [
        score.occurrenceId,
        {
          ...score,
          normalizedScore,
          priorityRank,
          priorityBand:
            priorityRank <= 6 ? 'frontier' : priorityRank <= 14 ? 'context' : 'detail',
          retainFromZoom:
            priorityRank <= 6 ? 'far' : priorityRank <= 14 ? 'mid' : 'close'
        }
      ] as const;
    })
  );
}

function resolveCoordinate(
  depth: number,
  sectorStart: number,
  sectorEnd: number,
  phaseLabel: string,
  isTerminal: boolean
): [number, number, number] {
  if (depth === 0) {
    return [0, 0, 0];
  }

  const angle = (sectorStart + sectorEnd) * 0.5;
  const planarRadius = 0.42 + (depth * 0.38);
  const sectorSpan = sectorEnd - sectorStart;
  const phaseOffset =
    phaseLabel === 'opening' ? 0.08 : phaseLabel === 'endgame' ? -0.08 : 0;
  const y = roundNumber(
    phaseOffset + (isTerminal ? -0.06 : 0) + (Math.sin(angle * 2) * Math.min(0.08, sectorSpan * 0.08))
  );

  return [
    roundNumber(Math.sin(angle) * planarRadius),
    y,
    roundNumber(Math.cos(angle) * planarRadius)
  ];
}

function resolveTerminal(board: Chess): BuilderOccurrenceRecord['terminal'] {
  if (board.isCheckmate()) {
    return {
      wdlLabel: board.turn() === 'w' ? 'L' : 'W',
      outcomeClass: 'checkmate',
      anchorId: `terminal:${hashString(toCanonicalStateKey(board.fen()))}`,
      provenance: createDynamicProvenance('dynamic checkmate terminal')
    };
  }

  if (
    board.isStalemate() ||
    board.isInsufficientMaterial() ||
    board.isThreefoldRepetition() ||
    board.isDrawByFiftyMoves()
  ) {
    return {
      wdlLabel: 'D',
      outcomeClass: 'draw',
      anchorId: `terminal:${hashString(toCanonicalStateKey(board.fen()))}`,
      provenance: createDynamicProvenance('dynamic drawn terminal')
    };
  }

  return null;
}

function resolvePhaseLabel(board: Chess, ply: number) {
  const heavyPieceCount = ['q', 'r'].reduce(
    (count, piece) => count + board.findPiece({ color: 'w', type: piece as PieceSymbol }).length + board.findPiece({ color: 'b', type: piece as PieceSymbol }).length,
    0
  );
  const minorPieceCount = ['b', 'n'].reduce(
    (count, piece) => count + board.findPiece({ color: 'w', type: piece as PieceSymbol }).length + board.findPiece({ color: 'b', type: piece as PieceSymbol }).length,
    0
  );

  if (heavyPieceCount <= 2 && minorPieceCount <= 2) {
    return 'endgame';
  }

  if (ply <= 8) {
    return 'opening';
  }

  return 'middlegame';
}

function materialSignature(board: Chess) {
  return `white[${materialCountFragments(board, 'w').join(',')}]|black[${materialCountFragments(board, 'b').join(',')}]`;
}

function materialCountFragments(board: Chess, color: 'w' | 'b') {
  return [
    `Q${board.findPiece({ color, type: 'q' }).length}`,
    `R${board.findPiece({ color, type: 'r' }).length}`,
    `B${board.findPiece({ color, type: 'b' }).length}`,
    `N${board.findPiece({ color, type: 'n' }).length}`,
    `P${board.findPiece({ color, type: 'p' }).length}`
  ];
}

function orderMoves(moves: Move[]) {
  return moves.slice().sort((left, right) => scoreMove(right) - scoreMove(left));
}

function scoreMove(move: Move) {
  const childBoard = new Chess(move.after);
  let score = 0;

  if (childBoard.isCheckmate()) {
    score += 1000;
  }
  if (move.isCapture()) {
    score += 200 + (move.captured ? PIECE_VALUES[move.captured] * 10 : 0);
  }
  if (childBoard.isCheck()) {
    score += 120;
  }
  if (move.isPromotion()) {
    score += 90 + (move.promotion ? PIECE_VALUES[move.promotion] * 10 : 0);
  }
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    score += 70;
  }
  score += 40 - childBoard.moves().length;

  return score;
}

function resolveMoveFacts(move: Move, childBoard: Chess): BuilderMoveFactRecord {
  return {
    san: move.san,
    movingPiece: PIECE_NAME_BY_SYMBOL[move.piece],
    capturedPiece: move.captured ? PIECE_NAME_BY_SYMBOL[move.captured] : null,
    promotionPiece: move.promotion ? PIECE_NAME_BY_SYMBOL[move.promotion] : null,
    isCapture: move.isCapture(),
    isCheck: childBoard.isCheck(),
    isCheckmate: childBoard.isCheckmate(),
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    castleSide: move.isKingsideCastle() ? 'king' : move.isQueensideCastle() ? 'queen' : null,
    isEnPassant: move.isEnPassant()
  };
}

function resolveMoveFamily(moveFacts: BuilderMoveFactRecord): BuilderMoveFamilyRecord {
  return {
    interactionClass: moveFacts.isCastle ? 'castle' : moveFacts.isCapture ? 'capture' : 'quiet',
    forcingClass: moveFacts.isCheckmate ? 'checkmate' : moveFacts.isCheck ? 'check' : 'none',
    specialClass: moveFacts.promotionPiece
      ? 'promotion'
      : moveFacts.isEnPassant
        ? 'en-passant'
        : 'none'
  };
}

function resolveDepartureProfile(
  moveFamily: BuilderMoveFamilyRecord,
  moveFacts: BuilderMoveFactRecord
) {
  if (moveFacts.isCheckmate) {
    return {
      centerlineProfile: 'terminal-snap',
      departureStrength: 0.87,
      lateralOffset: 0.18,
      verticalLift: 0.28,
      curvature: 0.4,
      twist: 0.15
    };
  }

  if (moveFacts.promotionPiece) {
    return {
      centerlineProfile: 'promotion-rise',
      departureStrength: 0.74,
      lateralOffset: 0.1,
      verticalLift: 0.22,
      curvature: 0.26,
      twist: 0.12
    };
  }

  if (moveFacts.isCastle) {
    return {
      centerlineProfile: 'castle-sweep',
      departureStrength: 0.48,
      lateralOffset: 0.14,
      verticalLift: 0.08,
      curvature: 0.18,
      twist: 0.26
    };
  }

  if (moveFacts.isCheck) {
    return {
      centerlineProfile: 'forcing-rise',
      departureStrength: 0.68,
      lateralOffset: 0.12,
      verticalLift: 0.22,
      curvature: 0.26,
      twist: 0.14
    };
  }

  if (moveFamily.interactionClass === 'capture') {
    return {
      centerlineProfile: 'capture-break',
      departureStrength: 0.62,
      lateralOffset: 0.16,
      verticalLift: 0.16,
      curvature: 0.28,
      twist: 0.12
    };
  }

  return {
    centerlineProfile: 'quiet-glide',
    departureStrength: 0.26,
    lateralOffset: 0.06,
    verticalLift: 0.05,
    curvature: 0.12,
    twist: 0.03
  };
}

function groupOccurrenceIdsByState(occurrences: GeneratedOccurrence[]) {
  const stateOccurrences = new Map<string, string[]>();

  for (const occurrence of occurrences) {
    stateOccurrences.set(occurrence.stateKey, [
      ...(stateOccurrences.get(occurrence.stateKey) ?? []),
      occurrence.occurrenceId
    ]);
  }

  return stateOccurrences;
}

function normalizeFenInput(input: string) {
  const trimmedInput = input.trim();
  const fields = trimmedInput.split(/\s+/);
  const normalizedFen =
    fields.length === 4 ? `${trimmedInput} 0 1` : trimmedInput;
  const validation = validateFen(normalizedFen);

  if (!validation.ok) {
    throw new Error(validation.error ?? 'invalid FEN input for dynamic runtime');
  }

  return normalizedFen;
}

function parseIntegerParameter(
  rawValue: string | null,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (rawValue === null) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function toCanonicalStateKey(fen: string) {
  return fen.split(/\s+/).slice(0, 4).join(' ');
}

function toMoveUci(move: Move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function createDynamicProvenance(detail: string) {
  return {
    sourceKind: 'dynamic-runtime',
    sourceName: 'browser-dynamic-runtime',
    sourceVersion: DYNAMIC_SOURCE_VERSION,
    sourceLocation: DYNAMIC_SOURCE_LOCATION,
    detail
  };
}

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function roundNumber(value: number) {
  return Number(value.toFixed(12));
}