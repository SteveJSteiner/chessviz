import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  BuilderBootstrapManifest,
  EndgameTableShard,
  OpeningTableShard,
  RuntimeArtifactBundle,
  TableAssetManifest,
  ViewerSceneManifest,
  WebCorpusManifest
} from './contracts.ts';

export function loadRuntimeArtifactBundleFromImportMetaUrl(
  importMetaUrl: string
) {
  return loadRuntimeArtifactBundleFromRepository(
    resolveRepositoryRootFromImportMetaUrl(importMetaUrl)
  );
}

export function loadRuntimeArtifactBundleFromRepository(
  repositoryRoot: string
): RuntimeArtifactBundle {
  return {
    builderBootstrapManifest: readJson(
      resolve(repositoryRoot, 'artifacts/builder/bootstrap.json')
    ) as BuilderBootstrapManifest,
    viewerSceneManifest: readJson(
      resolve(repositoryRoot, 'artifacts/viewer/scene-manifest.json')
    ) as ViewerSceneManifest,
    webCorpusManifest: readJson(
      resolve(repositoryRoot, 'artifacts/builder/web-corpus.json')
    ) as WebCorpusManifest,
    openingTableManifest: readJson(
      resolve(repositoryRoot, 'artifacts/builder/opening-table/manifest.json')
    ) as TableAssetManifest,
    openingTableShardsByRelativePath: {
      'shards/ply-000-003.json': readJson(
        resolve(
          repositoryRoot,
          'artifacts/builder/opening-table/shards/ply-000-003.json'
        )
      ) as OpeningTableShard,
      'shards/ply-004-007.json': readJson(
        resolve(
          repositoryRoot,
          'artifacts/builder/opening-table/shards/ply-004-007.json'
        )
      ) as OpeningTableShard
    },
    endgameTableManifest: readJson(
      resolve(repositoryRoot, 'artifacts/builder/endgame-table/manifest.json')
    ) as TableAssetManifest,
    endgameTableShardsByRelativePath: {
      'shards/material-white-q0-r1-b0-n0-p6-black-q0-r1-b1-n1-p6.json':
        readJson(
          resolve(
            repositoryRoot,
            'artifacts/builder/endgame-table/shards/material-white-q0-r1-b0-n0-p6-black-q0-r1-b1-n1-p6.json'
          )
        ) as EndgameTableShard
    }
  };
}

export function resolveRepositoryRootFromImportMetaUrl(importMetaUrl: string) {
  return resolve(dirname(fileURLToPath(importMetaUrl)), '../../../../');
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}