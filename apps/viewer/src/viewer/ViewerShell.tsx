import type {
  BuilderOccurrenceRecord,
  NavigationEntryPoint,
  NavigationEntryPointId,
  RuntimeArtifactBoundary,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationConfig,
  RuntimeNeighborhoodSnapshot,
  RuntimeOccurrenceLine,
  RuntimeTransitionSurfaceSnapshot,
  SceneBootstrap
} from './contracts';
import type { CameraGrammarState } from './cameraGrammar.ts';
import { ChessBoard } from './ChessBoard.tsx';
import {
  formatFocusOptionLabel,
  formatOccurrenceLine,
  parseStateKey,
  shortOccurrenceId,
  summarizeMoveSemantics
} from './chessContext.ts';
import { createCarrierPresentation } from './carrierPresentation.ts';
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
  focusLine: RuntimeOccurrenceLine | undefined;
  focusLinesByOccurrenceId: Map<string, RuntimeOccurrenceLine | undefined>;
  focusOptions: BuilderOccurrenceRecord[];
  runtimeConfig: RuntimeExplorationConfig;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  transitionSurface: RuntimeTransitionSurfaceSnapshot;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  onBoardReferenceOpenChange: (open: boolean) => void;
  onEntryPointChange: (entryId: NavigationEntryPointId) => void;
  runtimeArtifactBoundary: RuntimeArtifactBoundary;
  neighborhoodRadius: number;
  orbitResetKey: number;
  onRenderTuningChange: (partialTuning: Partial<ViewerRenderTuning>) => void;
  onResetRenderTuning: () => void;
  onCameraDistanceChange: (distance: number) => void;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onNeighborhoodRadiusChange: (radius: number) => void;
  renderTuning: ViewerRenderTuning;
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
  focusLine,
  focusLinesByOccurrenceId,
  focusOptions,
  runtimeConfig,
  runtimeSnapshot,
  transitionSurface,
  sceneBootstrap,
  navigationEntryPoint,
  onBoardReferenceOpenChange,
  onEntryPointChange,
  runtimeArtifactBoundary,
  neighborhoodRadius,
  orbitResetKey,
  onRenderTuningChange,
  onResetRenderTuning,
  onCameraDistanceChange,
  onFocusOccurrenceChange,
  onNeighborhoodRadiusChange,
  renderTuning
}: ViewerShellProps) {
  const focusOccurrence = runtimeSnapshot.occurrences.find(
    (occurrence) => occurrence.isFocus
  );
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

  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
          N12 Anchored Entrypoints
        </p>
        <h1 style={headingStyle}>{sceneBootstrap.title}</h1>
        <p>{sceneBootstrap.summary}</p>

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
                  {formatFocusOptionLabel(
                    occurrence.embedding.rootGameId,
                    focusLinesByOccurrenceId.get(occurrence.occurrenceId),
                    occurrence.ply
                  )}
                </option>
              ))}
            </select>
          </label>

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

        <div style={statGridStyle}>
          <article style={statCardStyle}>
            <strong>{runtimeSnapshot.occurrences.length}</strong>
            <div>local occurrences</div>
          </article>
          <article style={statCardStyle}>
            <strong>{runtimeSnapshot.edges.length}</strong>
            <div>local edges</div>
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

        <span style={metaLabelStyle}>Navigation Entrypoint</span>
        <p style={{ marginBottom: '0.35rem' }}>{navigationEntryPoint.label}</p>
        <p style={{ marginTop: 0 }}>{navigationEntryPoint.description}</p>

        <span style={metaLabelStyle}>Chess Position</span>
        <section style={sectionStackStyle}>
          <article style={narrativeCardStyle}>
            <div style={{ fontWeight: 700 }}>What this is</div>
            <p style={{ margin: '0.4rem 0 0' }}>
              You are looking at the position after{' '}
              {focusLine ? formatOccurrenceLine(focusLine) : 'the selected line'}.
            </p>
            <p style={{ margin: '0.5rem 0 0' }}>
              The canvas carries the move names on the ribbons themselves, so the geometry can stand on its own before you open any reference material.
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
                  subtitle={`Game ${focusOccurrence.embedding.rootGameId} · ${focusOccurrence.annotations.phaseLabel}`}
                  title={`Focus position at ply ${focusOccurrence.ply}`}
                />
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
                  Exact FEN: {focusOccurrence.stateKey}
                </p>
              </div>
            </details>
          ) : null}
        </section>

        <span style={metaLabelStyle}>Move Line</span>
        <article style={narrativeCardStyle}>
          <div style={{ fontWeight: 700 }}>{focusOccurrence?.embedding.rootGameId}</div>
          <p style={{ margin: '0.45rem 0 0' }}>
            {focusLine ? formatOccurrenceLine(focusLine) : 'No line available for this occurrence.'}
          </p>
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.83rem', color: '#6c6254' }}>
            Occurrence {shortOccurrenceId(runtimeSnapshot.focusOccurrenceId)} · salience{' '}
            {focusOccurrence?.salience.normalizedScore.toFixed(3) ?? '0.000'}
          </p>
        </article>

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
                      style={{
                        width: '0.9rem',
                        height: '0.9rem',
                        borderRadius: '999px',
                        background: carrierPresentation?.structureColor ?? '#64748b',
                        display: 'inline-block'
                      }}
                    />
                    <strong>
                      {isOutgoing
                        ? `Move from this position: ${transition.moveFacts.san}`
                        : `Move that led here: ${transition.moveFacts.san}`}
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

        <span style={metaLabelStyle}>Review Artifacts</span>
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
          orbitPreset={navigationEntryPoint.orbit}
          orbitResetKey={orbitResetKey}
          renderTuning={renderTuning}
          runtimeSnapshot={runtimeSnapshot}
          sceneBootstrap={sceneBootstrap}
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