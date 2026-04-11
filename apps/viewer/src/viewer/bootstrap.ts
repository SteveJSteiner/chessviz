import type { SceneBootstrap, ViewerSceneManifest } from './contracts';

export function createSceneBootstrap(
  viewerSceneManifest: ViewerSceneManifest
): SceneBootstrap {
  return {
    sceneId: viewerSceneManifest.sceneId,
    title: viewerSceneManifest.title,
    summary: viewerSceneManifest.summary,
    accentColor: viewerSceneManifest.accentColor,
    camera: viewerSceneManifest.camera
  };
}