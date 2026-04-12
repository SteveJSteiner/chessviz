# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N12

## Why this is current
- N11 is already settled on the roadmap criteria: camera grammar controls viewpoint, refinement, and semantic-band reveal over the existing one-object carrier, and recorded live review confirmed the QCD Bogo-Indian A initial-position reproduction no longer jumps when view distance crosses 4.6 -> 4.7 at neighborhood radius 4.
- Commit 92b1e3b reset the frontier from N12 back to N11a/N11b because the old anchored-entrypoint premise depended on phase-derived fixture bootstrap data instead of explicit opening-table, middlegame-procedural, and endgame-table regime surfaces.
- Commit 1e434e4 settled N11a by recording the unified regime substrate reset and opening N11b.
- Commit 33c5f8c settled N11b by pinning the concrete builder/runtime/module partition for N11c through N11f and confirming there were no more prerequisite nodes before the shared-contract work.
- Commit 577a4f3 settled N11c on the roadmap criteria: builder shared-contract surfaces in `tools/builder/src/chessviz_builder/contracts.py` and `tools/builder/src/chessviz_builder/artifact_manifest.py`, together with viewer mirrors in `apps/viewer/src/viewer/contracts.ts`, now publish versioned regime declarations, coverage metadata, provenance, resolver inputs, and stable regime/identity fields; `apps/viewer/src/viewer/navigation.ts` now consumes declared regime anchors instead of treating phase labels as the runtime selector.
- Commit a9af5cc settled N11d on the roadmap criteria: builder publication surfaces in `tools/builder/src/chessviz_builder/cli.py`, `tools/builder/src/chessviz_builder/config.py`, `tools/builder/src/chessviz_builder/artifact_manifest.py`, `tools/builder/src/chessviz_builder/opening_table.py`, `tools/builder/src/chessviz_builder/endgame_table.py`, and `tools/builder/src/chessviz_builder/publication.py` now normalize builder-only opening/endgame import inputs into deterministic project-owned web shards/manifests plus a combined web-corpus manifest with schema version, coverage metadata, provenance, deterministic hashes, and stable regime identifiers; builder tests confirm the published truth assets contain no foreign binary payloads or raw foreign schema fragments.
- Commit 5b2e8d4 settled N11e on the roadmap criteria: viewer bootstrap, navigation, runtime-kernel integration, and dedicated resolver/procedural-expansion modules in `apps/viewer/src/viewer/bootstrap.ts`, `apps/viewer/src/viewer/navigation.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/App.tsx`, `apps/viewer/src/viewer/regimeResolver.ts`, `apps/viewer/src/viewer/proceduralExpansion.ts`, `apps/viewer/src/viewer/runtimeArtifacts.ts`, and related review/test helpers now resolve opening-covered positions to opening-table, supported terminal-material positions to endgame-table, and all other positions to live middlegame procedural fallback while materializing focus candidates and entrypoints from declared regime surfaces instead of phase labels embedded in fixture manifests.
- Commit 8170cf0 settled N11f on the roadmap criteria: live viewer/runtime surfaces now expose regime-backed runtime assets instead of fixture-owned boundary modules; runtime loader, resolver, bootstrap, and navigation paths hard-fail on missing published opening/endgame assets, bad middlegame fallback precedence, or identity/anchoring/navigation/query fractures; and builder fixture-export utilities now regenerate bootstrap and scene manifests from published opening/endgame/web-corpus surfaces rather than phase-derived fixture labels.
- With N11f settled, N12 is now the earliest unresolved node because anchored opening, middlegame, and endgame entrypoints still need recorded human review over one regime-backed object to confirm the viewpoint shift reads as one object without a regime seam.

## Settle-and-advance conditions
- Anchored entrypoints switch viewpoint, emphasis, and anchor only over one regime-backed object instance rather than swapping runtime substrate or object identity.
- Opening anchors come from opening-table coverage, middlegame anchors from live procedural expansion, and endgame anchors from endgame-table coverage.
- Crossing regime boundaries preserves identity, anchoring, navigation, and query continuity.
- Recorded human review confirms the anchored entrypoints still read as one object without a regime seam.
- A commit records N12 settlement and updates both `plan/completion-log.md` and this file to N13 or the next prerequisite frontier.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
