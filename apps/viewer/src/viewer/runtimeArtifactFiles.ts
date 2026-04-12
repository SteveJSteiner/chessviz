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
  const openingTableManifest = readJson(
    resolve(repositoryRoot, 'artifacts/builder/opening-table/manifest.json')
  ) as TableAssetManifest;
  const endgameTableManifest = readJson(
    resolve(repositoryRoot, 'artifacts/builder/endgame-table/manifest.json')
  ) as TableAssetManifest;

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
    openingTableManifest,
    openingTableShardsByRelativePath: loadTableShardsFromManifest<OpeningTableShard>(
      resolve(repositoryRoot, 'artifacts/builder/opening-table'),
      openingTableManifest
    ),
    endgameTableManifest,
    endgameTableShardsByRelativePath: loadTableShardsFromManifest<EndgameTableShard>(
      resolve(repositoryRoot, 'artifacts/builder/endgame-table'),
      endgameTableManifest
    )
  };
}

export function resolveRepositoryRootFromImportMetaUrl(importMetaUrl: string) {
  return resolve(dirname(fileURLToPath(importMetaUrl)), '../../../../');
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadTableShardsFromManifest<TPayload>(
  assetRoot: string,
  manifest: TableAssetManifest
) {
  const shardsByRelativePath: Record<string, TPayload> = {};

  for (const descriptor of manifest.shards) {
    shardsByRelativePath[descriptor.relativePath] = readJson(
      resolve(assetRoot, descriptor.relativePath)
    ) as TPayload;
  }

  return shardsByRelativePath;
}
