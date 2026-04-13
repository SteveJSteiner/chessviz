import type {
  BuilderOccurrenceRecord,
  NavigationEntryPoint,
  NavigationEntryPointId,
  RuntimeArtifactBoundary,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationConfig,
  RuntimeNeighborhoodSnapshot,
  RuntimeTranspositionSurfaceSnapshot,
  RuntimeTransitionSurfaceSnapshot,
  SceneBootstrap
} from './contracts';
import type { CameraGrammarState } from './cameraGrammar.ts';
import { ChessBoard } from './ChessBoard.tsx';
import {
  formatFocusOptionLabel,
  formatSubtreeLabel,
  formatTerminalOutcomeLabel,
  parseStateKey,
  shortOccurrenceId,
  summarizeMoveSemantics
} from './chessContext.ts';
import {
  CARRIER_FAMILY_KEY,
  PHASE_NODE_KEY,
  TERMINAL_NODE_KEY,
  createCarrierPresentation
} from './carrierPresentation.ts';
import { LIVE_VIEW_DISTANCE } from './labelPolicy.ts';
import type { ViewerRenderTuning } from './renderTuning.ts';
import { SmokeCanvas } from './SmokeCanvas';

type ViewerShellProps = {
  activeEntryPointId: NavigationEntryPointId;
  boardReferenceOpen: boolean;
  cameraGrammar: CameraGrammarState;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  cameraDistance: number;
  entryPoints: NavigationEntryPoint[];
  focusOptions: BuilderOccurrenceRecord[];
  graphViewScope: 'local-neighborhood' | 'whole-object';
  hoveredOccurrence: BuilderOccurrenceRecord | null;
  meetsN12Scale: boolean;
  runtimeConfig: RuntimeExplorationConfig;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  transpositionSurface: RuntimeTranspositionSurfaceSnapshot;
  transitionSurface: RuntimeTransitionSurfaceSnapshot;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  onBoardReferenceOpenChange: (open: boolean) => void;
  onEntryPointChange: (entryId: NavigationEntryPointId) => void;
  onGraphViewScopeChange: (scope: 'local-neighborhood' | 'whole-object') => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  runtimeArtifactBoundary: RuntimeArtifactBoundary;
  neighborhoodRadius: number;
  orbitResetKey: number;
  onRenderTuningChange: (partialTuning: Partial<ViewerRenderTuning>) => void;
  onResetRenderTuning: () => void;
  onCameraDistanceChange: (distance: number) => void;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onNeighborhoodRadiusChange: (radius: number) => void;
  renderTuning: ViewerRenderTuning;
  totalGraphEdgeCount: number;
  totalGraphOccurrenceCount: number;
};

const shellStyle = {
  width: '100vw',
  height: '100vh',
  display: 'grid',
  gridTemplateColumns: 'minmax(24rem, 32rem) 1fr',
  background: 'linear-gradient(135deg, #f5f7f0 0%, #e3ead9 100%)',
  color: '#1f2933'
} as const;

const panelStyle = {
  padding: '1.5rem',
  borderRight: '1px solid rgba(31, 41, 51, 0.12)',
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(10px)',
  overflowY: 'auto'
} as const;

const canvasStyle = {
  position: 'relative',
  minHeight: '100vh'
} as const;

const headingStyle = {
  margin: '0 0 0.5rem',
  fontSize: '1.5rem'
} as const;

const metaLabelStyle = {
  display: 'block',
  marginTop: '1.25rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
} as const;

const controlStackStyle = {
  display: 'grid',
  gap: '0.85rem',
  marginTop: '1rem'
} as const;

const entryPointGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.55rem'
} as const;

const graphScopeGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.55rem'
} as const;

const controlLabelStyle = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.9rem'
} as const;

const controlInputStyle = {
  width: '100%'
} as const;

const statGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.75rem',
  marginTop: '1rem'
} as const;

const statCardStyle = {
  padding: '0.75rem',
  borderRadius: '0.75rem',
  background: 'rgba(15, 118, 110, 0.08)'
} as const;

const codeBlockStyle = {
  margin: '0.5rem 0 0',
  padding: '0.65rem 0.75rem',
  borderRadius: '0.75rem',
  background: 'rgba(31, 41, 51, 0.06)',
  overflowX: 'auto',
  fontSize: '0.78rem'
} as const;

const sectionStackStyle = {
  display: 'grid',
  gap: '0.85rem',
  marginTop: '1rem'
} as const;

const narrativeCardStyle = {
  borderRadius: '1rem',
  padding: '0.95rem 1rem',
  background: 'rgba(247, 241, 230, 0.9)',
  border: '1px solid rgba(53, 42, 30, 0.09)'
} as const;

const warningCardStyle = {
  ...narrativeCardStyle,
  background: 'rgba(185, 28, 28, 0.08)',
  border: '1px solid rgba(185, 28, 28, 0.18)'
} as const;

