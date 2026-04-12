import builderBootstrapManifestData from '../../../../artifacts/builder/bootstrap.json';
import endgameTableManifestData from '../../../../artifacts/builder/endgame-table/manifest.json';
import openingTableManifestData from '../../../../artifacts/builder/opening-table/manifest.json';
import webCorpusManifestData from '../../../../artifacts/builder/web-corpus.json';
import viewerSceneManifestData from '../../../../artifacts/viewer/scene-manifest.json';
import type {
  BuilderBootstrapManifest,
  EndgameTableShard,
  OpeningTableShard,
  RuntimeArtifactBundle,
  TableAssetManifest,
  ViewerSceneManifest,
  WebCorpusManifest
} from './contracts';

const openingTableShardModules = import.meta.glob(
  '../../../../artifacts/builder/opening-table/shards/*.json',
  {
    eager: true,
    import: 'default'
  }
) as Record<string, unknown>;

const endgameTableShardModules = import.meta.glob(
  '../../../../artifacts/builder/endgame-table/shards/*.json',
  {
    eager: true,
    import: 'default'
  }
) as Record<string, unknown>;

const openingTableManifest = openingTableManifestData as TableAssetManifest;
const endgameTableManifest = endgameTableManifestData as TableAssetManifest;

export const runtimeArtifactBundle: RuntimeArtifactBundle = {
  builderBootstrapManifest:
    builderBootstrapManifestData as BuilderBootstrapManifest,
  viewerSceneManifest: viewerSceneManifestData as ViewerSceneManifest,
  webCorpusManifest: webCorpusManifestData as WebCorpusManifest,
  openingTableManifest,
  openingTableShardsByRelativePath: requirePublishedShardPayloads<OpeningTableShard>(
    '../../../../artifacts/builder/opening-table',
    openingTableManifest,
    openingTableShardModules
  ),
  endgameTableManifest,
  endgameTableShardsByRelativePath: requirePublishedShardPayloads<EndgameTableShard>(
    '../../../../artifacts/builder/endgame-table',
    endgameTableManifest,
    endgameTableShardModules
  )
};

function requirePublishedShardPayloads<TPayload>(
  assetRoot: string,
  manifest: TableAssetManifest,
  shardModules: Record<string, unknown>
) {
  const shardsByRelativePath: Record<string, TPayload> = {};

  for (const descriptor of manifest.shards) {
    const modulePath = `${assetRoot}/${descriptor.relativePath}`;
    const payload = shardModules[modulePath];

    if (!payload) {
      throw new Error(`missing published shard import: ${modulePath}`);
    }

    shardsByRelativePath[descriptor.relativePath] = payload as TPayload;
  }

  return shardsByRelativePath;
}
