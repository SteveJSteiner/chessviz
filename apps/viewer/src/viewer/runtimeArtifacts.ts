import builderBootstrapManifestData from '../../../../artifacts/builder/bootstrap.json';
import endgameTableManifestData from '../../../../artifacts/builder/endgame-table/manifest.json';
import endgameTableShardData from '../../../../artifacts/builder/endgame-table/shards/material-white-q0-r1-b0-n0-p6-black-q0-r1-b1-n1-p6.json';
import openingTableManifestData from '../../../../artifacts/builder/opening-table/manifest.json';
import openingTablePly000003Data from '../../../../artifacts/builder/opening-table/shards/ply-000-003.json';
import openingTablePly004007Data from '../../../../artifacts/builder/opening-table/shards/ply-004-007.json';
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

export const runtimeArtifactBundle: RuntimeArtifactBundle = {
  builderBootstrapManifest:
    builderBootstrapManifestData as BuilderBootstrapManifest,
  viewerSceneManifest: viewerSceneManifestData as ViewerSceneManifest,
  webCorpusManifest: webCorpusManifestData as WebCorpusManifest,
  openingTableManifest: openingTableManifestData as TableAssetManifest,
  openingTableShardsByRelativePath: {
    'shards/ply-000-003.json': openingTablePly000003Data as OpeningTableShard,
    'shards/ply-004-007.json': openingTablePly004007Data as OpeningTableShard
  },
  endgameTableManifest: endgameTableManifestData as TableAssetManifest,
  endgameTableShardsByRelativePath: {
    'shards/material-white-q0-r1-b0-n0-p6-black-q0-r1-b1-n1-p6.json':
      endgameTableShardData as EndgameTableShard
  }
};