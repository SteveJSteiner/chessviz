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
export type PublishedTableRegimeId = Exclude<
  BuilderRegimeId,
  'middlegame-procedural'
>;

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
  distance: number;
  neighborhoodRadius: number;
  orbit: CameraOrbitPreset;
  subtreeKey: string;
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
  subtreeKey: string | null;
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
  subtreeKey: string;
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

export interface PublishedTableAssetReference {
  regimeId: PublishedTableRegimeId;
  assetSetId: string;
  manifestPath: string;
  manifestHash: string;
  coverageMetadataId: string;
  positionCount: number;
  shardCount: number;
  sourceProvenance: BuilderRecordProvenance;
  sourceHash: string;
}

export interface WebCorpusIngestionInputRecord {
  sourceKind: string;
  sourceName: string;
  sourceVersion: string;
  sourceLocation: string;
  sourceHash: string;
}

export interface WebCorpusManifest {
  schemaVersion: string;
  representationSchemaVersion: string;
  graphObjectId: string;
  identitySemantics: BuilderIdentitySemantics;
  coverageMetadata: BuilderCoverageMetadataRecord[];
  resolverInputs: BuilderResolverInputRecord[];
  regimeDeclarations: BuilderRegimeDeclaration[];
  publishedTableAssets: PublishedTableAssetReference[];
  ingestionInputs: {
    openingImport: WebCorpusIngestionInputRecord;
    endgameImport: WebCorpusIngestionInputRecord;
  };
}

export interface TableAssetShardDescriptor {
  shardId: string;
  relativePath: string;
  entryCount: number;
  sha256: string;
}

export interface TableAssetManifest {
  schemaVersion: string;
  representationSchemaVersion: string;
  graphObjectId: string;
  regimeId: PublishedTableRegimeId;
  assetSetId: string;
  contentKind: string;
  coverageMetadata: BuilderCoverageMetadataRecord;
  sourceProvenance: BuilderRecordProvenance;
  sourceHash: string;
  positionCount: number;
  shardCount: number;
  shards: TableAssetShardDescriptor[];
}

export interface OpeningTableMoveRecord {
  moveUci: string;
  moveSan: string;
  continuationPositionKey: string;
  weight: number;
  frequency: number;
}

export interface OpeningTablePositionRecord {
  positionKey: string;
  maxCoveragePly: number;
  totalSampleCount: number;
  moves: OpeningTableMoveRecord[];
  provenance: BuilderRecordProvenance;
}

export interface OpeningTableShard {
  schemaVersion: string;
  representationSchemaVersion: string;
  graphObjectId: string;
  regimeId: 'opening-table';
  assetSetId: string;
  contentKind: string;
  shardId: string;
  entries: OpeningTablePositionRecord[];
}

export interface EndgameTerminalPayload {
  wdlLabel: string;
  outcomeClass: string;
  distanceToZeroing: number;
}

export interface EndgameTablePositionRecord {
  positionKey: string;
  materialSignature: string;
  terminalPayload: EndgameTerminalPayload;
  score: number;
  provenance: BuilderRecordProvenance;
}

export interface EndgameTableShard {
  schemaVersion: string;
  representationSchemaVersion: string;
  graphObjectId: string;
  regimeId: 'endgame-table';
  assetSetId: string;
  contentKind: string;
  shardId: string;
  entries: EndgameTablePositionRecord[];
}

export interface RuntimeArtifactBundle {
  builderBootstrapManifest: BuilderBootstrapManifest;
  viewerSceneManifest: ViewerSceneManifest;
  webCorpusManifest: WebCorpusManifest;
  openingTableManifest: TableAssetManifest;
  openingTableShardsByRelativePath: Record<string, OpeningTableShard>;
  endgameTableManifest: TableAssetManifest;
  endgameTableShardsByRelativePath: Record<string, EndgameTableShard>;
}

export interface MiddlegameProceduralPolicy {
  policyId: string;
  expansionMode: string;
  scoringMode: string;
  pruningMode: string;
  detail: string;
}

export interface RuntimeProceduralResolution {
  occurrenceId: string;
  policy: MiddlegameProceduralPolicy;
  defaultNeighborhoodRadius: number;
  defaultRefinementBudget: number;
}

export interface RuntimeOpeningTableResolutionSource {
  kind: 'opening-table';
  assetSetId: string;
  manifestPath: string;
  relativePath: string;
  shardId: string;
  entry: OpeningTablePositionRecord;
}

