import type {
  BuilderOccurrenceRecord,
  NavigationEntryPoint,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeExplorationConfig,
  RuntimeNeighborhoodSnapshot,
  RuntimeTransitionSurfaceSnapshot,
  SceneBootstrap,
  WorkspaceBoundary
} from './contracts';
import { SmokeCanvas } from './SmokeCanvas';

type ViewerShellProps = {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  focusOptions: BuilderOccurrenceRecord[];
  runtimeConfig: RuntimeExplorationConfig;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
  transitionSurface: RuntimeTransitionSurfaceSnapshot;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  workspaceBoundary: WorkspaceBoundary;
  neighborhoodRadius: number;
  refinementBudget: number;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onNeighborhoodRadiusChange: (radius: number) => void;
  onRefinementBudgetChange: (budget: number) => void;
};

const shellStyle = {
  width: '100vw',
  height: '100vh',
  display: 'grid',
  gridTemplateColumns: 'minmax(19rem, 25rem) 1fr',
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

export function ViewerShell({
  carrierSurface,
  focusOptions,
  runtimeConfig,
  runtimeSnapshot,
  transitionSurface,
  sceneBootstrap,
  navigationEntryPoint,
  workspaceBoundary,
  neighborhoodRadius,
  refinementBudget,
  onFocusOccurrenceChange,
  onNeighborhoodRadiusChange,
  onRefinementBudgetChange
}: ViewerShellProps) {
  const focusOccurrence = runtimeSnapshot.occurrences.find(
    (occurrence) => occurrence.isFocus
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

  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
          N10 Multiscale Carrier Boundary
        </p>
        <h1 style={headingStyle}>{sceneBootstrap.title}</h1>
        <p>{sceneBootstrap.summary}</p>

        <div style={controlStackStyle}>
          <label style={controlLabelStyle}>
            Focus occurrence
            <select
              onChange={(event) => onFocusOccurrenceChange(event.target.value)}
              style={controlInputStyle}
              value={runtimeSnapshot.focusOccurrenceId}
            >
              {focusOptions.map((occurrence) => (
                <option key={occurrence.occurrenceId} value={occurrence.occurrenceId}>
                  {occurrence.occurrenceId} · ply {occurrence.ply} · {occurrence.phase}
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
            Refinement budget: {refinementBudget}
            <input
              max={runtimeConfig.maxRefinementBudget}
              min={1}
              onChange={(event) =>
                onRefinementBudgetChange(Number(event.target.value))
              }
              style={controlInputStyle}
              type="range"
              value={refinementBudget}
            />
          </label>
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
        </div>

        <span style={metaLabelStyle}>Navigation Entrypoint</span>
        <p style={{ marginBottom: '0.35rem' }}>{navigationEntryPoint.label}</p>
        <p style={{ marginTop: 0 }}>{navigationEntryPoint.description}</p>

        <span style={metaLabelStyle}>Focus Surface</span>
        <p style={{ marginBottom: '0.35rem' }}>
          {focusOccurrence?.occurrenceId ?? runtimeSnapshot.focusOccurrenceId}
        </p>
        <p style={{ marginTop: 0 }}>
          phase {focusOccurrence?.phase ?? 'unknown'} · salience{' '}
          {focusOccurrence?.salience.normalizedScore.toFixed(3) ?? '0.000'} · terminal{' '}
          {focusOccurrence?.terminal?.wdlLabel ?? 'nonterminal'}
        </p>

        <span style={metaLabelStyle}>Runtime Cache</span>
        <pre style={codeBlockStyle}>
{JSON.stringify(runtimeSnapshot.cacheStats, null, 2)}
        </pre>

        <span style={metaLabelStyle}>Local Surface</span>
        <pre style={codeBlockStyle}>
{JSON.stringify(
  {
    graphObjectId: runtimeSnapshot.graphObjectId,
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

        <span style={metaLabelStyle}>Builder Boundary</span>
        <p style={{ marginBottom: '0.35rem' }}>
          {workspaceBoundary.builderBootstrapManifest}
        </p>
        <p style={{ marginTop: 0 }}>{workspaceBoundary.viewerSceneManifest}</p>
      </section>

      <section style={canvasStyle}>
        <SmokeCanvas
          carrierSurface={carrierSurface}
          navigationEntryPoint={navigationEntryPoint}
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