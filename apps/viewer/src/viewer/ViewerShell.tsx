import type {
  NavigationEntryPoint,
  SceneBootstrap,
  WorkspaceBoundary
} from './contracts';
import { SmokeCanvas } from './SmokeCanvas';

type ViewerShellProps = {
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  workspaceBoundary: WorkspaceBoundary;
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
  backdropFilter: 'blur(10px)'
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

export function ViewerShell({
  sceneBootstrap,
  navigationEntryPoint,
  workspaceBoundary
}: ViewerShellProps) {
  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
          N00 Viewer Skeleton
        </p>
        <h1 style={headingStyle}>{sceneBootstrap.title}</h1>
        <p>{sceneBootstrap.summary}</p>

        <span style={metaLabelStyle}>Navigation Entrypoint</span>
        <p style={{ marginBottom: '0.35rem' }}>{navigationEntryPoint.label}</p>
        <p style={{ marginTop: 0 }}>{navigationEntryPoint.description}</p>

        <span style={metaLabelStyle}>Builder Boundary</span>
        <p style={{ marginBottom: '0.35rem' }}>{workspaceBoundary.builderBootstrapManifest}</p>
        <p style={{ marginTop: 0 }}>{workspaceBoundary.viewerSceneManifest}</p>
      </section>

      <section style={canvasStyle}>
        <SmokeCanvas
          navigationEntryPoint={navigationEntryPoint}
          sceneBootstrap={sceneBootstrap}
        />
      </section>
    </main>
  );
}