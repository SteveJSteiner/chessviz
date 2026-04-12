import type { WorkspaceBoundary } from './contracts';

export const workspaceBoundary: WorkspaceBoundary = {
  artifactRoot: 'artifacts',
  builderBootstrapManifest: 'artifacts/builder/bootstrap.json',
  viewerSceneManifest: 'artifacts/viewer/scene-manifest.json',
  webCorpusManifest: 'artifacts/builder/web-corpus.json',
  openingTableManifest: 'artifacts/builder/opening-table/manifest.json',
  endgameTableManifest: 'artifacts/builder/endgame-table/manifest.json'
};