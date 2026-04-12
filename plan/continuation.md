# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11d

## Why this is current
- N11 is already settled on the roadmap criteria: camera grammar controls viewpoint, refinement, and semantic-band reveal over the existing one-object carrier, and recorded live review confirmed the QCD Bogo-Indian A initial-position reproduction no longer jumps when view distance crosses 4.6 -> 4.7 at neighborhood radius 4.
- Commit 92b1e3b reset the frontier from N12 back to N11a/N11b because the old anchored-entrypoint premise depended on phase-derived fixture bootstrap data instead of explicit opening-table, middlegame-procedural, and endgame-table regime surfaces.
- Commit 1e434e4 settled N11a by recording the unified regime substrate reset and opening N11b.
- Commit 33c5f8c settled N11b by pinning the concrete builder/runtime/module partition for N11c through N11f and confirming there were no more prerequisite nodes before the shared-contract work.
- Commit 577a4f3 settled N11c on the roadmap criteria: builder shared-contract surfaces in `tools/builder/src/chessviz_builder/contracts.py` and `tools/builder/src/chessviz_builder/artifact_manifest.py`, together with viewer mirrors in `apps/viewer/src/viewer/contracts.ts`, now publish versioned regime declarations, coverage metadata, provenance, resolver inputs, and stable regime/identity fields; `apps/viewer/src/viewer/navigation.ts` now consumes declared regime anchors instead of treating phase labels as the runtime selector.
- The codebase still lacks dedicated opening-table and endgame-table import/export modules plus CLI/config publication wiring that emit project-owned web shards and manifests with deterministic hashes while keeping foreign formats builder-only, so N11d is now the earliest unresolved node.
- The next unresolved builder seam runs through `tools/builder/src/chessviz_builder/cli.py`, `tools/builder/src/chessviz_builder/config.py`, `tools/builder/src/chessviz_builder/artifact_manifest.py`, and the still-missing opening/endgame import-export modules; N11d is where those surfaces stop being fixture/bootstrap-shaped and become publishable project-owned table assets.
- N11e and N11f remain scoped behind N11d: runtime regime resolution/bootstrap depends on published table assets, and fixture demotion depends on the resolver path consuming those assets instead of fixture-owned bootstrap manifests.

## Settle-and-advance conditions
- Builder CLI, config, manifest-export, and dedicated opening/endgame import-export modules publish project-owned web shards and manifests from foreign inputs without exposing foreign runtime formats.
- Published table artifacts carry schema version, coverage metadata, provenance, deterministic hashes, and stable regime identifiers that match the N11c shared contract.
- Runtime truth artifacts contain no foreign binary payloads or raw foreign schema fragments; only project-owned shard/manifests cross the runtime boundary.
- N11d remains separable from N11e resolver/bootstrap work and N11f fixture demotion even though it provides the assets those nodes consume.
- A commit records N11d settlement and updates both `plan/completion-log.md` and this file to N11e or the next prerequisite frontier.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
