import type {
  BuilderCoverageMetadataRecord,
  BuilderOccurrenceRecord,
  BuilderRegimeDeclaration,
  BuilderRegimeId,
  BuilderResolverInputRecord,
  EndgameTablePositionRecord,
  EndgameTableShard,
  MiddlegameProceduralPolicy,
  OpeningTablePositionRecord,
  OpeningTableShard,
  RuntimeArtifactBundle,
  RuntimeResolvedOccurrence,
  TableAssetManifest,
  TableAssetShardDescriptor
} from './contracts';
import {
  createMiddlegameProceduralExpansion,
  type MiddlegameProceduralExpansion
} from './proceduralExpansion.ts';

type OpeningIndexEntry = {
  descriptor: TableAssetShardDescriptor;
  entry: OpeningTablePositionRecord;
};

type EndgameIndexEntry = {
  descriptor: TableAssetShardDescriptor;
  entry: EndgameTablePositionRecord;
};

export type RuntimeRegimeResolver = {
  getCoverageMetadata: (
    regimeId: BuilderRegimeId
  ) => BuilderCoverageMetadataRecord;
  getMiddlegameProceduralPolicy: () => MiddlegameProceduralPolicy;
  getRegimeDeclaration: (regimeId: BuilderRegimeId) => BuilderRegimeDeclaration;
  getResolverInput: (regimeId: BuilderRegimeId) => BuilderResolverInputRecord;
  resolveOccurrence: (
    occurrence: BuilderOccurrenceRecord
  ) => RuntimeResolvedOccurrence;
  resolveOccurrenceId: (occurrenceId: string) => RuntimeResolvedOccurrence;
};

