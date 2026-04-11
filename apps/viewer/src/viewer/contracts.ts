export type Vector3 = [number, number, number];

export interface CameraBootstrap {
  position: Vector3;
  lookAt: Vector3;
  fov: number;
}

export interface SceneBootstrap {
  sceneId: string;
  title: string;
  summary: string;
  accentColor: string;
  camera: CameraBootstrap;
}

export interface NavigationEntryPoint {
  entryId: string;
  label: string;
  description: string;
  focus: Vector3;
  distance: number;
}

export interface BuilderOccurrencePriorityHint {
  priorityRank: number;
  priorityBand: string;
  retainFromZoom: string;
}

export interface BuilderOccurrenceSalience {
  rawScore: number;
  normalizedScore: number;
  frequencySignal: number;
  terminalPullSignal: number;
  centralitySignal: number;
  priorityHint: BuilderOccurrencePriorityHint;
}

export interface BuilderOccurrenceTerminal {
  wdlLabel: string;
  outcomeClass: string;
  anchorId: string;
}

export interface BuilderOccurrenceEmbedding {
  coordinate: Vector3;
  ballRadius: number;
  azimuth: number;
  elevation: number;
  rootGameId: string;
  terminalAnchorId: string | null;
}

export interface BuilderOccurrenceRecord {
  occurrenceId: string;
  stateKey: string;
  path: string[];
  ply: number;
  phase: string;
  materialSignature: string;
  salience: BuilderOccurrenceSalience;
  terminal: BuilderOccurrenceTerminal | null;
  embedding: BuilderOccurrenceEmbedding;
}

export interface BuilderEdgeRecord {
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
}

export interface BuilderMoveFactRecord {
  san: string;
  movingPiece: string;
  capturedPiece: string | null;
  promotionPiece: string | null;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: boolean;
  castleSide: string | null;
  isEnPassant: boolean;
}

export interface BuilderMoveFamilyRecord {
  interactionClass: string;
  forcingClass: string;
  specialClass: string;
}

export interface BuilderTransitionRecord extends BuilderEdgeRecord {
  moveUci: string;
  ply: number;
  moveFacts: BuilderMoveFactRecord;
  moveFamily: BuilderMoveFamilyRecord;
}

export interface BuilderDepartureRuleRecord extends BuilderEdgeRecord {
  moveUci: string;
  ply: number;
  moveFamily: BuilderMoveFamilyRecord;
  centerlineProfile: string;
  departureStrength: number;
  lateralOffset: number;
  verticalLift: number;
  curvature: number;
  twist: number;
}

export interface BuilderRepeatedStateRelationRecord {
  stateKey: string;
  occurrenceIds: string[];
}

export interface BuilderTerminalAnchorRecord {
  anchorId: string;
  wdlLabel: string;
  outcomeClass: string;
  occurrenceIds: string[];
}

export interface BuilderBootstrapManifest {
  graphObjectId: string;
  sourceName: string;
  version: string;
  rootOccurrenceIds: string[];
  leafOccurrenceIds: string[];
  priorityFrontierOccurrenceIds: string[];
  occurrences: BuilderOccurrenceRecord[];
  edges: BuilderEdgeRecord[];
  transitions: BuilderTransitionRecord[];
  departureRules: BuilderDepartureRuleRecord[];
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[];
  terminalAnchors: BuilderTerminalAnchorRecord[];
  salienceConfig: {
    frequencyWeight: number;
    terminalPullWeight: number;
    centralityWeight: number;
    normalization: string;
    topKFrontier: number;
  };
  embeddingConfig: {
    seed: number;
    rootRingRadius: number;
    maxRadius: number;
    radialScale: number;
    moveAngleScale: number;
    moveAngleDecay: number;
    repeatedStatePull: number;
    phasePitch: number;
    terminalPitch: number;
  };
}

export interface RuntimeExplorationConfig {
  graphObjectId: string;
  initialFocusOccurrenceId: string;
  focusCandidateOccurrenceIds: string[];
  defaultNeighborhoodRadius: number;
  maxNeighborhoodRadius: number;
  defaultRefinementBudget: number;
  maxRefinementBudget: number;
  cacheCapacity: number;
}

export interface ViewerSceneManifest {
  sceneId: string;
  title: string;
  summary: string;
  accentColor: string;
  camera: CameraBootstrap;
  runtime: RuntimeExplorationConfig;
}

export interface RuntimeExplorationCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entryCount: number;
}

export interface RuntimeNeighborhoodOccurrence extends BuilderOccurrenceRecord {
  distance: number;
  isFocus: boolean;
}

export interface RuntimeNeighborhoodEdge extends BuilderEdgeRecord {
  distance: number;
}

export interface RuntimeNeighborhoodSnapshot {
  graphObjectId: string;
  focusOccurrenceId: string;
  radius: number;
  refinementBudget: number;
  objectIdentityStable: boolean;
  cacheState: 'hit' | 'miss';
  cacheStats: RuntimeExplorationCacheStats;
  occurrences: RuntimeNeighborhoodOccurrence[];
  edges: RuntimeNeighborhoodEdge[];
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[];
  terminalAnchors: BuilderTerminalAnchorRecord[];
  priorityFrontierOccurrenceIds: string[];
}

export interface RuntimeTransitionSurfaceSnapshot {
  graphObjectId: string;
  occurrenceIds: string[];
  transitions: BuilderTransitionRecord[];
  departureRules: BuilderDepartureRuleRecord[];
}

export type RuntimeCarrierBandId = 'structure' | 'tactical' | 'contextual';

export interface RuntimeCarrierBandState {
  bandId: RuntimeCarrierBandId;
  revealBudget: number;
  amplitude: number;
  active: boolean;
}

export interface RuntimeCarrierValidation {
  endpointLocked: boolean;
  finiteCoordinates: boolean;
  projectedProgressMonotone: boolean;
  nonDegenerateSegments: boolean;
  coarseDominant: boolean;
}

export interface RuntimeCarrierRecord extends BuilderDepartureRuleRecord {
  san: string;
  activeBands: RuntimeCarrierBandId[];
  bandStates: RuntimeCarrierBandState[];
  samples: Vector3[];
  validation: RuntimeCarrierValidation;
}

export interface RuntimeCarrierSurfaceSnapshot {
  graphObjectId: string;
  occurrenceIds: string[];
  refinementBudget: number;
  carriers: RuntimeCarrierRecord[];
}

export interface RuntimeOccurrenceLineMove {
  ply: number;
  uci: string;
  san: string | null;
  sourceOccurrenceId: string | null;
  targetOccurrenceId: string;
}

export interface RuntimeOccurrenceLine {
  occurrenceId: string;
  rootGameId: string;
  moves: RuntimeOccurrenceLineMove[];
}

export interface WorkspaceBoundary {
  artifactRoot: string;
  builderBootstrapManifest: string;
  viewerSceneManifest: string;
}