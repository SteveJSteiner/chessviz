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

export type NavigationEntryPointId = 'opening' | 'middlegame' | 'endgame';
export type BuilderRegimeId =
  | 'opening-table'
  | 'middlegame-procedural'
  | 'endgame-table';

export interface CameraOrbitPreset {
  azimuth: number;
  elevation: number;
}

export interface NavigationEntryPoint {
  anchorId: string;
  entryId: NavigationEntryPointId;
  label: string;
  description: string;
  regimeId: BuilderRegimeId;
  focusOccurrenceId: string;
  focus: Vector3;
  distance: number;
  neighborhoodRadius: number;
  orbit: CameraOrbitPreset;
  rootGameId: string;
  anchorPly: number;
}

export interface BuilderRecordProvenance {
  sourceKind: string;
  sourceName: string;
  sourceVersion: string;
  sourceLocation: string;
  detail: string;
}

export interface BuilderIdentitySemantics {
  occurrenceKeyField: string;
  positionKeyField: string;
  pathKeyField: string;
  continuityKeyField: string;
}

export interface BuilderOccurrenceIdentity {
  occurrenceKey: string;
  positionKey: string;
  pathKey: string;
  continuityKey: string;
}

export interface BuilderOccurrenceAnnotations {
  phaseLabel: string;
  materialSignature: string;
}

export interface BuilderCoverageMetadataRecord {
  coverageMetadataId: string;
  regimeId: BuilderRegimeId;
  coverageKind: string;
  summary: string;
  occurrenceCount: number;
  maxPly: number | null;
  supportedMaterialSignatures: string[];
}

export interface BuilderResolverInputRecord {
  resolverInputId: string;
  regimeId: BuilderRegimeId;
  priority: number;
  selector: string;
  coverageMetadataId: string;
  isFallback: boolean;
}

export interface BuilderOccurrenceRegime {
  regimeId: BuilderRegimeId;
  candidateRegimeIds: BuilderRegimeId[];
  resolverInputId: string;
  selectionRule: string;
}

export interface BuilderRegimeDeclaration {
  regimeId: BuilderRegimeId;
  label: string;
  backingKind: 'table' | 'procedural';
  schemaVersion: string;
  coverageMetadataId: string;
  resolverInputId: string;
  provenance: BuilderRecordProvenance;
}

export interface BuilderAnchorRecord {
  anchorId: string;
  anchorKind: 'navigation-entry' | 'terminal-outcome';
  label: string;
  occurrenceIds: string[];
  regimeId: BuilderRegimeId | null;
  provenance: BuilderRecordProvenance;
  entryId: NavigationEntryPointId | null;
  wdlLabel: string | null;
  outcomeClass: string | null;
  anchorPly: number | null;
  rootGameId: string | null;
}

export interface BuilderTransitionIdentity {
  transitionKey: string;
  sourceOccurrenceKey: string;
  targetOccurrenceKey: string;
  sourcePositionKey: string;
  targetPositionKey: string;
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
  provenance: BuilderRecordProvenance;
}

export interface BuilderOccurrenceTerminal {
  wdlLabel: string;
  outcomeClass: string;
  anchorId: string;
  provenance: BuilderRecordProvenance;
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
  identity: BuilderOccurrenceIdentity;
  annotations: BuilderOccurrenceAnnotations;
  regime: BuilderOccurrenceRegime;
  provenance: BuilderRecordProvenance;
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
  identity: BuilderTransitionIdentity;
  provenance: BuilderRecordProvenance;
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

export interface BuilderBootstrapManifest {
  schemaVersion: string;
  graphObjectId: string;
  sourceName: string;
  version: string;
  identitySemantics: BuilderIdentitySemantics;
  coverageMetadata: BuilderCoverageMetadataRecord[];
  resolverInputs: BuilderResolverInputRecord[];
  regimeDeclarations: BuilderRegimeDeclaration[];
  anchors: BuilderAnchorRecord[];
  rootOccurrenceIds: string[];
  leafOccurrenceIds: string[];
  priorityFrontierOccurrenceIds: string[];
  occurrences: BuilderOccurrenceRecord[];
  edges: BuilderEdgeRecord[];
  transitions: BuilderTransitionRecord[];
  departureRules: BuilderDepartureRuleRecord[];
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[];
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

export interface RuntimeBootstrapContract {
  representationSchemaVersion: string;
  seedSurface: string;
  focusCandidatesSource: string;
  entrypointDerivation: string;
}

export interface RuntimeExplorationConfig {
  graphObjectId: string;
  bootstrap: RuntimeBootstrapContract;
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
  terminalAnchors: BuilderAnchorRecord[];
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