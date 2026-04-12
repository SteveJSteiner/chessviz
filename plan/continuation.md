# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11e

## Why this is current
- N11 is already settled on the roadmap criteria: camera grammar controls viewpoint, refinement, and semantic-band reveal over the existing one-object carrier, and recorded live review confirmed the QCD Bogo-Indian A initial-position reproduction no longer jumps when view distance crosses 4.6 -> 4.7 at neighborhood radius 4.
- Commit 92b1e3b reset the frontier from N12 back to N11a/N11b because the old anchored-entrypoint premise depended on phase-derived fixture bootstrap data instead of explicit opening-table, middlegame-procedural, and endgame-table regime surfaces.
- Commit 1e434e4 settled N11a by recording the unified regime substrate reset and opening N11b.
- Commit 33c5f8c settled N11b by pinning the concrete builder/runtime/module partition for N11c through N11f and confirming there were no more prerequisite nodes before the shared-contract work.
- Commit 577a4f3 settled N11c on the roadmap criteria: builder shared-contract surfaces in `tools/builder/src/chessviz_builder/contracts.py` and `tools/builder/src/chessviz_builder/artifact_manifest.py`, together with viewer mirrors in `apps/viewer/src/viewer/contracts.ts`, now publish versioned regime declarations, coverage metadata, provenance, resolver inputs, and stable regime/identity fields; `apps/viewer/src/viewer/navigation.ts` now consumes declared regime anchors instead of treating phase labels as the runtime selector.
- Commit pending settled N11d on the roadmap criteria: builder publication surfaces in `tools/builder/src/chessviz_builder/cli.py`, `tools/builder/src/chessviz_builder/config.py`, `tools/builder/src/chessviz_builder/artifact_manifest.py`, `tools/builder/src/chessviz_builder/opening_table.py`, `tools/builder/src/chessviz_builder/endgame_table.py`, and `tools/builder/src/chessviz_builder/publication.py` now normalize builder-only opening/endgame import inputs into deterministic project-owned web shards/manifests plus a combined web-corpus manifest with schema version, coverage metadata, provenance, deterministic hashes, and stable regime identifiers; builder tests confirm the published truth assets contain no foreign binary payloads or raw foreign schema fragments.
- The viewer still resolves only the quarantined fixture bootstrap/scene manifests and lacks dedicated regime resolution, middlegame procedural fallback, and bootstrap materialization over the newly published table assets, so N11e is now the earliest unresolved node.
- The next unresolved runtime seam runs through `apps/viewer/src/viewer/bootstrap.ts`, `apps/viewer/src/viewer/navigation.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/App.tsx`, and the still-missing resolver/procedural-expansion modules; N11e is where declared regime surfaces become actual runtime resolution and entrypoint/bootstrap materialization instead of builder-only publication.
- N11f remains scoped behind N11e: fixture demotion and hard-fail acceptance depend on the resolver/bootstrap path consuming regime-backed assets instead of the fixture-owned bootstrap manifests.

## Settle-and-advance conditions
- Viewer bootstrap, navigation, runtime-kernel integration, and dedicated resolver/procedural-expansion modules resolve opening-covered positions to opening-table, supported terminal-material positions to endgame-table, and all other positions to live middlegame procedural expansion.
- Runtime bootstrap and anchored entrypoint materialization consume declared regime surfaces and resolver outputs rather than phase labels embedded in the quarantined fixture manifests.
- Runtime regime dispatch remains separable from N11f fixture demotion and hard-fail acceptance even though N11e consumes the N11d published assets.
- A commit records N11e settlement and updates both `plan/completion-log.md` and this file to N11f or the next prerequisite frontier.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
