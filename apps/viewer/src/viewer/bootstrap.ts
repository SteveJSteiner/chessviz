import type { SceneBootstrap } from './contracts';

export function createSmokeSceneBootstrap(): SceneBootstrap {
  return {
    sceneId: 'smoke-scene',
    title: 'Viewer Smoke Scene',
    summary: 'N00 placeholder scene bootstrap for the future graph object.',
    accentColor: '#2f855a',
    camera: {
      position: [0, 0.35, 4.5],
      lookAt: [0, 0, 0],
      fov: 50
    }
  };
}