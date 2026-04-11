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

export interface WorkspaceBoundary {
  artifactRoot: string;
  builderBootstrapManifest: string;
  viewerSceneManifest: string;
}