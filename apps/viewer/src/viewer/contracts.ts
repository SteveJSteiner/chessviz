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

export interface WorkspaceBoundary {
  artifactRoot: string;
  builderBootstrapManifest: string;
  viewerSceneManifest: string;
}