export function createRuntimeRegimeResolver(
  bundle: RuntimeArtifactBundle,
  proceduralExpansion: MiddlegameProceduralExpansion =
    createMiddlegameProceduralExpansion(
      bundle.builderBootstrapManifest,
      bundle.viewerSceneManifest
    )
): RuntimeRegimeResolver {
  validateRuntimeArtifactBundle(bundle);

  const occurrenceById = new Map(
    bundle.builderBootstrapManifest.occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence
    ])
  );
  const coverageMetadataByRegime = new Map(
    bundle.webCorpusManifest.coverageMetadata.map((coverageMetadata) => [
      coverageMetadata.regimeId,
      coverageMetadata
    ])
  );
  const resolverInputByRegime = new Map(
    bundle.webCorpusManifest.resolverInputs.map((resolverInput) => [
      resolverInput.regimeId,
      resolverInput
    ])
  );
  const regimeDeclarationByRegime = new Map(
    bundle.webCorpusManifest.regimeDeclarations.map((regimeDeclaration) => [
      regimeDeclaration.regimeId,
      regimeDeclaration
    ])
  );
  const openingAssetReference = requirePublishedTableAssetReference(
    bundle,
    'opening-table'
  );
  const endgameAssetReference = requirePublishedTableAssetReference(
    bundle,
    'endgame-table'
  );
  const openingIndex = buildOpeningIndex(
    bundle.openingTableManifest,
    bundle.openingTableShardsByRelativePath
  );
  const endgameIndex = buildEndgameIndex(
    bundle.endgameTableManifest,
    bundle.endgameTableShardsByRelativePath
  );
  const orderedResolverInputs = [...bundle.webCorpusManifest.resolverInputs].sort(
    (left, right) => left.priority - right.priority
  );

  const resolveOccurrence = (occurrence: BuilderOccurrenceRecord) => {
    for (const resolverInput of orderedResolverInputs) {
      if (resolverInput.regimeId === 'opening-table') {
        const openingMatch = openingIndex.get(occurrence.stateKey);

        if (openingMatch) {
          return {
            occurrence,
            resolvedRegimeId: 'opening-table',
            resolverInput,
            coverageMetadata: requireCoverageMetadata(
              coverageMetadataByRegime,
              'opening-table'
            ),
            regimeDeclaration: requireRegimeDeclaration(
              regimeDeclarationByRegime,
              'opening-table'
            ),
            source: {
              kind: 'opening-table',
              assetSetId: openingAssetReference.assetSetId,
              manifestPath: openingAssetReference.manifestPath,
              relativePath: openingMatch.descriptor.relativePath,
              shardId: openingMatch.descriptor.shardId,
              entry: openingMatch.entry
            }
          } satisfies RuntimeResolvedOccurrence;
        }
        continue;
      }

      if (resolverInput.regimeId === 'endgame-table') {
        const endgameMatch = endgameIndex.get(occurrence.stateKey);

        if (
          endgameMatch &&
          endgameMatch.entry.materialSignature ===
            occurrence.annotations.materialSignature
        ) {
          return {
            occurrence,
            resolvedRegimeId: 'endgame-table',
            resolverInput,
            coverageMetadata: requireCoverageMetadata(
              coverageMetadataByRegime,
              'endgame-table'
            ),
            regimeDeclaration: requireRegimeDeclaration(
              regimeDeclarationByRegime,
              'endgame-table'
            ),
            source: {
              kind: 'endgame-table',
              assetSetId: endgameAssetReference.assetSetId,
              manifestPath: endgameAssetReference.manifestPath,
              relativePath: endgameMatch.descriptor.relativePath,
              shardId: endgameMatch.descriptor.shardId,
              entry: endgameMatch.entry
            }
          } satisfies RuntimeResolvedOccurrence;
        }
        continue;
      }

      const proceduralResolution = proceduralExpansion.resolveOccurrence(occurrence);

      return {
        occurrence,
        resolvedRegimeId: 'middlegame-procedural',
        resolverInput,
        coverageMetadata: requireCoverageMetadata(
          coverageMetadataByRegime,
          'middlegame-procedural'
        ),
        regimeDeclaration: requireRegimeDeclaration(
          regimeDeclarationByRegime,
          'middlegame-procedural'
        ),
        source: {
          kind: 'middlegame-procedural',
          policy: proceduralResolution.policy,
          occurrenceId: proceduralResolution.occurrenceId,
          defaultNeighborhoodRadius:
            proceduralResolution.defaultNeighborhoodRadius,
          defaultRefinementBudget:
            proceduralResolution.defaultRefinementBudget
        }
      } satisfies RuntimeResolvedOccurrence;
    }

    throw new Error(
      `no runtime resolver input declared for occurrence ${occurrence.occurrenceId}`
    );
  };

  validateResolvedOccurrenceSelections(
    bundle.builderBootstrapManifest.occurrences,
    resolveOccurrence
  );

  return {
    getCoverageMetadata(regimeId) {
      return requireCoverageMetadata(coverageMetadataByRegime, regimeId);
    },
    getMiddlegameProceduralPolicy() {
      return proceduralExpansion.policy;
    },
    getRegimeDeclaration(regimeId) {
      return requireRegimeDeclaration(regimeDeclarationByRegime, regimeId);
    },
    getResolverInput(regimeId) {
      return requireResolverInput(resolverInputByRegime, regimeId);
    },
    resolveOccurrence,
    resolveOccurrenceId(occurrenceId) {
      const occurrence = occurrenceById.get(occurrenceId);

      if (!occurrence) {
        throw new Error(`unknown occurrence: ${occurrenceId}`);
      }

      return resolveOccurrence(occurrence);
    }
  };
}