export interface RuntimeEndgameTableResolutionSource {
  kind: 'endgame-table';
  assetSetId: string;
  manifestPath: string;
  relativePath: string;
  shardId: string;
  entry: EndgameTablePositionRecord;
}

export interface RuntimeMiddlegameProceduralResolutionSource {
  kind: 'middlegame-procedural';
  policy: MiddlegameProceduralPolicy;
  occurrenceId: string;
  defaultNeighborhoodRadius: number;
  defaultRefinementBudget: number;
}

export type RuntimeResolutionSource =
  | RuntimeOpeningTableResolutionSource
  | RuntimeEndgameTableResolutionSource
  | RuntimeMiddlegameProceduralResolutionSource;

export interface RuntimeResolvedOccurrence {
  occurrence: BuilderOccurrenceRecord;
  resolvedRegimeId: BuilderRegimeId;
  resolverInput: BuilderResolverInputRecord;
  coverageMetadata: BuilderCoverageMetadataRecord;
  regimeDeclaration: BuilderRegimeDeclaration;
  source: RuntimeResolutionSource;
}

export interface RuntimeBootstrapContract {
  representationSchemaVersion: string;
  seedSurface: string;
  focusCandidatesSource: string;
  entrypointDerivation: string;
  webCorpusManifest: string;
  openingTableManifest: string;
  endgameTableManifest: string;
  middlegameProceduralPolicy: string;
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

export type RuntimeGraphViewScope = 'local-neighborhood' | 'whole-object';

export type RuntimeOccurrenceLod = 'focus' | 'detail' | 'context' | 'distant';

export interface RuntimeRenderDemandPolicy {
  renderSubsetPolicy: string;
  residencyPolicy: string;
  lodPolicy: string;
  focusLevelPolicy: string;
  detailNeighborhoodRadius: number;
  visibleLowDetailOccurrenceTarget: number;
  visibleEdgeTarget: number;
}

export interface RuntimeRenderDemandSnapshot {
  scope: RuntimeGraphViewScope;
  policy: RuntimeRenderDemandPolicy;
  enumeratedOccurrenceCount: number;
  enumeratedEdgeCount: number;
  visibleOccurrenceCount: number;
  visibleEdgeCount: number;
  hotOccurrenceCount: number;
  warmOccurrenceCount: number;
  coldOccurrenceCount: number;
  frontierExpansionOccurrenceIds: string[];
}

export interface RuntimeNeighborhoodOccurrence extends BuilderOccurrenceRecord {
  distance: number;
  isFocus: boolean;
  lod: RuntimeOccurrenceLod;
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
  renderDemand: RuntimeRenderDemandSnapshot;
  occurrences: RuntimeNeighborhoodOccurrence[];
  edges: RuntimeNeighborhoodEdge[];
  repeatedStateRelations: BuilderRepeatedStateRelationRecord[];
  terminalAnchors: BuilderAnchorRecord[];
  priorityFrontierOccurrenceIds: string[];
}

export type RuntimeTranspositionEmphasis = 'focus' | 'context';

export interface RuntimeTranspositionOccurrence {
  occurrenceId: string;
  coordinate: Vector3;
  subtreeKey: string;
  ply: number;
  phaseLabel: string;
  isFocus: boolean;
  isVisibleInNeighborhood: boolean;
}

export interface RuntimeTranspositionLink {
  stateKey: string;
  sourceOccurrenceId: string;
  targetOccurrenceId: string;
  sourceVisibleInNeighborhood: boolean;
  targetVisibleInNeighborhood: boolean;
  emphasis: RuntimeTranspositionEmphasis;
  samples: Vector3[];
}

export interface RuntimeTranspositionGroup {
  stateKey: string;
  emphasis: RuntimeTranspositionEmphasis;
  visibleOccurrenceIds: string[];
  offViewOccurrenceIds: string[];
  occurrences: RuntimeTranspositionOccurrence[];
  links: RuntimeTranspositionLink[];
}

export interface RuntimeTranspositionSurfaceSnapshot {
  graphObjectId: string;
  groups: RuntimeTranspositionGroup[];
  links: RuntimeTranspositionLink[];
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

export interface RuntimeArtifactBoundary {
  artifactRoot: string;
  builderBootstrapManifest: string;
  viewerSceneManifest: string;
  webCorpusManifest: string;
  openingTableManifest: string;
  endgameTableManifest: string;
}