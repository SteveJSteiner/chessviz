import type {
  BuilderOccurrenceRecord,
  CameraOrbitPreset,
  NavigationEntryPoint,
  NavigationEntryPointId,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationConfig,
  RuntimeNeighborhoodSnapshot,
  RuntimeTranspositionSurfaceSnapshot,
  SceneBootstrap
} from './contracts';
import type { CameraGrammarState } from './cameraGrammar.ts';
import { ChessBoard } from './ChessBoard.tsx';
import {
  formatFocusOptionLabel,
  parseStateKey
} from './chessContext.ts';
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
  focusOccurrenceId: string;
  focusOptions: BuilderOccurrenceRecord[];
  graphViewScope: 'local-neighborhood' | 'whole-object';
  hoveredOccurrence: BuilderOccurrenceRecord | null;
  meetsN12Scale: boolean;
  runtimeConfig: RuntimeExplorationConfig;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  transpositionSurface: RuntimeTranspositionSurfaceSnapshot;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  onBoardReferenceOpenChange: (open: boolean) => void;
  onEntryPointChange: (entryId: NavigationEntryPointId) => void;
  onGraphViewScopeChange: (scope: 'local-neighborhood' | 'whole-object') => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  neighborhoodRadius: number;
  orbitResetKey: number;
  onRenderTuningChange: (partialTuning: Partial<ViewerRenderTuning>) => void;
  onResetRenderTuning: () => void;
  onCameraDistanceChange: (distance: number) => void;
  onCameraOrbitChange: (orbit: CameraOrbitPreset) => void;
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
  gridTemplateColumns: 'minmax(18rem, 24rem) 1fr',
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
  focusOccurrenceId,
  focusOptions,
  graphViewScope,
  hoveredOccurrence,
  meetsN12Scale,
  runtimeConfig,
  runtimeSnapshot,
  transpositionSurface,
  sceneBootstrap,
  navigationEntryPoint,
  onBoardReferenceOpenChange,
  onEntryPointChange,
  onGraphViewScopeChange,
  onHoverOccurrenceChange,
  neighborhoodRadius,
  orbitResetKey,
  onRenderTuningChange,
  onResetRenderTuning,
  onCameraDistanceChange,
  onCameraOrbitChange,
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
  const focusParsedStateKey = focusOccurrence
    ? parseStateKey(focusOccurrence.stateKey)
    : null;

  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
          Runtime Viewer
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
            Neighborhood anchor
            <select
              onChange={(event) => onFocusOccurrenceChange(event.target.value)}
              style={controlInputStyle}
              value={focusOccurrenceId}
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
                ? `Rendering ${runtimeSnapshot.renderDemand.visibleOccurrenceCount} visible nodes from ${totalGraphOccurrenceCount} stored nodes; neighborhood radius is bypassed.`
                : 'Neighborhood mode keeps the ontology radius-bounded around the current focus while still allowing the live store to grow behind that window.'}
            </span>
          </label>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Render demand</div>
            <p style={{ margin: '0.45rem 0 0' }}>
              {runtimeSnapshot.renderDemand.visibleOccurrenceCount} visible nodes and {runtimeSnapshot.renderDemand.visibleEdgeCount} visible edges from {runtimeSnapshot.renderDemand.enumeratedOccurrenceCount} enumerated nodes for this view.
            </p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
              Hot {runtimeSnapshot.renderDemand.hotOccurrenceCount} · warm {runtimeSnapshot.renderDemand.warmOccurrenceCount} · cold {runtimeSnapshot.renderDemand.coldOccurrenceCount} · frontier demand {runtimeSnapshot.renderDemand.frontierExpansionOccurrenceIds.length}
            </p>
          </article>

          {isWholeObjectView ? (
            <article style={narrativeCardStyle}>
              <div style={{ fontWeight: 700 }}>Whole-object scope</div>
              <p style={{ margin: '0.45rem 0 0' }}>
                This view keeps the current focus anchor while showing a budgeted low-detail subset of the larger graph object and letting camera demand grow the store behind it.
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
              Drag on the canvas to orbit. Scroll on the canvas or use this slider to zoom; distance now drives refinement, label reveal, and whole-object low-detail demand.
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

        <span style={metaLabelStyle}>Reference Board</span>
        <section style={sectionStackStyle}>
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Single-position reference</div>
            <p style={{ margin: '0.4rem 0 0' }}>
              Use the geometry to read structure. This board only confirms the currently selected anchor.
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
                  subtitle={`Ply ${focusOccurrence.ply}`}
                  title="Focused position"
                />
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
                  Exact FEN: {focusOccurrence.stateKey}
                </p>
              </div>
            </details>
          ) : null}
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>How to use it</div>
            <p style={{ margin: '0.4rem 0 0' }}>
              Click a node in the canvas to retarget the current neighborhood anchor, then keep orbiting or zooming without further snap-to interaction. The live store expands from view demand instead of requiring a separate click-to-expand step.
            </p>
          </article>
        </section>
      </section>

      <section style={canvasStyle}>
        <SmokeCanvas
          cameraGrammar={cameraGrammar}
          cameraDistance={cameraDistance}
          carrierSurface={carrierSurface}
          onCameraDistanceChange={onCameraDistanceChange}
          onCameraOrbitChange={onCameraOrbitChange}
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