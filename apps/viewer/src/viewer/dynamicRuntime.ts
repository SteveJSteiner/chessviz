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
import {
  createRuntimeExplorationKernel,
  type RuntimeExplorationKernel
} from './runtimeKernel.ts';

const DYNAMIC_SCHEMA_VERSION = '2026-04-13.dynamic.v1';
const DYNAMIC_SOURCE_VERSION = '2026-04-13.dynamic-js';
const DYNAMIC_SOURCE_LOCATION = 'browser://viewer/dynamic-runtime';
const DYNAMIC_COVERAGE_ID = 'coverage:dynamic-runtime';
const DYNAMIC_RESOLVER_INPUT_ID = 'resolver:dynamic-runtime';
const DEFAULT_DYNAMIC_DEPTH = 2;
const DEFAULT_DYNAMIC_BRANCHING = 20;
const MAX_DYNAMIC_DEPTH = 4;
const MAX_DYNAMIC_BRANCHING = 32;
const DYNAMIC_PATH_TOKEN_PATTERN = /[\s,>]+/;
const DYNAMIC_MOVE_UCI_PATTERN = /^[a-h][1-8][a-h][1-8][nbrq]?$/;
const ADDITIVE_EXPANSION_MIN_SPREAD = Math.PI / 5;
const ADDITIVE_EXPANSION_MAX_SPREAD = Math.PI * 0.9;
const ADDITIVE_EXPANSION_STEP = Math.PI / 10;

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
  dynamicOptions?: DynamicRuntimeOptions;
};

export type ViewerRuntimeExpansionResult = {
  didExpand: boolean;
  occurrenceDelta: number;
  edgeDelta: number;
};

export type ViewerRuntimeStore = {
  inspectNeighborhood: RuntimeExplorationKernel['inspectNeighborhood'];
  inspectWholeGraph: RuntimeExplorationKernel['inspectWholeGraph'];
  inspectCarrierSurface: RuntimeExplorationKernel['inspectCarrierSurface'];
  resolveOccurrence: RuntimeExplorationKernel['resolveOccurrence'];
  getFocusOptions: RuntimeExplorationKernel['getFocusOptions'];
  getBuilderBootstrapManifest: () => BuilderBootstrapManifest;
  getViewerSceneManifest: () => ViewerSceneManifest;
  expandFocusOccurrence: (occurrenceId: string) => ViewerRuntimeExpansionResult;
};

export type DynamicRuntimeOptions = {
  fen: string;
  maxDepth: number;
  maxBranching: number;
  pathMoves: string[];
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
    ),
    pathMoves: parseDynamicPathMoves(searchParams.get('path'))
  };
}