const moveCardStyle = {
  borderRadius: '0.9rem',
  padding: '0.85rem',
  background: 'rgba(255, 255, 255, 0.88)',
  border: '1px solid rgba(31, 41, 51, 0.08)',
  display: 'grid',
  gap: '0.6rem'
} as const;

const detailsStyle = {
  marginTop: '1rem'
} as const;

const secondaryButtonStyle = {
  padding: '0.55rem 0.75rem',
  borderRadius: '0.7rem',
  border: '1px solid rgba(31, 41, 51, 0.12)',
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#1f2933',
  cursor: 'pointer',
  fontSize: '0.86rem'
} as const;

const inlineButtonStyle = {
  ...secondaryButtonStyle,
  padding: '0.45rem 0.65rem',
  fontSize: '0.8rem',
  justifySelf: 'start'
} as const;

const legendGridStyle = {
  display: 'grid',
  gap: '0.55rem',
  marginTop: '0.75rem'
} as const;

const legendRowStyle = {
  display: 'grid',
  gridTemplateColumns: '2.5rem 1fr',
  gap: '0.7rem',
  alignItems: 'center'
} as const;

const legendSwatchStyle = {
  width: '2.5rem',
  height: '1.2rem',
  borderRadius: '999px',
  border: '2px solid transparent',
  position: 'relative'
} as const;

const selectionGridStyle = {
  display: 'grid',
  gap: '0.85rem',
  marginTop: '1rem'
} as const;

const selectionCardStyle = {
  ...narrativeCardStyle,
  padding: '0.85rem'
} as const;

const selectionContentStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(8.5rem, 9.5rem) 1fr',
  gap: '0.75rem',
  alignItems: 'start',
  marginTop: '0.7rem'
} as const;

const selectionTextStyle = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.8rem',
  color: '#5f5547'
} as const;

function resolveEntryPointButtonStyle(isActive: boolean) {
  return {
    ...secondaryButtonStyle,
    borderColor: isActive ? 'rgba(15, 118, 110, 0.65)' : 'rgba(31, 41, 51, 0.12)',
    background: isActive ? 'rgba(15, 118, 110, 0.14)' : 'rgba(255, 255, 255, 0.9)',
    color: isActive ? '#0f5d57' : '#1f2933',
    fontWeight: isActive ? 700 : 500
  };
}