function validateRuntimeArtifactBundle(bundle: RuntimeArtifactBundle) {
  const graphObjectId = bundle.builderBootstrapManifest.graphObjectId;
  const representationSchemaVersion = bundle.builderBootstrapManifest.schemaVersion;
  const orderedResolverInputs = [...bundle.webCorpusManifest.resolverInputs].sort(
    (left, right) => left.priority - right.priority
  );
  const terminalResolverInput = orderedResolverInputs.at(-1);

  if (bundle.viewerSceneManifest.runtime.graphObjectId !== graphObjectId) {
    throw new Error('graph object mismatch between builder bootstrap and viewer manifest');
  }

  if (bundle.webCorpusManifest.graphObjectId !== graphObjectId) {
    throw new Error('graph object mismatch between builder bootstrap and web corpus');
  }

  if (bundle.openingTableManifest.graphObjectId !== graphObjectId) {
    throw new Error('graph object mismatch between builder bootstrap and opening table manifest');
  }

  if (bundle.endgameTableManifest.graphObjectId !== graphObjectId) {
    throw new Error('graph object mismatch between builder bootstrap and endgame table manifest');
  }

  if (
    bundle.viewerSceneManifest.runtime.bootstrap.representationSchemaVersion !==
    representationSchemaVersion
  ) {
    throw new Error('representation schema mismatch between viewer bootstrap and builder bootstrap');
  }

  if (bundle.webCorpusManifest.representationSchemaVersion !== representationSchemaVersion) {
    throw new Error('representation schema mismatch between builder bootstrap and web corpus');
  }

  if (bundle.openingTableManifest.representationSchemaVersion !== representationSchemaVersion) {
    throw new Error(
      'representation schema mismatch between builder bootstrap and opening table manifest'
    );
  }

  if (bundle.endgameTableManifest.representationSchemaVersion !== representationSchemaVersion) {
    throw new Error(
      'representation schema mismatch between builder bootstrap and endgame table manifest'
    );
  }

  if (
    bundle.viewerSceneManifest.runtime.bootstrap.webCorpusManifest !==
    'builder/web-corpus.json'
  ) {
    throw new Error('viewer bootstrap is not pointed at the published web corpus manifest');
  }

  if (
    !terminalResolverInput ||
    terminalResolverInput.regimeId !== 'middlegame-procedural' ||
    !terminalResolverInput.isFallback
  ) {
    throw new Error(
      'middlegame procedural fallback must be the terminal runtime resolver input'
    );
  }

  validatePublishedTableReference(bundle, 'opening-table', bundle.openingTableManifest);
  validatePublishedTableReference(bundle, 'endgame-table', bundle.endgameTableManifest);
  validateShardPayloads(bundle.openingTableManifest, bundle.openingTableShardsByRelativePath);
  validateShardPayloads(bundle.endgameTableManifest, bundle.endgameTableShardsByRelativePath);
}

function validateResolvedOccurrenceSelections(
  occurrences: BuilderOccurrenceRecord[],
  resolveOccurrence: (occurrence: BuilderOccurrenceRecord) => RuntimeResolvedOccurrence
) {
  let middlegameResolutionCount = 0;

  for (const occurrence of occurrences) {
    const resolvedOccurrence = resolveOccurrence(occurrence);

    if (
      !occurrence.regime.candidateRegimeIds.includes(resolvedOccurrence.resolvedRegimeId)
    ) {
      throw new Error(
        `runtime resolver selected undeclared regime ${resolvedOccurrence.resolvedRegimeId} for occurrence ${occurrence.occurrenceId}`
      );
    }

    if (resolvedOccurrence.resolvedRegimeId !== occurrence.regime.regimeId) {
      throw new Error(
        `runtime resolver bypassed declared ${occurrence.regime.regimeId} surface for occurrence ${occurrence.occurrenceId}; resolved ${resolvedOccurrence.resolvedRegimeId}`
      );
    }

    if (resolvedOccurrence.resolvedRegimeId === 'middlegame-procedural') {
      middlegameResolutionCount += 1;
    }
  }

  if (middlegameResolutionCount === 0) {
    throw new Error(
      'runtime resolver bypassed middlegame procedural fallback; no occurrence resolved through middlegame-procedural'
    );
  }
}

function validatePublishedTableReference(
  bundle: RuntimeArtifactBundle,
  regimeId: 'opening-table' | 'endgame-table',
  manifest: TableAssetManifest
) {
  const reference = bundle.webCorpusManifest.publishedTableAssets.find(
    (publishedAsset) => publishedAsset.regimeId === regimeId
  );

  if (!reference) {
    throw new Error(`web corpus is missing a published ${regimeId} asset reference`);
  }

  const expectedManifestPath =
    regimeId === 'opening-table'
      ? bundle.viewerSceneManifest.runtime.bootstrap.openingTableManifest
      : bundle.viewerSceneManifest.runtime.bootstrap.endgameTableManifest;

  if (reference.manifestPath !== expectedManifestPath) {
    throw new Error(`viewer bootstrap manifest path mismatch for ${regimeId}`);
  }

  if (manifest.regimeId !== regimeId) {
    throw new Error(`table manifest regime mismatch for ${regimeId}`);
  }

  if (manifest.assetSetId !== reference.assetSetId) {
    throw new Error(`table manifest asset set mismatch for ${regimeId}`);
  }

  if (manifest.coverageMetadata.coverageMetadataId !== reference.coverageMetadataId) {
    throw new Error(`table manifest coverage mismatch for ${regimeId}`);
  }

  if (manifest.shardCount !== reference.shardCount) {
    throw new Error(`table manifest shard count mismatch for ${regimeId}`);
  }

  if (manifest.positionCount !== reference.positionCount) {
    throw new Error(`table manifest position count mismatch for ${regimeId}`);
  }
}

