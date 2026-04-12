import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildViewerReviewArtifacts } from './reviewArtifactDocuments.ts';
import {
  loadRuntimeArtifactBundleFromRepository
} from './runtimeArtifactFiles.ts';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectory, '../../../../');
const viewerArtifactRoot = resolve(repositoryRoot, 'artifacts/viewer');
const runtimeArtifactBundle = loadRuntimeArtifactBundleFromRepository(repositoryRoot);

for (const artifact of buildViewerReviewArtifacts(runtimeArtifactBundle)) {
  const targetPath = resolve(viewerArtifactRoot, artifact.fileName);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, artifact.content);
}