export function ViewerShell({
  activeEntryPointId,
  boardReferenceOpen,
  cameraGrammar,
  carrierSurface,
  cameraDistance,
  entryPoints,
  focusOptions,
  graphViewScope,
  hoveredOccurrence,
  meetsN12Scale,
  runtimeConfig,
  runtimeSnapshot,
  transpositionSurface,
  transitionSurface,
  sceneBootstrap,
  navigationEntryPoint,
  onBoardReferenceOpenChange,
  onEntryPointChange,
  onGraphViewScopeChange,
  onHoverOccurrenceChange,
  runtimeArtifactBoundary,
  neighborhoodRadius,
  orbitResetKey,
  onRenderTuningChange,
  onResetRenderTuning,
  onCameraDistanceChange,
  onFocusOccurrenceChange,
  onNeighborhoodRadiusChange,
  renderTuning,
  totalGraphEdgeCount,
  totalGraphOccurrenceCount
}: ViewerShellProps) {
  const isWholeObjectView = graphViewScope === 'whole-object';
  const focusOccurrence = runtimeSnapshot.occurrences.find(
    (occurrence) => occurrence.isFocus
  );
  const hoverMatchesFocus =
    hoveredOccurrence?.occurrenceId === runtimeSnapshot.focusOccurrenceId;
  const focusParsedStateKey = focusOccurrence
    ? parseStateKey(focusOccurrence.stateKey)
    : null;
  const occurrenceById = new Map(
    runtimeSnapshot.occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence])
  );
  const strongestDepartureRule = transitionSurface.departureRules.reduce<
    RuntimeTransitionSurfaceSnapshot['departureRules'][number] | null
  >((strongestRule, rule) => {
    if (!strongestRule || rule.departureStrength > strongestRule.departureStrength) {
      return rule;
    }

    return strongestRule;
  }, null);
  const strongestCarrier = carrierSurface.carriers.reduce<
    RuntimeCarrierSurfaceSnapshot['carriers'][number] | null
  >((currentStrongest, carrier) => {
    if (!currentStrongest || carrier.departureStrength > currentStrongest.departureStrength) {
      return carrier;
    }

    return currentStrongest;
  }, null);
  const focusTransitions = transitionSurface.transitions
    .filter(
      (transition) =>
        transition.sourceOccurrenceId === runtimeSnapshot.focusOccurrenceId ||
        transition.targetOccurrenceId === runtimeSnapshot.focusOccurrenceId
    )
    .sort((left, right) => left.ply - right.ply);
  const focusTranspositionGroup = transpositionSurface.groups.find((group) =>
    group.occurrences.some((occurrence) => occurrence.isFocus)
  );
  const relatedFocusOccurrences = focusTranspositionGroup
    ? [...focusTranspositionGroup.occurrences]
        .filter((occurrence) => !occurrence.isFocus)
        .sort((left, right) => {
          if (left.isVisibleInNeighborhood !== right.isVisibleInNeighborhood) {
            return left.isVisibleInNeighborhood ? -1 : 1;
          }

          if (left.subtreeKey !== right.subtreeKey) {
            return left.subtreeKey.localeCompare(right.subtreeKey);
          }

          return left.ply - right.ply;
        })
    : [];
  const transpositionEchoCount = transpositionSurface.groups.reduce(
    (count, group) => count + group.offViewOccurrenceIds.length,
    0
  );

  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
          N13 Transposition Relations
        </p>
        <h1 style={headingStyle}>{sceneBootstrap.title}</h1>
        <p>{sceneBootstrap.summary}</p>

        {!meetsN12Scale ? (
          <article style={warningCardStyle}>
            <div style={{ fontWeight: 700 }}>Scale note</div>
            <p style={{ margin: '0.45rem 0 0' }}>
              This artifact is enough to inspect N13 transposition legibility, but it remains below the later large-scale N14 acceptance run.
            </p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#7f1d1d' }}>
              Total graph size {totalGraphOccurrenceCount} nodes and {totalGraphEdgeCount} edges. The 1000+ visible-node requirement is deferred to N14.
            </p>
          </article>
        ) : null}

        <div style={controlStackStyle}>
          <div style={entryPointGridStyle}>
            {entryPoints.map((entryPoint) => (
              <button
                key={entryPoint.entryId}
                onClick={() => onEntryPointChange(entryPoint.entryId)}
                style={resolveEntryPointButtonStyle(
                  entryPoint.entryId === activeEntryPointId
                )}
                type="button"
              >
                {entryPoint.label}
              </button>
            ))}
          </div>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>{navigationEntryPoint.label} entrypoint</div>
            <p style={{ margin: '0.45rem 0 0' }}>{navigationEntryPoint.description}</p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
              Anchor ply {navigationEntryPoint.anchorPly} · radius {navigationEntryPoint.neighborhoodRadius} · preset distance {navigationEntryPoint.distance.toFixed(1)}
            </p>
          </article>

          <label style={controlLabelStyle}>
            Focus occurrence
            <select
              onChange={(event) => onFocusOccurrenceChange(event.target.value)}
              style={controlInputStyle}
              value={runtimeSnapshot.focusOccurrenceId}
            >
              {focusOptions.map((occurrence) => (
                <option key={occurrence.occurrenceId} value={occurrence.occurrenceId}>
                  {formatFocusOptionLabel(occurrence)}
                </option>
              ))}
            </select>
          </label>

          <label style={controlLabelStyle}>
            Graph scope
            <div style={graphScopeGridStyle}>
              <button
                onClick={() => onGraphViewScopeChange('local-neighborhood')}
                style={resolveEntryPointButtonStyle(
                  graphViewScope === 'local-neighborhood'
                )}
                type="button"
              >
                Local neighborhood
              </button>
              <button
                onClick={() => onGraphViewScopeChange('whole-object')}
                style={resolveEntryPointButtonStyle(graphViewScope === 'whole-object')}
                type="button"
              >
                Whole object
              </button>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#6c6254' }}>
              {isWholeObjectView
                ? `Rendering ${runtimeSnapshot.occurrences.length} of ${totalGraphOccurrenceCount} nodes in one view; neighborhood radius is bypassed.`
                : 'Neighborhood mode limits the graph-radius view around the current focus. Whole-object mode is useful for inspecting distributed transposition clusters.'}
            </span>
          </label>

          {isWholeObjectView ? (
            <article style={narrativeCardStyle}>
              <div style={{ fontWeight: 700 }}>Whole-object scope</div>
              <p style={{ margin: '0.45rem 0 0' }}>
                This view keeps the current focus anchor but renders the entire graph object instead of a local radius window.
              </p>
            </article>
          ) : (
            <label style={controlLabelStyle}>
              Neighborhood radius: {neighborhoodRadius}
              <input
                max={runtimeConfig.maxNeighborhoodRadius}
                min={0}
                onChange={(event) =>
                  onNeighborhoodRadiusChange(Number(event.target.value))
                }
                style={controlInputStyle}
                type="range"
                value={neighborhoodRadius}
              />
            </label>
          )}

          <label style={controlLabelStyle}>
            View distance: {cameraDistance.toFixed(1)}
            <input
              max={LIVE_VIEW_DISTANCE.max}
              min={LIVE_VIEW_DISTANCE.min}
              onChange={(event) =>
                onCameraDistanceChange(Number(event.target.value))
              }
              step={0.1}
              style={controlInputStyle}
              type="range"
              value={cameraDistance}
            />
            <span style={{ fontSize: '0.82rem', color: '#6c6254' }}>
              Drag on the canvas to orbit. Scroll on the canvas or use this slider to zoom; distance now drives refinement and label reveal.
            </span>
          </label>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>{cameraGrammar.stageLabel}</div>
            <p style={{ margin: '0.45rem 0 0' }}>{cameraGrammar.stageDescription}</p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
              Runtime refinement budget {cameraGrammar.refinementBudget} · label band {cameraGrammar.band}
            </p>
          </article>

          <details style={detailsStyle}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              Render tuning
            </summary>
            <div style={sectionStackStyle}>
              <label style={controlLabelStyle}>
                Node size: {renderTuning.nodeRadiusScale.toFixed(2)}
                <input
                  max={1.4}
                  min={0.65}
                  onChange={(event) =>
                    onRenderTuningChange({
                      nodeRadiusScale: Number(event.target.value)
                    })
                  }
                  step={0.05}
                  style={controlInputStyle}
                  type="range"
                  value={renderTuning.nodeRadiusScale}
                />
              </label>

              <label style={controlLabelStyle}>
                Carrier width: {renderTuning.carrierThicknessScale.toFixed(2)}
                <input
                  max={0.8}
                  min={0.08}
                  onChange={(event) =>
                    onRenderTuningChange({
                      carrierThicknessScale: Number(event.target.value)
                    })
                  }
                  step={0.02}
                  style={controlInputStyle}
                  type="range"
                  value={renderTuning.carrierThicknessScale}
                />
              </label>

              <label style={controlLabelStyle}>
                Carrier glow: {renderTuning.carrierHaloOpacityScale.toFixed(2)}
                <input
                  max={1.5}
                  min={0}
                  onChange={(event) =>
                    onRenderTuningChange({
                      carrierHaloOpacityScale: Number(event.target.value)
                    })
                  }
                  step={0.05}
                  style={controlInputStyle}
                  type="range"
                  value={renderTuning.carrierHaloOpacityScale}
                />
              </label>

              <label style={controlLabelStyle}>
                Label size: {renderTuning.labelScale.toFixed(2)}
                <input
                  max={0.8}
                  min={0.12}
                  onChange={(event) =>
                    onRenderTuningChange({
                      labelScale: Number(event.target.value)
                    })
                  }
                  step={0.02}
                  style={controlInputStyle}
                  type="range"
                  value={renderTuning.labelScale}
                />
              </label>

              <button onClick={onResetRenderTuning} style={secondaryButtonStyle} type="button">
                Reset render tuning
              </button>
            </div>
          </details>
        </div>

        <span style={metaLabelStyle}>Selection</span>
        <div style={selectionGridStyle}>
          <CanvasHudCard
            accentColor="#b7791f"
            description="Current anchor and camera pivot."
            emptyText="No anchored node is available in the current view."
            occurrence={focusOccurrence ?? null}
            title="Anchor"
          />
          <CanvasHudCard
            accentColor="#38bdf8"
            description={hoverMatchesFocus
              ? 'Hover is on the current anchor.'
              : 'Hover previews the node before you click it.'}
            emptyText="Hover a node to inspect its position."
            occurrence={hoveredOccurrence}
            title="Hover"
          />
        </div>

        <div style={statGridStyle}>
          <article style={statCardStyle}>
            <strong>{runtimeSnapshot.occurrences.length}</strong>
            <div>visible occurrences</div>
          </article>
          <article style={statCardStyle}>
            <strong>{runtimeSnapshot.edges.length}</strong>
            <div>visible edges</div>
          </article>
          <article style={statCardStyle}>
            <strong>{totalGraphOccurrenceCount}</strong>
            <div>graph occurrences</div>
          </article>
          <article style={statCardStyle}>
            <strong>{totalGraphEdgeCount}</strong>
            <div>graph edges</div>
          </article>
          <article style={statCardStyle}>
            <strong>{isWholeObjectView ? 'whole-object' : 'local'}</strong>
            <div>view scope</div>
          </article>
          <article style={statCardStyle}>
            <strong>{runtimeSnapshot.cacheState}</strong>
            <div>cache state</div>
          </article>
          <article style={statCardStyle}>
            <strong>{runtimeSnapshot.priorityFrontierOccurrenceIds.length}</strong>
            <div>frontier nodes</div>
          </article>
          <article style={statCardStyle}>
            <strong>{carrierSurface.carriers.length}</strong>
            <div>runtime carriers</div>
          </article>
          <article style={statCardStyle}>
            <strong>{transpositionSurface.groups.length}</strong>
            <div>transposition groups</div>
          </article>
          <article style={statCardStyle}>
            <strong>{transpositionSurface.links.length}</strong>
            <div>relation links</div>
          </article>
          <article style={statCardStyle}>
            <strong>{cameraGrammar.band}</strong>
            <div>label reveal band</div>
          </article>
          <article style={statCardStyle}>
            <strong>{cameraDistance.toFixed(1)}</strong>
            <div>camera distance</div>
          </article>
          <article style={statCardStyle}>
            <strong>{cameraGrammar.refinementBudget}</strong>
            <div>refinement budget</div>
          </article>
        </div>

        <span style={metaLabelStyle}>Visual Key</span>
        <div style={sectionStackStyle}>
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Nodes</div>
            <div style={legendGridStyle}>
              <LegendRow
                fillColor={PHASE_NODE_KEY.opening.fillColor}
                label="Opening nodes"
                markColor={PHASE_NODE_KEY.opening.markColor}
                ringColor={PHASE_NODE_KEY.opening.ringColor}
                text="Blue phase ring."
              />
              <LegendRow
                fillColor={sceneBootstrap.accentColor}
                label="Middlegame nodes"
                markColor={PHASE_NODE_KEY.middlegame.markColor}
                ringColor={PHASE_NODE_KEY.middlegame.ringColor}
                text="Teal phase ring."
              />
              <LegendRow
                fillColor={PHASE_NODE_KEY.endgame.fillColor}
                label="Endgame nodes"
                markColor={PHASE_NODE_KEY.endgame.markColor}
                ringColor={PHASE_NODE_KEY.endgame.ringColor}
                text="Violet phase ring."
              />
              <LegendRow
                fillColor={TERMINAL_NODE_KEY.W.fillColor}
                label="Terminal nodes"
                markColor={TERMINAL_NODE_KEY.W.markColor}
                ringColor="#b7791f"
                text="Green win, orange draw, red loss; the outer gold ring marks the current focus."
              />
            </div>
          </article>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Ribbons</div>
            <div style={legendGridStyle}>
              <LegendRow
                fillColor={CARRIER_FAMILY_KEY.quiet.structureColor}
                label="Quiet"
                markColor={CARRIER_FAMILY_KEY.quiet.tacticalColor}
                ringColor={CARRIER_FAMILY_KEY.quiet.haloColor}
                text="Slate ribbon."
              />
              <LegendRow
                fillColor={CARRIER_FAMILY_KEY.capture.structureColor}
                label="Capture"
                markColor={CARRIER_FAMILY_KEY.capture.tacticalColor}
                ringColor={CARRIER_FAMILY_KEY.capture.haloColor}
                text="Amber ribbon."
              />
              <LegendRow
                fillColor={CARRIER_FAMILY_KEY.castle.structureColor}
                label="Castle"
                markColor={CARRIER_FAMILY_KEY.castle.tacticalColor}
                ringColor={CARRIER_FAMILY_KEY.castle.haloColor}
                text="Teal ribbon."
              />
              <LegendRow
                fillColor={CARRIER_FAMILY_KEY.check.structureColor}
                label="Check"
                markColor={CARRIER_FAMILY_KEY.check.tacticalColor}
                ringColor={CARRIER_FAMILY_KEY.check.haloColor}
                text="Indigo ribbon."
              />
              <LegendRow
                fillColor={CARRIER_FAMILY_KEY.terminal.structureColor}
                label="Mate"
                markColor={CARRIER_FAMILY_KEY.terminal.tacticalColor}
                ringColor={CARRIER_FAMILY_KEY.terminal.haloColor}
                text="Magenta ribbon."
              />
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.83rem', color: '#5f5547' }}>
              Direction is embedded on the ribbon with a single slim arrowhead near the target node. Blue means the move leaves the focus node. Amber means the move arrives at the focus node.
            </p>
          </article>
        </div>

        <span style={metaLabelStyle}>Navigation Entrypoint</span>
        <p style={{ marginBottom: '0.35rem' }}>{navigationEntryPoint.label}</p>
        <p style={{ marginTop: 0 }}>{navigationEntryPoint.description}</p>

        <span style={metaLabelStyle}>Chess Position</span>
        <section style={sectionStackStyle}>
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>What this is</div>
            <p style={{ margin: '0.4rem 0 0' }}>
              You are looking at the currently focused graph node.
            </p>
            <p style={{ margin: '0.5rem 0 0' }}>
              The board panel is a single-position reference for that node, while the canvas shows the nearby transitions and repeated-state relations around it.
            </p>
          </article>
          {focusParsedStateKey && focusOccurrence ? (
            <details
              onToggle={(event) =>
                onBoardReferenceOpenChange(event.currentTarget.open)
              }
              open={boardReferenceOpen}
              style={detailsStyle}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Board reference</summary>
              <div style={{ marginTop: '0.75rem' }}>
                <ChessBoard
                  parsedStateKey={focusParsedStateKey}
                  subtitle={`${formatSubtreeLabel(focusOccurrence.embedding.subtreeKey)} · ${focusOccurrence.annotations.phaseLabel}`}
                  title={`Focus position at ply ${focusOccurrence.ply}`}
                />
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
                  Exact FEN: {focusOccurrence.stateKey}
                </p>
              </div>
            </details>
          ) : null}
        </section>

        <span style={metaLabelStyle}>Transposition Relation</span>
        <div style={sectionStackStyle}>
          {focusTranspositionGroup ? (
            <>
              <article style={narrativeCardStyle}>
                <div style={{ fontWeight: 700 }}>
                  This focus repeats across {focusTranspositionGroup.occurrences.length} occurrences
                </div>
                <p style={{ margin: '0.45rem 0 0' }}>
                  The dark stitched overlay comes from the repeated-state query surface and keeps each occurrence separate instead of merging the node identity.
                </p>
                <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
                  Visible here {focusTranspositionGroup.visibleOccurrenceIds.length} · off-view echoes {focusTranspositionGroup.offViewOccurrenceIds.length}
                </p>
              </article>
              {relatedFocusOccurrences.map((occurrence) => (
                <article key={occurrence.occurrenceId} style={moveCardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span
                      style={{
                        width: '0.9rem',
                        height: '0.9rem',
                        borderRadius: '999px',
                        background: occurrence.isVisibleInNeighborhood ? '#0f172a' : '#d97706',
                        display: 'inline-block'
                      }}
                    />
                    <strong>
                      {formatSubtreeLabel(occurrence.subtreeKey)} · ply {occurrence.ply}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#5f5547' }}>
                    {occurrence.isVisibleInNeighborhood
                      ? 'Visible occurrence in the current graph view.'
                      : 'Rendered as a transposition echo outside the current graph-radius window.'}
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#5f5547' }}>
                    Phase {occurrence.phaseLabel} · occurrence {shortOccurrenceId(occurrence.occurrenceId)}
                  </div>
                  <button
                    onClick={() => onFocusOccurrenceChange(occurrence.occurrenceId)}
                    style={inlineButtonStyle}
                    type="button"
                  >
                    Focus repeated occurrence
                  </button>
                </article>
              ))}
            </>
          ) : transpositionSurface.groups.length > 0 ? (
            <article style={narrativeCardStyle}>
              This view contains {transpositionSurface.groups.length} repeated-state clusters, but the current focus is not part of one. Switch to whole-object scope or focus a repeated occurrence to inspect the relation layer directly.
            </article>
          ) : (
            <article style={narrativeCardStyle}>
              No transposition touches the current focus at this scope. Selecting a repeated occurrence promotes its sibling occurrences as relation echoes in local view.
            </article>
          )}
        </div>

        <span style={metaLabelStyle}>Moves In This View</span>
        <div style={sectionStackStyle}>
          {focusTransitions.length > 0 ? (
            focusTransitions.map((transition) => {
              const isOutgoing =
                transition.sourceOccurrenceId === runtimeSnapshot.focusOccurrenceId;
              const neighborOccurrence = occurrenceById.get(
                isOutgoing
                  ? transition.targetOccurrenceId
                  : transition.sourceOccurrenceId
              );
              const matchingCarrier = carrierSurface.carriers.find(
                (carrier) =>
                  carrier.sourceOccurrenceId === transition.sourceOccurrenceId &&
                  carrier.targetOccurrenceId === transition.targetOccurrenceId
              );
              const carrierPresentation = matchingCarrier
                ? createCarrierPresentation(matchingCarrier)
                : null;

              return (
                <article key={`${transition.sourceOccurrenceId}:${transition.targetOccurrenceId}`} style={moveCardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span
                      style={resolveDirectionBadgeStyle(isOutgoing)}
                    >
                      {isOutgoing ? 'OUT ->' : 'IN <-'}
                    </span>
                    <span
                      style={{
                        width: '0.9rem',
                        height: '0.9rem',
                        borderRadius: '999px',
                        background: carrierPresentation?.structureColor ?? '#64748b',
                        display: 'inline-block'
                      }}
                    />
                    <strong>
                      {transition.moveFacts.san}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#5f5547' }}>
                    {summarizeMoveSemantics(
                      transition.moveFacts,
                      transition.moveFamily
                    )}{' '}
                    · {transition.moveFacts.movingPiece} · {transition.moveUci}
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#5f5547' }}>
                    {isOutgoing
                      ? 'This ribbon is a candidate move out of the focus position.'
                      : 'This ribbon is the move that arrives at the focus position.'}
                  </div>
                  {neighborOccurrence ? (
                    <div style={{ fontSize: '0.83rem', color: '#5f5547' }}>
                      {isOutgoing ? 'Resulting node' : 'Source node'} · ply {neighborOccurrence.ply} · {neighborOccurrence.annotations.phaseLabel}
                    </div>
                  ) : null}
                  {neighborOccurrence ? (
                    <button
                      onClick={() => onFocusOccurrenceChange(neighborOccurrence.occurrenceId)}
                      style={inlineButtonStyle}
                      type="button"
                    >
                      {isOutgoing ? 'Focus resulting node' : 'Focus source node'}
                    </button>
                  ) : null}
                </article>
              );
            })
          ) : (
            <article style={narrativeCardStyle}>
              No local move ribbons are visible at the current radius/budget.
            </article>
          )}
        </div>

        <details style={detailsStyle}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Diagnostics</summary>
          <span style={metaLabelStyle}>Runtime Cache</span>
          <pre style={codeBlockStyle}>
{JSON.stringify(runtimeSnapshot.cacheStats, null, 2)}
          </pre>

          <span style={metaLabelStyle}>Local Surface</span>
          <pre style={codeBlockStyle}>
{JSON.stringify(
  {
    graphObjectId: runtimeSnapshot.graphObjectId,
    cameraDistance,
    cameraGrammar,
    renderTuning,
    transpositionGroups: transpositionSurface.groups.length,
    transpositionLinks: transpositionSurface.links.length,
    transpositionEchoes: transpositionEchoCount,
    repeatedStateRelations: runtimeSnapshot.repeatedStateRelations.length,
    terminalAnchors: runtimeSnapshot.terminalAnchors.map((anchor) => anchor.anchorId),
    priorityFrontierOccurrenceIds: runtimeSnapshot.priorityFrontierOccurrenceIds
  },
  null,
  2
)}
          </pre>

          <span style={metaLabelStyle}>Transition Surface</span>
          <pre style={codeBlockStyle}>
{JSON.stringify(
  {
    transitions: transitionSurface.transitions.length,
    interactionFamilies: countByInteractionClass(transitionSurface),
    forcingFamilies: countByForcingClass(transitionSurface),
    strongestDeparture: strongestDepartureRule
      ? {
          moveUci: strongestDepartureRule.moveUci,
          interactionClass: strongestDepartureRule.moveFamily.interactionClass,
          forcingClass: strongestDepartureRule.moveFamily.forcingClass,
          centerlineProfile: strongestDepartureRule.centerlineProfile,
          departureStrength: strongestDepartureRule.departureStrength
        }
      : null
  },
  null,
  2
)}
          </pre>

          <span style={metaLabelStyle}>Carrier Surface</span>
          <pre style={codeBlockStyle}>
{JSON.stringify(
  {
    carriers: carrierSurface.carriers.length,
    activeBands: countCarrierBandUsage(carrierSurface),
    profiles: countCarrierProfiles(carrierSurface),
    strongestCarrier: strongestCarrier
      ? {
          san: strongestCarrier.san,
          centerlineProfile: strongestCarrier.centerlineProfile,
          activeBands: strongestCarrier.activeBands,
          validation: strongestCarrier.validation
        }
      : null
  },
  null,
  2
)}
          </pre>
        </details>

        <span style={metaLabelStyle}>Runtime Asset Boundary</span>
        <p style={{ marginBottom: '0.35rem' }}>
          {runtimeArtifactBoundary.builderBootstrapManifest}
        </p>
        <p style={{ marginTop: 0, marginBottom: '0.35rem' }}>
          {runtimeArtifactBoundary.viewerSceneManifest}
        </p>
        <p style={{ marginTop: 0, marginBottom: '0.35rem' }}>
          {runtimeArtifactBoundary.webCorpusManifest}
        </p>
        <p style={{ marginTop: 0, marginBottom: '0.35rem' }}>
          {runtimeArtifactBoundary.openingTableManifest}
        </p>
        <p style={{ marginTop: 0 }}>{runtimeArtifactBoundary.endgameTableManifest}</p>

        <span style={metaLabelStyle}>Review Workflow</span>
        <p style={{ marginBottom: '0.35rem' }}>
          N13 is adjudicated in the live viewer, not from the static SVGs alone. Switch entrypoints here, use whole-object scope or the transposition cards to inspect repeated-state clusters, drag to orbit, scroll or use the distance slider to zoom, and confirm the stitched relation stays readable without merging separate occurrences.
        </p>
        <p style={{ marginTop: 0, marginBottom: '0.35rem' }}>
          Generate the files below only as supporting evidence after the interactive pass.
        </p>
        <pre style={codeBlockStyle}>
      {'pnpm --filter viewer review:artifacts\n\nartifacts/viewer/review/anchored-entrypoints.svg\nartifacts/viewer/review/structure-zoom.svg\nartifacts/viewer/review/refinement-steps.svg\nartifacts/viewer/review/camera-grammar.svg\nartifacts/viewer/review/review-notes-template.md'}
        </pre>
      </section>

      <section style={canvasStyle}>
        <SmokeCanvas
          cameraGrammar={cameraGrammar}
          cameraDistance={cameraDistance}
          carrierSurface={carrierSurface}
          onCameraDistanceChange={onCameraDistanceChange}
          onFocusOccurrenceChange={onFocusOccurrenceChange}
          onHoverOccurrenceChange={onHoverOccurrenceChange}
          orbitPreset={navigationEntryPoint.orbit}
          orbitResetKey={orbitResetKey}
          renderTuning={renderTuning}
          hoveredOccurrenceId={hoveredOccurrence?.occurrenceId ?? null}
          runtimeSnapshot={runtimeSnapshot}
          sceneBootstrap={sceneBootstrap}
          transpositionSurface={transpositionSurface}
        />
      </section>
    </main>
  );
}

