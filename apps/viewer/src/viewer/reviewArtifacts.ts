import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuilderBootstrapManifest, ViewerSceneManifest } from './contracts.ts';
import { buildViewerReviewArtifacts } from './reviewArtifactDocuments.ts';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectory, '../../../../');
const viewerArtifactRoot = resolve(repositoryRoot, 'artifacts/viewer');
const builderBootstrapManifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'artifacts/builder/bootstrap.json'), 'utf8')
) as BuilderBootstrapManifest;
const viewerSceneManifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'artifacts/viewer/scene-manifest.json'), 'utf8')
) as ViewerSceneManifest;

for (const artifact of buildViewerReviewArtifacts(
  builderBootstrapManifest,
  viewerSceneManifest
)) {
  const targetPath = resolve(viewerArtifactRoot, artifact.fileName);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, artifact.content);
}