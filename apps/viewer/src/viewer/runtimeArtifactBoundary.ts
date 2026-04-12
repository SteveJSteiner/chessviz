import type { RuntimeArtifactBoundary } from './contracts';

export const runtimeArtifactBoundary: RuntimeArtifactBoundary = {
  artifactRoot: 'artifacts',
  builderBootstrapManifest: 'artifacts/builder/bootstrap.json',
  viewerSceneManifest: 'artifacts/viewer/scene-manifest.json',
  webCorpusManifest: 'artifacts/builder/web-corpus.json',
  openingTableManifest: 'artifacts/builder/opening-table/manifest.json',
  endgameTableManifest: 'artifacts/builder/endgame-table/manifest.json'
};
