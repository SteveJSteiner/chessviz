# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11f

## Why this is current
- N11 is already settled on the roadmap criteria: camera grammar controls viewpoint, refinement, and semantic-band reveal over the existing one-object carrier, and recorded live review confirmed the QCD Bogo-Indian A initial-position reproduction no longer jumps when view distance crosses 4.6 -> 4.7 at neighborhood radius 4.
- Commit 92b1e3b reset the frontier from N12 back to N11a/N11b because the old anchored-entrypoint premise depended on phase-derived fixture bootstrap data instead of explicit opening-table, middlegame-procedural, and endgame-table regime surfaces.
- Commit 1e434e4 settled N11a by recording the unified regime substrate reset and opening N11b.
- Commit 33c5f8c settled N11b by pinning the concrete builder/runtime/module partition for N11c through N11f and confirming there were no more prerequisite nodes before the shared-contract work.
- Commit 577a4f3 settled N11c on the roadmap criteria: builder shared-contract surfaces in `tools/builder/src/chessviz_builder/contracts.py` and `tools/builder/src/chessviz_builder/artifact_manifest.py`, together with viewer mirrors in `apps/viewer/src/viewer/contracts.ts`, now publish versioned regime declarations, coverage metadata, provenance, resolver inputs, and stable regime/identity fields; `apps/viewer/src/viewer/navigation.ts` now consumes declared regime anchors instead of treating phase labels as the runtime selector.
- Commit a9af5cc settled N11d on the roadmap criteria: builder publication surfaces in `tools/builder/src/chessviz_builder/cli.py`, `tools/builder/src/chessviz_builder/config.py`, `tools/builder/src/chessviz_builder/artifact_manifest.py`, `tools/builder/src/chessviz_builder/opening_table.py`, `tools/builder/src/chessviz_builder/endgame_table.py`, and `tools/builder/src/chessviz_builder/publication.py` now normalize builder-only opening/endgame import inputs into deterministic project-owned web shards/manifests plus a combined web-corpus manifest with schema version, coverage metadata, provenance, deterministic hashes, and stable regime identifiers; builder tests confirm the published truth assets contain no foreign binary payloads or raw foreign schema fragments.
- Commit 5b2e8d4 settled N11e on the roadmap criteria: viewer bootstrap, navigation, runtime-kernel integration, and dedicated resolver/procedural-expansion modules in `apps/viewer/src/viewer/bootstrap.ts`, `apps/viewer/src/viewer/navigation.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/App.tsx`, `apps/viewer/src/viewer/regimeResolver.ts`, `apps/viewer/src/viewer/proceduralExpansion.ts`, `apps/viewer/src/viewer/runtimeArtifacts.ts`, and related review/test helpers now resolve opening-covered positions to opening-table, supported terminal-material positions to endgame-table, and all other positions to live middlegame procedural fallback while materializing focus candidates and entrypoints from declared regime surfaces instead of phase labels embedded in fixture manifests.
- Fixture-owned runtime surfaces still remain visible across `apps/viewer/src/viewer/fixtureArtifacts.ts`, `apps/viewer/src/viewer/workspaceBoundaries.ts`, `apps/viewer/src/App.tsx`, and review/test helpers, and hard-fail acceptance is not yet wired around missing required assets or resolver bypass, so N11f is now the earliest unresolved node.
- The next unresolved seam runs through `apps/viewer/src/viewer/fixtureArtifacts.ts`, `apps/viewer/src/viewer/workspaceBoundaries.ts`, `apps/viewer/src/App.tsx`, review/test helpers, and builder fixture-export utilities; N11f is where fixture-backed runtime paths are demoted to tests only and missing-asset/resolver-bypass integrity becomes a hard failure before N12 can reopen.

## Settle-and-advance conditions
- Fixture-owned bootstrap, scene, and entrypoint paths across viewer harness modules and builder fixture-export utilities are test-only rather than runtime truth surfaces.
- Hard-fail acceptance exists for missing required opening/endgame assets, bypassing the middlegame procedural path, or regime transitions that fracture identity, anchoring, navigation, or query continuity.
- N12, N13, and N14 consume only regime-backed runtime surfaces.
- A commit records N11f settlement and updates both `plan/completion-log.md` and this file to N12 or the next prerequisite frontier.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
