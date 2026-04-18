import type {
  BuilderOccurrenceRecord,
  CameraOrbitPreset,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationConfig,
  RuntimeNeighborhoodSnapshot,
  SceneBootstrap,
  Vector3
} from './contracts';
import type { CameraGrammarState } from './cameraGrammar.ts';
import { ChessBoard } from './ChessBoard.tsx';
import {
  formatSubtreeLabel,
  parseStateKey
} from './chessContext.ts';
import type { ViewerRenderTuning } from './renderTuning.ts';
import { SmokeCanvas } from './SmokeCanvas';

type ViewerShellProps = {
  boardReferenceOpen: boolean;
  cameraGrammar: CameraGrammarState;
  cameraOrbit: CameraOrbitPreset;
  cameraPosition: Vector3;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  cameraDistance: number;
  focusOccurrence: BuilderOccurrenceRecord | null;
  hoveredOccurrence: BuilderOccurrenceRecord | null;
  runtimeConfig: RuntimeExplorationConfig;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  sceneBootstrap: SceneBootstrap;
  onBoardReferenceOpenChange: (open: boolean) => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  onCameraPoseChange: (position: Vector3, orbit: CameraOrbitPreset) => void;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
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

export function ViewerShell({
  boardReferenceOpen,
  cameraGrammar,
  cameraOrbit,
  cameraPosition,
  carrierSurface,
  cameraDistance,
  focusOccurrence,
  hoveredOccurrence,
  runtimeConfig,
  runtimeSnapshot,
  sceneBootstrap,
  onBoardReferenceOpenChange,
  onHoverOccurrenceChange,
  onCameraPoseChange,
  onFocusOccurrenceChange,
  renderTuning,
  totalGraphEdgeCount,
  totalGraphOccurrenceCount
}: ViewerShellProps) {
  const focusParsedStateKey = focusOccurrence
    ? parseStateKey(focusOccurrence.stateKey)
    : null;
  const trackedOccurrence = hoveredOccurrence ?? focusOccurrence;

  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
          Live Traversal Slice
        </p>
        <h1 style={headingStyle}>{sceneBootstrap.title}</h1>
        <p>{sceneBootstrap.summary}</p>

        <div style={controlStackStyle}>
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Honest target</div>
            <p style={{ margin: '0.45rem 0 0' }}>
              Fly through the object, let motion reveal local branches ahead, and read promising or forcing continuations from geometry before opening the board.
            </p>
          </article>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Object scale</div>
            <p style={{ margin: '0.45rem 0 0' }}>
              Runtime store currently holds {totalGraphOccurrenceCount} materialized nodes and {totalGraphEdgeCount} materialized edges. Current reveal renders {runtimeSnapshot.renderDemand.visibleOccurrenceCount} nodes and {runtimeSnapshot.renderDemand.visibleEdgeCount} edges from {runtimeSnapshot.renderDemand.enumeratedOccurrenceCount} enumerated candidates.
            </p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
              Hot {runtimeSnapshot.renderDemand.hotOccurrenceCount} · warm {runtimeSnapshot.renderDemand.warmOccurrenceCount} · cold {runtimeSnapshot.renderDemand.coldOccurrenceCount} · frontier demand {runtimeSnapshot.renderDemand.frontierExpansionOccurrenceIds.length}
            </p>
          </article>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Flight controls</div>
            <p style={{ margin: '0.45rem 0 0' }}>
              Drag to orbit. Scroll to dolly forward or backward. Use W/S to move through the structure, A/D to strafe, and Q/E to rise or drop without retargeting the tracked position.
            </p>
          </article>

          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>{cameraGrammar.stageLabel}</div>
            <p style={{ margin: '0.45rem 0 0' }}>{cameraGrammar.stageDescription}</p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
              Runtime refinement budget {cameraGrammar.refinementBudget} of {runtimeConfig.maxRefinementBudget} · label band {cameraGrammar.band} · camera distance {cameraDistance.toFixed(2)}
            </p>
          </article>

          <article style={warningCardStyle}>
            <div style={{ fontWeight: 700 }}>Evaluation question</div>
            <p style={{ margin: '0.45rem 0 0' }}>
              Can you follow a salient or forcing continuation with flight and zoom alone, then open the board only to confirm what you already suspected?
            </p>
          </article>
        </div>

        <span style={metaLabelStyle}>Reference Board</span>
        <section style={sectionStackStyle}>
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Single-position reference</div>
            <p style={{ margin: '0.4rem 0 0' }}>
              Use the geometry first. This board is only for confirming the currently tracked occurrence after you have already read the line from the object.
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
                  title="Tracked position"
                />
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
                  Exact FEN: {focusOccurrence.stateKey}
                </p>
              </div>
            </details>
          ) : null}
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>Tracked occurrence</div>
            <p style={{ margin: '0.4rem 0 0' }}>
              {trackedOccurrence
                ? `${formatSubtreeLabel(trackedOccurrence.embedding.subtreeKey)} · ${trackedOccurrence.annotations.phaseLabel} · ply ${trackedOccurrence.ply} · salience ${trackedOccurrence.salience.normalizedScore.toFixed(2)}.`
                : 'No occurrence is currently tracked.'}
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
              Camera position [{cameraPosition.map((value) => value.toFixed(2)).join(', ')}] · orbit [{cameraOrbit.azimuth.toFixed(2)}, {cameraOrbit.elevation.toFixed(2)}]. Click a node only if you want to inspect it directly; continued movement stays detached.
            </p>
          </article>
        </section>
      </section>

      <section style={canvasStyle}>
        <SmokeCanvas
          cameraGrammar={cameraGrammar}
          cameraOrbit={cameraOrbit}
          cameraPosition={cameraPosition}
          carrierSurface={carrierSurface}
          onCameraPoseChange={onCameraPoseChange}
          onFocusOccurrenceChange={onFocusOccurrenceChange}
          onHoverOccurrenceChange={onHoverOccurrenceChange}
          renderTuning={renderTuning}
          hoveredOccurrenceId={hoveredOccurrence?.occurrenceId ?? null}
          runtimeSnapshot={runtimeSnapshot}
          sceneBootstrap={sceneBootstrap}
        />
      </section>
    </main>
  );
}