function validateShardPayloads<TPayload extends OpeningTableShard | EndgameTableShard>(
  manifest: TableAssetManifest,
  shardsByRelativePath: Record<string, TPayload>
) {
  for (const descriptor of manifest.shards) {
    const shard = shardsByRelativePath[descriptor.relativePath];

    if (!shard) {
      throw new Error(
        `table manifest shard is missing payload: ${descriptor.relativePath}`
      );
    }

    if (shard.graphObjectId !== manifest.graphObjectId) {
      throw new Error(`graph object mismatch for shard ${descriptor.relativePath}`);
    }

    if (shard.assetSetId !== manifest.assetSetId) {
      throw new Error(`asset set mismatch for shard ${descriptor.relativePath}`);
    }

    if (shard.shardId !== descriptor.shardId) {
      throw new Error(`shard id mismatch for ${descriptor.relativePath}`);
    }

    if (shard.entries.length !== descriptor.entryCount) {
      throw new Error(`entry count mismatch for shard ${descriptor.relativePath}`);
    }
  }
}

function buildOpeningIndex(
  manifest: TableAssetManifest,
  shardsByRelativePath: Record<string, OpeningTableShard>
) {
  const index = new Map<string, OpeningIndexEntry>();

  for (const descriptor of manifest.shards) {
    const shard = shardsByRelativePath[descriptor.relativePath];

    if (!shard) {
      throw new Error(`opening table shard is missing: ${descriptor.relativePath}`);
    }

    for (const entry of shard.entries) {
      if (index.has(entry.positionKey)) {
        throw new Error(
          `opening table contains duplicate position: ${entry.positionKey}`
        );
      }

      index.set(entry.positionKey, {
        descriptor,
        entry
      });
    }
  }

  return index;
}

function buildEndgameIndex(
  manifest: TableAssetManifest,
  shardsByRelativePath: Record<string, EndgameTableShard>
) {
  const index = new Map<string, EndgameIndexEntry>();

  for (const descriptor of manifest.shards) {
    const shard = shardsByRelativePath[descriptor.relativePath];

    if (!shard) {
      throw new Error(`endgame table shard is missing: ${descriptor.relativePath}`);
    }

    for (const entry of shard.entries) {
      if (index.has(entry.positionKey)) {
        throw new Error(
          `endgame table contains duplicate position: ${entry.positionKey}`
        );
      }

      index.set(entry.positionKey, {
        descriptor,
        entry
      });
    }
  }

  return index;
}

function requireCoverageMetadata(
  coverageMetadataByRegime: Map<BuilderRegimeId, BuilderCoverageMetadataRecord>,
  regimeId: BuilderRegimeId
) {
  const coverageMetadata = coverageMetadataByRegime.get(regimeId);

  if (!coverageMetadata) {
    throw new Error(`web corpus is missing coverage metadata for ${regimeId}`);
  }

  return coverageMetadata;
}

function requirePublishedTableAssetReference(
  bundle: RuntimeArtifactBundle,
  regimeId: 'opening-table' | 'endgame-table'
) {
  const reference = bundle.webCorpusManifest.publishedTableAssets.find(
    (publishedAsset) => publishedAsset.regimeId === regimeId
  );

  if (!reference) {
    throw new Error(`web corpus is missing a published ${regimeId} reference`);
  }

  return reference;
}

function requireRegimeDeclaration(
  regimeDeclarationByRegime: Map<BuilderRegimeId, BuilderRegimeDeclaration>,
  regimeId: BuilderRegimeId
) {
  const regimeDeclaration = regimeDeclarationByRegime.get(regimeId);

  if (!regimeDeclaration) {
    throw new Error(`web corpus is missing a regime declaration for ${regimeId}`);
  }

  return regimeDeclaration;
}

function requireResolverInput(
  resolverInputByRegime: Map<BuilderRegimeId, BuilderResolverInputRecord>,
  regimeId: BuilderRegimeId
) {
  const resolverInput = resolverInputByRegime.get(regimeId);

  if (!resolverInput) {
    throw new Error(`web corpus is missing a resolver input for ${regimeId}`);
  }

  return resolverInput;
}