function countByInteractionClass(
  transitionSurface: RuntimeTransitionSurfaceSnapshot
) {
  return transitionSurface.departureRules.reduce<Record<string, number>>(
    (counts, rule) => {
      counts[rule.moveFamily.interactionClass] =
        (counts[rule.moveFamily.interactionClass] ?? 0) + 1;
      return counts;
    },
    {}
  );
}

function countByForcingClass(
  transitionSurface: RuntimeTransitionSurfaceSnapshot
) {
  return transitionSurface.departureRules.reduce<Record<string, number>>(
    (counts, rule) => {
      counts[rule.moveFamily.forcingClass] =
        (counts[rule.moveFamily.forcingClass] ?? 0) + 1;
      return counts;
    },
    {}
  );
}

function countCarrierBandUsage(carrierSurface: RuntimeCarrierSurfaceSnapshot) {
  return carrierSurface.carriers.reduce<Record<string, number>>((counts, carrier) => {
    for (const bandId of carrier.activeBands) {
      counts[bandId] = (counts[bandId] ?? 0) + 1;
    }

    return counts;
  }, {});
}

function countCarrierProfiles(carrierSurface: RuntimeCarrierSurfaceSnapshot) {
  return carrierSurface.carriers.reduce<Record<string, number>>((counts, carrier) => {
    counts[carrier.centerlineProfile] = (counts[carrier.centerlineProfile] ?? 0) + 1;
    return counts;
  }, {});
}

