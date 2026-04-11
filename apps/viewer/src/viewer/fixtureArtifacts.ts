import builderBootstrapManifestData from '../../../../artifacts/builder/bootstrap.json';
import viewerSceneManifestData from '../../../../artifacts/viewer/scene-manifest.json';
import type {
  BuilderBootstrapManifest,
  ViewerSceneManifest
} from './contracts';

export const builderBootstrapManifest =
  builderBootstrapManifestData as BuilderBootstrapManifest;

export const viewerSceneManifest =
  viewerSceneManifestData as ViewerSceneManifest;