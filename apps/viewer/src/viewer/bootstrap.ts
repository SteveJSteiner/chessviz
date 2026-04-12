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

  return {
    builderBootstrapManifest: runtimeArtifactBundle.builderBootstrapManifest,
    viewerSceneManifest,
    sceneBootstrap: createSceneBootstrap(viewerSceneManifest),
    regimeResolver,
    initialFocusOccurrenceId,
    focusCandidateOccurrenceIds,
    resolvedFocusCandidates
  };
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