import type {
  BuilderAnchorRecord,
  RuntimeArtifactBundle,
  RuntimeResolvedOccurrence,
  SceneBootstrap,
  ViewerSceneManifest
} from './contracts';
import {
  createRuntimeRegimeResolver,
  type RuntimeRegimeResolver
} from './regimeResolver.ts';
import {
  createAnchoredNavigationEntryPoints,
  resolveInitialNavigationEntryPointId
} from './navigation.ts';
import { createRuntimeExplorationKernel } from './runtimeKernel.ts';

export type RuntimeBootstrapMaterialization = {
  builderBootstrapManifest: RuntimeArtifactBundle['builderBootstrapManifest'];
  viewerSceneManifest: ViewerSceneManifest;
  sceneBootstrap: SceneBootstrap;
  regimeResolver: RuntimeRegimeResolver;
  initialFocusOccurrenceId: string;
  focusCandidateOccurrenceIds: string[];
  resolvedFocusCandidates: RuntimeResolvedOccurrence[];
};

export function createSceneBootstrap(
  viewerSceneManifest: ViewerSceneManifest
): SceneBootstrap {
  return {
    sceneId: viewerSceneManifest.sceneId,
    title: viewerSceneManifest.title,
    summary: viewerSceneManifest.summary,
    accentColor: viewerSceneManifest.accentColor,
    camera: viewerSceneManifest.camera
  };
}

export function materializeRuntimeBootstrap(
  runtimeArtifactBundle: RuntimeArtifactBundle
): RuntimeBootstrapMaterialization {
  const regimeResolver = createRuntimeRegimeResolver(runtimeArtifactBundle);
  const initialFocusOccurrenceId = materializeInitialFocusOccurrenceId(
    runtimeArtifactBundle,
    regimeResolver
  );
  const resolvedFocusCandidates = materializeFocusCandidates(
    runtimeArtifactBundle,
    regimeResolver
  );
  const focusCandidateOccurrenceIds = resolvedFocusCandidates.map(
    (resolvedOccurrence) => resolvedOccurrence.occurrence.occurrenceId
  );
  const viewerSceneManifest = {
    ...runtimeArtifactBundle.viewerSceneManifest,
    runtime: {
      ...runtimeArtifactBundle.viewerSceneManifest.runtime,
      initialFocusOccurrenceId,
      focusCandidateOccurrenceIds
    }
  } satisfies ViewerSceneManifest;

  const runtimeBootstrap = {
    builderBootstrapManifest: runtimeArtifactBundle.builderBootstrapManifest,
    viewerSceneManifest,
    sceneBootstrap: createSceneBootstrap(viewerSceneManifest),
    regimeResolver,
    initialFocusOccurrenceId,
    focusCandidateOccurrenceIds,
    resolvedFocusCandidates
  };

  validateRuntimeBootstrapIntegrity(runtimeBootstrap);

  return runtimeBootstrap;
}

function materializeInitialFocusOccurrenceId(
  runtimeArtifactBundle: RuntimeArtifactBundle,
  regimeResolver: RuntimeRegimeResolver
) {
  const middlegameAnchor = requireNavigationEntryAnchor(
    runtimeArtifactBundle.builderBootstrapManifest.anchors,
    'middlegame'
  );
  const resolvedAnchor = regimeResolver.resolveOccurrenceId(
    requireSingleOccurrenceId(middlegameAnchor)
  );

  if (resolvedAnchor.resolvedRegimeId !== 'middlegame-procedural') {
    throw new Error('declared middlegame anchor does not resolve to middlegame procedural');
  }

  return resolvedAnchor.occurrence.occurrenceId;
}

function materializeFocusCandidates(
  runtimeArtifactBundle: RuntimeArtifactBundle,
  regimeResolver: RuntimeRegimeResolver
) {
  const anchorEntryIds: Array<'opening' | 'middlegame' | 'endgame'> = [
    'opening',
    'middlegame',
    'endgame'
  ];
  const anchorOccurrenceIds = anchorEntryIds.map((entryId) =>
    requireSingleOccurrenceId(
      requireNavigationEntryAnchor(
        runtimeArtifactBundle.builderBootstrapManifest.anchors,
        entryId
      )
    )
  );
  const orderedOccurrenceIds = [
    ...anchorOccurrenceIds,
    ...runtimeArtifactBundle.builderBootstrapManifest.rootOccurrenceIds,
    ...runtimeArtifactBundle.builderBootstrapManifest.priorityFrontierOccurrenceIds
  ];
  const seenOccurrenceIds = new Set<string>();
  const resolvedFocusCandidates: RuntimeResolvedOccurrence[] = [];

  for (const occurrenceId of orderedOccurrenceIds) {
    if (seenOccurrenceIds.has(occurrenceId)) {
      continue;
    }

    resolvedFocusCandidates.push(regimeResolver.resolveOccurrenceId(occurrenceId));
    seenOccurrenceIds.add(occurrenceId);
  }

  return resolvedFocusCandidates;
}

function validateRuntimeBootstrapIntegrity(
  runtimeBootstrap: RuntimeBootstrapMaterialization
) {
  const navigationEntryPoints = createAnchoredNavigationEntryPoints(runtimeBootstrap);

  if (
    !runtimeBootstrap.focusCandidateOccurrenceIds.includes(
      runtimeBootstrap.initialFocusOccurrenceId
    )
  ) {
    throw new Error(
      'runtime bootstrap fractures navigation continuity; initial focus is absent from resolver-backed focus candidates'
    );
  }

  if (
    resolveInitialNavigationEntryPointId(
      navigationEntryPoints,
      runtimeBootstrap.initialFocusOccurrenceId
    ) !== 'middlegame'
  ) {
    throw new Error(
      'runtime bootstrap fractures navigation continuity; initial focus no longer maps to the middlegame entrypoint'
    );
  }

  const runtimeKernel = createRuntimeExplorationKernel(
    runtimeBootstrap.builderBootstrapManifest,
    runtimeBootstrap.viewerSceneManifest
  );

  for (const entryPoint of navigationEntryPoints) {
    const occurrence = runtimeKernel.resolveOccurrence(entryPoint.focusOccurrenceId);
    const occurrenceLine = runtimeKernel.describeOccurrenceLine(
      entryPoint.focusOccurrenceId
    );

    if (!occurrence || !occurrenceLine) {
      throw new Error(
        `runtime bootstrap fractures query continuity for ${entryPoint.entryId} entrypoint`
      );
    }

    if (
      occurrence.embedding.rootGameId !== entryPoint.rootGameId ||
      occurrence.ply !== entryPoint.anchorPly ||
      occurrenceLine.rootGameId !== entryPoint.rootGameId
    ) {
      throw new Error(
        `runtime bootstrap fractures identity, anchoring, or query continuity for ${entryPoint.entryId} entrypoint`
      );
    }
  }
}

function requireNavigationEntryAnchor(
  anchors: BuilderAnchorRecord[],
  entryId: 'opening' | 'middlegame' | 'endgame'
) {
  const anchor = anchors.find(
    (candidate) =>
      candidate.anchorKind === 'navigation-entry' && candidate.entryId === entryId
  );

  if (!anchor) {
    throw new Error(`cannot derive ${entryId} entrypoint; declared anchor is missing`);
  }

  return anchor;
}

function requireSingleOccurrenceId(anchor: BuilderAnchorRecord) {
  if (anchor.occurrenceIds.length !== 1) {
    throw new Error(`declared anchor ${anchor.anchorId} must resolve exactly one occurrence`);
  }

  return anchor.occurrenceIds[0]!;
}