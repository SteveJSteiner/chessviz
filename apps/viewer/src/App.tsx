import { createSmokeSceneBootstrap } from './viewer/bootstrap';
import { createDefaultNavigationEntryPoint } from './viewer/navigation';
import { ViewerShell } from './viewer/ViewerShell';
import { workspaceBoundary } from './viewer/workspaceBoundaries';

export default function App() {
  return (
    <ViewerShell
      navigationEntryPoint={createDefaultNavigationEntryPoint()}
      sceneBootstrap={createSmokeSceneBootstrap()}
      workspaceBoundary={workspaceBoundary}
    />
  );
}