export function createDynamicRuntimeSource(
  baseSceneManifest: ViewerSceneManifest,
  options: DynamicRuntimeOptions
): ViewerRuntimeSource {
  let builderBootstrapManifest = buildDynamicBootstrapManifest(options);
  const rootOccurrenceId = builderBootstrapManifest.rootOccurrenceIds[0];

  if (!rootOccurrenceId) {
    throw new Error('dynamic runtime generation produced no root occurrence');
  }

  let rootOccurrence = builderBootstrapManifest.occurrences.find(
    (occurrence) => occurrence.occurrenceId === rootOccurrenceId
  );

  if (!rootOccurrence) {
    throw new Error('dynamic runtime generation produced no root occurrence');
  }

  let initialFocusOccurrenceId = rootOccurrence.occurrenceId;
  let viewerSceneManifest = {
    ...baseSceneManifest,
    sceneId: 'dynamic-runtime-exploration',
    title: 'Dynamic Runtime Graph',
    summary: `Browser-generated legal-move graph from ${rootOccurrence.stateKey}. Depth ${options.maxDepth}, branch cap ${options.maxBranching}${options.pathMoves.length > 0 ? `, pre-expanded path ${options.pathMoves.join(' ')}` : ''}.`,
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
      initialFocusOccurrenceId,
      focusCandidateOccurrenceIds: resolveDynamicFocusCandidates(
        builderBootstrapManifest,
        rootOccurrence.occurrenceId,
        [initialFocusOccurrenceId]
      ),
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

  if (options.pathMoves.length > 0) {
    const materializedPath = materializeDynamicPath({
      builderBootstrapManifest,
      viewerSceneManifest,
      rootOccurrenceId,
      dynamicOptions: options
    });

    builderBootstrapManifest = materializedPath.builderBootstrapManifest;
    viewerSceneManifest = materializedPath.viewerSceneManifest;
    initialFocusOccurrenceId = materializedPath.focusOccurrenceId;
    rootOccurrence = builderBootstrapManifest.occurrences.find(
      (occurrence) => occurrence.occurrenceId === rootOccurrenceId
    );

    if (!rootOccurrence) {
      throw new Error('dynamic runtime materialization lost the root occurrence');
    }

    viewerSceneManifest = {
      ...viewerSceneManifest,
      runtime: {
        ...viewerSceneManifest.runtime,
        initialFocusOccurrenceId,
        focusCandidateOccurrenceIds: resolveDynamicFocusCandidates(
          builderBootstrapManifest,
          rootOccurrenceId,
          [initialFocusOccurrenceId]
        )
      }
    } satisfies ViewerSceneManifest;
  }

  const sceneBootstrap = createSceneBootstrap(viewerSceneManifest);
  const navigationEntryPoints = [
    createDynamicNavigationEntryPoint(rootOccurrence, viewerSceneManifest)
  ];

  return {
    runtimeBootstrap: {
      builderBootstrapManifest,
      viewerSceneManifest,
      sceneBootstrap,
      initialFocusOccurrenceId
    },
    navigationEntryPoints,
    initialEntryPointId: 'middlegame',
    mode: 'dynamic',
    dynamicOptions: options
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

function materializeDynamicPath({
  builderBootstrapManifest,
  viewerSceneManifest,
  rootOccurrenceId,
  dynamicOptions
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  viewerSceneManifest: ViewerSceneManifest;
  rootOccurrenceId: string;
  dynamicOptions: DynamicRuntimeOptions;
}) {
  let nextBuilderBootstrapManifest = builderBootstrapManifest;
  let nextViewerSceneManifest = viewerSceneManifest;
  let currentOccurrenceId = rootOccurrenceId;

  for (const moveUci of dynamicOptions.pathMoves) {
    let targetOccurrenceId = findDynamicTransitionTargetOccurrenceId(
      nextBuilderBootstrapManifest,
      currentOccurrenceId,
      moveUci
    );

    if (!targetOccurrenceId) {
      const expansion = expandDynamicOccurrenceMaterialization({
        builderBootstrapManifest: nextBuilderBootstrapManifest,
        viewerSceneManifest: nextViewerSceneManifest,
        occurrenceId: currentOccurrenceId,
        dynamicOptions
      });

      if (expansion) {
        nextBuilderBootstrapManifest = expansion.builderBootstrapManifest;
        nextViewerSceneManifest = expansion.viewerSceneManifest;
        targetOccurrenceId = findDynamicTransitionTargetOccurrenceId(
          nextBuilderBootstrapManifest,
          currentOccurrenceId,
          moveUci
        );
      }
    }

    if (!targetOccurrenceId) {
      throw new Error(
        `requested dynamic path move ${moveUci} is unavailable from ${currentOccurrenceId}; it may be illegal or outside branch cap ${dynamicOptions.maxBranching}`
      );
    }

    currentOccurrenceId = targetOccurrenceId;
  }

  return {
    builderBootstrapManifest: nextBuilderBootstrapManifest,
    viewerSceneManifest: nextViewerSceneManifest,
    focusOccurrenceId: currentOccurrenceId
  };
}

function findDynamicTransitionTargetOccurrenceId(
  builderBootstrapManifest: BuilderBootstrapManifest,
  sourceOccurrenceId: string,
  moveUci: string
) {
  return builderBootstrapManifest.transitions.find(
    (transition) =>
      transition.sourceOccurrenceId === sourceOccurrenceId &&
      transition.moveUci === moveUci
  )?.targetOccurrenceId;
}

export function createViewerRuntimeStore(
  runtimeSource: ViewerRuntimeSource
): ViewerRuntimeStore {
  let builderBootstrapManifest = runtimeSource.runtimeBootstrap.builderBootstrapManifest;
  let viewerSceneManifest = runtimeSource.runtimeBootstrap.viewerSceneManifest;
  let runtimeKernel = createRuntimeExplorationKernel(
    builderBootstrapManifest,
    viewerSceneManifest
  );

  return {
    inspectNeighborhood(focusOccurrenceId, request) {
      return runtimeKernel.inspectNeighborhood(focusOccurrenceId, request);
    },
    inspectWholeGraph(focusOccurrenceId, request) {
      return runtimeKernel.inspectWholeGraph(focusOccurrenceId, request);
    },
    inspectCarrierSurface(occurrenceIds, request) {
      return runtimeKernel.inspectCarrierSurface(occurrenceIds, request);
    },
    resolveOccurrence(occurrenceId) {
      return runtimeKernel.resolveOccurrence(occurrenceId);
    },
    getFocusOptions() {
      return runtimeKernel.getFocusOptions();
    },
    getBuilderBootstrapManifest() {
      return builderBootstrapManifest;
    },
    getViewerSceneManifest() {
      return viewerSceneManifest;
    },
    expandFocusOccurrence(occurrenceId) {
      if (runtimeSource.mode !== 'dynamic' || !runtimeSource.dynamicOptions) {
        return {
          didExpand: false,
          occurrenceDelta: 0,
          edgeDelta: 0
        };
      }

      const expansion = expandDynamicOccurrenceMaterialization({
        builderBootstrapManifest,
        viewerSceneManifest,
        occurrenceId,
        dynamicOptions: runtimeSource.dynamicOptions
      });

      if (!expansion) {
        return {
          didExpand: false,
          occurrenceDelta: 0,
          edgeDelta: 0
        };
      }

      builderBootstrapManifest = expansion.builderBootstrapManifest;
      viewerSceneManifest = expansion.viewerSceneManifest;
      runtimeKernel = createRuntimeExplorationKernel(
        builderBootstrapManifest,
        viewerSceneManifest
      );

      return expansion.result;
    }
  };
}

function expandDynamicOccurrenceMaterialization({
  builderBootstrapManifest,
  viewerSceneManifest,
  occurrenceId,
  dynamicOptions
}: {
  builderBootstrapManifest: BuilderBootstrapManifest;
  viewerSceneManifest: ViewerSceneManifest;
  occurrenceId: string;
  dynamicOptions: DynamicRuntimeOptions;
}) {
  const focusOccurrence = builderBootstrapManifest.occurrences.find(
    (occurrence) => occurrence.occurrenceId === occurrenceId
  );

  if (
    !focusOccurrence ||
    focusOccurrence.terminal !== null
  ) {
    return null;
  }

  if (
    builderBootstrapManifest.transitions.some(
      (transition) => transition.sourceOccurrenceId === occurrenceId
    )
  ) {
    return null;
  }

  const reconstructedState = reconstructDynamicOccurrenceState(
    dynamicOptions.fen,
    focusOccurrence.path,
    dynamicOptions.maxBranching
  );
  const orderedMoves = orderMoves(
    reconstructedState.board.moves({ verbose: true })
  ).slice(0, dynamicOptions.maxBranching);

  if (orderedMoves.length === 0) {
    return null;
  }

  const existingOccurrenceIds = new Set(
    builderBootstrapManifest.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const existingTransitionKeys = new Set(
    builderBootstrapManifest.transitions.map((transition) =>
      `${transition.sourceOccurrenceId}:${transition.targetOccurrenceId}`
    )
  );
  const childSpread =
    focusOccurrence.ply === 0
      ? Math.PI * 2
      : resolveExpansionSpread(orderedMoves.length);
  const childAzimuths = resolveExpansionAzimuths(
    focusOccurrence.embedding.azimuth,
    orderedMoves.length,
    focusOccurrence.ply
  );
  const newGeneratedOccurrences: GeneratedOccurrence[] = [];
  const newGeneratedTransitions: GeneratedTransition[] = [];

  for (const [index, move] of orderedMoves.entries()) {
    const childBoard = new Chess(move.after);
    const childStateKey = toCanonicalStateKey(childBoard.fen());
    const moveUci = toMoveUci(move);
    const nextPly = focusOccurrence.ply + 1;
    const path = [...focusOccurrence.path, `${nextPly}:${moveUci}`];
    const occurrenceKey = `occ-${hashString(`${childStateKey}|${path.join('|')}`)}`;
    const subtreeKey =
      focusOccurrence.embedding.subtreeKey === 'root'
        ? moveUci
        : focusOccurrence.embedding.subtreeKey;
    const moveFacts = resolveMoveFacts(move, childBoard);
    const moveFamily = resolveMoveFamily(moveFacts);
    const childAzimuth = childAzimuths[index] ?? focusOccurrence.embedding.azimuth;

    if (!existingOccurrenceIds.has(occurrenceKey)) {
      const phaseLabel = resolvePhaseLabel(childBoard, nextPly);
      const terminal = resolveTerminal(childBoard);
      const coordinate = resolveAdditiveExpansionCoordinate(
        nextPly,
        childAzimuth,
        phaseLabel,
        terminal !== null,
        childSpread
      );

      newGeneratedOccurrences.push({
        occurrenceId: occurrenceKey,
        stateKey: childStateKey,
        path,
        ply: nextPly,
        phaseLabel,
        materialSignature: materialSignature(childBoard),
        subtreeKey,
        coordinate,
        azimuth: roundAngle(childAzimuth),
        elevation: roundNumber(
          Math.atan2(coordinate[1], Math.hypot(coordinate[0], coordinate[2]))
        ),
        ballRadius: roundNumber(0.08 + (nextPly * 0.012)),
        terminal
      });
      existingOccurrenceIds.add(occurrenceKey);
    }

    const transitionKey = `${occurrenceId}:${occurrenceKey}`;

    if (!existingTransitionKeys.has(transitionKey)) {
      newGeneratedTransitions.push({
        sourceOccurrenceId: occurrenceId,
        targetOccurrenceId: occurrenceKey,
        moveUci,
        ply: nextPly,
        moveFacts,
        moveFamily
      });
      existingTransitionKeys.add(transitionKey);
    }
  }

  if (newGeneratedTransitions.length === 0) {
    return null;
  }

  const generatedOccurrences = [
    ...builderBootstrapManifest.occurrences.map(toGeneratedOccurrence),
    ...newGeneratedOccurrences
  ];
  const generatedTransitions = [
    ...builderBootstrapManifest.transitions.map(toGeneratedTransition),
    ...newGeneratedTransitions
  ];
  const maxMaterializedPly = Math.max(
    ...generatedOccurrences.map((occurrence) => occurrence.ply)
  );
  const nextBuilderBootstrapManifest = materializeDynamicBootstrapManifest({
    graphObjectId: builderBootstrapManifest.graphObjectId,
    coverageMetadata: builderBootstrapManifest.coverageMetadata,
    resolverInputs: builderBootstrapManifest.resolverInputs,
    regimeDeclarations: builderBootstrapManifest.regimeDeclarations,
    rootOccurrenceIds: builderBootstrapManifest.rootOccurrenceIds,
    generatedOccurrences,
    generatedTransitions,
    maxMaterializedPly
  });
  const rootOccurrenceId = nextBuilderBootstrapManifest.rootOccurrenceIds[0];
  const nextViewerSceneManifest = {
    ...viewerSceneManifest,
    runtime: {
      ...viewerSceneManifest.runtime,
      focusCandidateOccurrenceIds:
        rootOccurrenceId === undefined
          ? viewerSceneManifest.runtime.focusCandidateOccurrenceIds
          : resolveDynamicFocusCandidates(
              nextBuilderBootstrapManifest,
              rootOccurrenceId
            ),
      maxNeighborhoodRadius: Math.max(
        viewerSceneManifest.runtime.maxNeighborhoodRadius,
        maxMaterializedPly
      )
    }
  } satisfies ViewerSceneManifest;

  return {
    builderBootstrapManifest: nextBuilderBootstrapManifest,
    viewerSceneManifest: nextViewerSceneManifest,
    result: {
      didExpand: true,
      occurrenceDelta: newGeneratedOccurrences.length,
      edgeDelta: newGeneratedTransitions.length
    }
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
  const graphObjectId = `dynamic:${hashString(`${rootStateKey}|${options.maxBranching}`)}`;
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

  return materializeDynamicBootstrapManifest({
    graphObjectId,
    coverageMetadata,
    resolverInputs,
    regimeDeclarations,
    rootOccurrenceIds: [rootOccurrenceId],
    generatedOccurrences,
    generatedTransitions,
    maxMaterializedPly: Math.max(...generatedOccurrences.map((occurrence) => occurrence.ply)),
    leafOccurrenceIds: occurrencesLeafIds(generatedOccurrences, outgoingCounts)
  });
}

function materializeDynamicBootstrapManifest({
  graphObjectId,
  coverageMetadata,
  resolverInputs,
  regimeDeclarations,
  rootOccurrenceIds,
  generatedOccurrences,
  generatedTransitions,
  maxMaterializedPly,
  leafOccurrenceIds
}: {
  graphObjectId: string;
  coverageMetadata: BuilderCoverageMetadataRecord[];
  resolverInputs: BuilderResolverInputRecord[];
  regimeDeclarations: BuilderRegimeDeclaration[];
  rootOccurrenceIds: string[];
  generatedOccurrences: GeneratedOccurrence[];
  generatedTransitions: GeneratedTransition[];
  maxMaterializedPly: number;
  leafOccurrenceIds?: string[];
}) {
  const rootOccurrenceId = rootOccurrenceIds[0];

  if (!rootOccurrenceId) {
    throw new Error('dynamic runtime materialization requires one root occurrence');
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
  const outgoingCounts = buildOutgoingCounts(occurrences, generatedTransitions);
  const resolvedLeafOccurrenceIds =
    leafOccurrenceIds ?? occurrencesLeafIds(generatedOccurrences, outgoingCounts);
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
  const supportedMaterialSignatures = [...new Set(
    generatedOccurrences.map((occurrence) => occurrence.materialSignature)
  )].sort();

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
    coverageMetadata: coverageMetadata.map((coverage) => ({
      ...coverage,
      occurrenceCount: occurrences.length,
      maxPly: maxMaterializedPly,
      supportedMaterialSignatures
    })),
    resolverInputs,
    regimeDeclarations,
    anchors,
    rootOccurrenceIds,
    leafOccurrenceIds: resolvedLeafOccurrenceIds,
    priorityFrontierOccurrenceIds,
    occurrences,
    edges: generatedTransitions.map((transition) => ({
      sourceOccurrenceId: transition.sourceOccurrenceId,
      targetOccurrenceId: transition.targetOccurrenceId
    })),
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
      maxRadius: roundNumber(0.42 + (maxMaterializedPly * 0.38)),
      radialScale: 0.38,
      moveAngleScale: 1,
      moveAngleDecay: 1,
      repeatedStatePull: 0,
      phasePitch: 0.08,
      terminalPitch: 0.06
    }
  } satisfies BuilderBootstrapManifest;
}

function buildOutgoingCounts(
  occurrences: Array<{ occurrenceId: string }>,
  generatedTransitions: GeneratedTransition[]
) {
  const outgoingCounts = new Map<string, number>();

  for (const occurrence of occurrences) {
    outgoingCounts.set(occurrence.occurrenceId, 0);
  }

  for (const transition of generatedTransitions) {
    outgoingCounts.set(
      transition.sourceOccurrenceId,
      (outgoingCounts.get(transition.sourceOccurrenceId) ?? 0) + 1
    );
  }

  return outgoingCounts;
}

function occurrencesLeafIds(
  occurrences: Array<{ occurrenceId: string }>,
  outgoingCounts: Map<string, number>
) {
  return occurrences
    .filter((occurrence) => (outgoingCounts.get(occurrence.occurrenceId) ?? 0) === 0)
    .map((occurrence) => occurrence.occurrenceId);
}

function reconstructDynamicOccurrenceState(
  rootFen: string,
  path: string[],
  maxBranching: number
) {
  let board = new Chess(rootFen);

  for (const segment of path.slice(1)) {
    const moveUci = parseDynamicPathMove(segment);
    const orderedMoves = orderMoves(board.moves({ verbose: true })).slice(
      0,
      maxBranching
    );
    const moveIndex = orderedMoves.findIndex((move) => toMoveUci(move) === moveUci);

    if (moveIndex < 0) {
      throw new Error(`cannot reconstruct dynamic occurrence path segment ${segment}`);
    }

    const matchedMove = orderedMoves[moveIndex];

    if (!matchedMove) {
      throw new Error(`dynamic occurrence path segment ${segment} resolved undefined move`);
    }

    board = new Chess(matchedMove.after);
  }

  return {
    board
  };
}

function parseDynamicPathMoves(pathValue: string | null) {
  if (!pathValue) {
    return [];
  }

  return pathValue
    .split(DYNAMIC_PATH_TOKEN_PATTERN)
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (!DYNAMIC_MOVE_UCI_PATTERN.test(segment)) {
        throw new Error(`invalid dynamic path move: ${segment}`);
      }

      return segment;
    });
}

function parseDynamicPathMove(segment: string) {
  const separatorIndex = segment.indexOf(':');

  if (separatorIndex < 0 || separatorIndex === segment.length - 1) {
    throw new Error(`invalid dynamic path segment: ${segment}`);
  }

  return segment.slice(separatorIndex + 1);
}

function toGeneratedOccurrence(
  occurrence: BuilderOccurrenceRecord
): GeneratedOccurrence {
  return {
    occurrenceId: occurrence.occurrenceId,
    stateKey: occurrence.stateKey,
    path: [...occurrence.path],
    ply: occurrence.ply,
    phaseLabel: occurrence.annotations.phaseLabel,
    materialSignature: occurrence.annotations.materialSignature,
    subtreeKey: occurrence.embedding.subtreeKey,
    coordinate: [...occurrence.embedding.coordinate] as [number, number, number],
    azimuth: occurrence.embedding.azimuth,
    elevation: occurrence.embedding.elevation,
    ballRadius: occurrence.embedding.ballRadius,
    terminal: occurrence.terminal
  };
}

function toGeneratedTransition(
  transition: BuilderTransitionRecord
): GeneratedTransition {
  return {
    sourceOccurrenceId: transition.sourceOccurrenceId,
    targetOccurrenceId: transition.targetOccurrenceId,
    moveUci: transition.moveUci,
    ply: transition.ply,
    moveFacts: transition.moveFacts,
    moveFamily: transition.moveFamily
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
  rootOccurrenceId: string,
  preferredOccurrenceIds: string[] = []
) {
  const occurrenceIdSet = new Set(
    builderBootstrapManifest.occurrences.map((occurrence) => occurrence.occurrenceId)
  );
  const rankedIds = builderBootstrapManifest.occurrences
    .slice()
    .sort((left, right) => {
      if (right.salience.normalizedScore !== left.salience.normalizedScore) {
        return right.salience.normalizedScore - left.salience.normalizedScore;
      }

      return left.ply - right.ply;
    })
    .map((occurrence) => occurrence.occurrenceId);
  const preferredIds = [...new Set(preferredOccurrenceIds)].filter(
    (occurrenceId) =>
      occurrenceId !== rootOccurrenceId && occurrenceIdSet.has(occurrenceId)
  );
  const preferredIdSet = new Set(preferredIds);

  return [
    ...preferredIds,
    rootOccurrenceId,
    ...rankedIds.filter(
      (occurrenceId) =>
        occurrenceId !== rootOccurrenceId && !preferredIdSet.has(occurrenceId)
    )
  ].slice(0, Math.min(16, rankedIds.length + preferredIds.length + 1));
}

function resolveExpansionAzimuths(
  parentAzimuth: number,
  moveCount: number,
  parentPly: number
) {
  if (moveCount <= 0) {
    return [];
  }

  if (parentPly === 0) {
    const segmentSpan = (Math.PI * 2) / moveCount;

    return Array.from({ length: moveCount }, (_, index) =>
      roundAngle(-Math.PI + (segmentSpan * (index + 0.5)))
    );
  }

  if (moveCount === 1) {
    return [roundAngle(parentAzimuth)];
  }

  const spread = resolveExpansionSpread(moveCount);
  const step = spread / Math.max(1, moveCount - 1);
  const start = parentAzimuth - (spread * 0.5);

  return Array.from({ length: moveCount }, (_, index) =>
    roundAngle(start + (step * index))
  );
}

function resolveExpansionSpread(moveCount: number) {
  return Math.min(
    ADDITIVE_EXPANSION_MAX_SPREAD,
    Math.max(
      ADDITIVE_EXPANSION_MIN_SPREAD,
      Math.max(0, moveCount - 1) * ADDITIVE_EXPANSION_STEP
    )
  );
}

function normalizeAngle(angle: number) {
  let normalizedAngle = angle;

  while (normalizedAngle <= -Math.PI) {
    normalizedAngle += Math.PI * 2;
  }

  while (normalizedAngle > Math.PI) {
    normalizedAngle -= Math.PI * 2;
  }

  return normalizedAngle;
}

function roundAngle(angle: number) {
  return roundNumber(normalizeAngle(angle));
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
  const sectorSpan = sectorEnd - sectorStart;

  return resolveCoordinateFromAzimuth(
    depth,
    angle,
    phaseLabel,
    isTerminal,
    Math.min(0.08, sectorSpan * 0.08)
  );
}

function resolveAdditiveExpansionCoordinate(
  depth: number,
  azimuth: number,
  phaseLabel: string,
  isTerminal: boolean,
  spread: number
) {
  return resolveCoordinateFromAzimuth(
    depth,
    azimuth,
    phaseLabel,
    isTerminal,
    Math.min(0.08, Math.max(0.035, spread * 0.08))
  );
}

function resolveCoordinateFromAzimuth(
  depth: number,
  azimuth: number,
  phaseLabel: string,
  isTerminal: boolean,
  lateralScale: number
): [number, number, number] {
  const planarRadius = 0.42 + (depth * 0.38);
  const phaseOffset =
    phaseLabel === 'opening' ? 0.08 : phaseLabel === 'endgame' ? -0.08 : 0;
  const y = roundNumber(
    phaseOffset + (isTerminal ? -0.06 : 0) + (Math.sin(azimuth * 2) * lateralScale)
  );

  return [
    roundNumber(Math.sin(azimuth) * planarRadius),
    y,
    roundNumber(Math.cos(azimuth) * planarRadius)
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