function LegendRow({
  fillColor,
  label,
  markColor,
  ringColor,
  text
}: {
  fillColor: string;
  label: string;
  markColor: string;
  ringColor: string;
  text: string;
}) {
  return (
    <div style={legendRowStyle}>
      <div
        style={{
          ...legendSwatchStyle,
          background: fillColor,
          borderColor: ringColor
        }}
      >
        <div
          style={{
            width: '0.45rem',
            height: '0.45rem',
            borderRadius: '999px',
            background: markColor,
            position: 'absolute',
            inset: '0',
            margin: 'auto'
          }}
        />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: '#5f5547' }}>{text}</div>
      </div>
    </div>
  );
}

function resolveDirectionBadgeStyle(isOutgoing: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '0.18rem 0.45rem',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: isOutgoing ? '#1e3a8a' : '#9a3412',
    background: isOutgoing ? '#dbeafe' : '#ffedd5',
    border: `1px solid ${isOutgoing ? '#1d4ed8' : '#c2410c'}`
  };
}

function CanvasHudCard({
  accentColor,
  description,
  emptyText,
  occurrence,
  title
}: {
  accentColor: string;
  description: string;
  emptyText: string;
  occurrence: BuilderOccurrenceRecord | null;
  title: string;
}) {
  const parsedStateKey = occurrence ? parseStateKey(occurrence.stateKey) : null;

  return (
    <article
      style={{
        ...selectionCardStyle,
        borderColor: accentColor
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span
          style={{
            width: '0.72rem',
            height: '0.72rem',
            borderRadius: '999px',
            background: accentColor,
            display: 'inline-block'
          }}
        />
        <strong style={{ fontSize: '0.92rem' }}>{title}</strong>
      </div>
      {occurrence ? (
        <div style={selectionContentStyle}>
          {parsedStateKey ? (
            <ChessBoard
              compact
              parsedStateKey={parsedStateKey}
              subtitle={`Ply ${occurrence.ply} · ${occurrence.annotations.phaseLabel}`}
              title={occurrence.annotations.materialSignature}
            />
          ) : (
            <div style={{ ...selectionCardStyle, margin: 0 }}>No board data</div>
          )}
          <div style={selectionTextStyle}>
            <div>
              Material {occurrence.annotations.materialSignature}
            </div>
            <div>
              {occurrence.terminal
                ? `Terminal ${formatTerminalOutcomeLabel(occurrence.terminal.wdlLabel)}`
                : 'Non-terminal position'}
            </div>
            <div>
              Phase {occurrence.annotations.phaseLabel}
            </div>
            <div>
              Node {shortOccurrenceId(occurrence.occurrenceId)}
            </div>
            <div style={{ color: '#7c6f60' }}>{description}</div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '0.55rem', fontSize: '0.82rem', color: '#5f5547' }}>
          {emptyText}
        </div>
      )}
    </article>
  );
}