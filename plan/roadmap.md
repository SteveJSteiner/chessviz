# Roadmap (File Contract: partitioned work and sequence only)

This file contains only DAG-partitioned work nodes, dependencies, and settlement criteria.

## Node list

- **N00a** (depends on: none): Establish reproducible workspace and developer environment.
- **N00** (depends on: N00a): Establish module skeleton and interface boundaries.
- **N01** (depends on: N00): Declare data scope and computation stance artifacts for the initial represented subset.
- **N02a** (depends on: N00): Implement state-key/occurrence identity layer (no corpus assumptions).
- **N03** (depends on: N01, N02a): Ingest declared corpus into continuous occurrence paths.
- **N02b** (depends on: N03): Build repeated-state relation index and runtime query surface over ingested occurrences.
- **N04** (depends on: N02b, N03): Build DAG and validate fan-out/fan-in preservation.
- **N05** (depends on: N03): Add phase and material-signature labeling.
- **N06** (depends on: N03): Add W/D/L terminal labeling and terminal anchors.
- **N07** (depends on: N04, N05, N06): Implement salience v1 scoring and runtime prioritization hints.
- **N08** (depends on: N04, N05, N06): Implement canonical hyperbolic-style coarse embedding v1.
- **N08a** (depends on: N07, N08): Implement runtime exploration kernel for neighborhood query, fast render-demand enumeration, cache, and budgeted local refinement.
- **N09** (depends on: N08): Export move-family transition facts and derive coarse move-interaction departure geometry rules.
- **N10a** (depends on: N07, N08, N08a, N09): Generate multiscale carrier rules and refinement operators over the existing builder/runtime seam.
- **N10b** (depends on: N10a): Land direct-label carrier labeling, secondary board reference, and deterministic review-artifact scaffolding for human legibility review.
- **N10c** (depends on: N10b): Validate live carrier legibility and branch-aware label density under recorded human render review.
- **N11** (depends on: N08a, N10c): Implement camera grammar v1 integrated with runtime refinement, focus-level budgeting, and zoom-monotone band reveal.
- **N11a** (depends on: N11): Re-plan the unified regime substrate, shared representation contract, project-owned truth surfaces, and fixture demotion required before anchored entrypoints can honestly resume.
- **N11b** (depends on: N11a): Finalize the concrete builder/runtime/module partition for regime substrate work, insert prerequisite implementation nodes, and keep N12 closed until the partition is explicit.
- **N11c** (depends on: N11b): Define the shared regime declaration and representation contract across builder/runtime types, including coverage metadata, provenance, resolver inputs, and stable cross-regime identity fields.
- **N11d** (depends on: N11c): Build opening-table and endgame-table import/export pipelines that emit project-owned web shards and manifests from foreign inputs without exposing foreign formats at runtime.
- **N11e** (depends on: N11c, N11d): Implement seed-state bootstrap and initial browser-side legal-move graph generation, with optional asset-backed overlays, instead of exported fixture/bootstrap truth.
- **N11f** (depends on: N11e): Demote exported artifact runtimes to test/review or explicit comparison paths, wire hard-fail acceptance around corpus-truth bypass, and reopen follow-on viewer work only on JS-generated runtime inputs.
- **N11g** (depends on: N11f): Replace one-shot startup graph materialization with a viewer-owned live graph store that incrementally expands from focused frontier occurrences in the browser.
- **N11h** (depends on: N11g): Re-plan detached free-camera navigation, separate board reference from camera control, audit runtime/viewer structure added during the recent camera-demand iterations, and simplify or remove any structure that does not directly serve the requirements.
- **N11i** (depends on: N11h): Separate graph-growth horizon from view scope, land additive stable embedding under growth, implement detached free-camera traversal plus camera-view-driven graph expansion and optional URL path-pre-expansion without requiring click-to-expand interaction or camera snapping, and introduce compressed residency sufficient for large visible low-detail subsets.
- **N11j** (depends on: N11i): Validate one traversal-first live slice in which detached camera flight through the generated object reveals procedurally materialized local detail, geometry exposes move-family and salience clues strongly enough to pursue a line without a sidebar-first workflow, and the board reference stays confirmatory.
- **N12** (depends on: N10c, N11, N11j): Add anchored or focus-preset entrypoints over one live expandable JS-generated object instance, with optional asset-backed anchors refining but not replacing runtime generation, while preserving detached-camera navigation plus the same focus-level and render-budget semantics across entrypoints.
- **N13** (depends on: N02b, N08a, N10c, N11j): Add transposition relation rendering layer over the repeated-state query surface across the live expandable runtime without violating occurrence identity.
- **N14** (depends on: N07, N08a, N10c, N11, N11j, N12, N13): Execute operational acceptance suite and budgets over the live expandable JS-generated runtime plus any optional project-owned assets, including traversal-first geometry reading, visible-node scale, render-demand enumeration, detached-camera navigation, and memory envelopes.

## Sequence

Topological baseline:
`N00a -> N00 -> N01 -> N02a -> N03 -> N02b -> N04 -> N05 -> N06 -> N07 -> N08 -> N08a -> N09 -> N10a -> N10b -> N10c -> N11 -> N11a -> N11b -> N11c -> N11d -> N11e -> N11f -> N11g -> N11h -> N11i -> N11j -> N12 -> N13 -> N14`

Parallel branches allowed by dependencies:
- `N05` and `N06` after `N03`.
- `N09` after `N08`.
- `N12` and `N13` after `N11j`.

## N11b concrete module partition

- **N11c shared-contract surfaces:** builder `tools/builder/src/chessviz_builder/contracts.py` plus regime declaration/publication modules and `tools/builder/src/chessviz_builder/artifact_manifest.py`; viewer `apps/viewer/src/viewer/contracts.ts` plus regime-contract mirrors.
- **N11d table-asset publication surfaces:** builder `tools/builder/src/chessviz_builder/cli.py`, `tools/builder/src/chessviz_builder/config.py`, `tools/builder/src/chessviz_builder/artifact_manifest.py`, and dedicated opening/endgame import-export modules for project-owned web shards and manifests.
- **N11e seed-bootstrap/runtime-generation surfaces:** viewer `apps/viewer/src/viewer/bootstrap.ts`, `apps/viewer/src/viewer/navigation.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/viewer/dynamicRuntime.ts`, `apps/viewer/src/App.tsx`, and dedicated seed-bootstrap helpers; optional asset publication remains builder-owned.
- **N11f artifact-demotion/hard-fail surfaces:** viewer `apps/viewer/src/viewer/runtimeArtifacts.ts`, `apps/viewer/src/viewer/runtimeArtifactFiles.ts`, `apps/viewer/src/App.tsx`, and review/test helpers; exported fixture/bootstrap artifacts remain comparison-only utilities alongside acceptance hard-fail wiring.
- **N11g live-runtime store surfaces:** viewer `apps/viewer/src/viewer/dynamicRuntime.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/viewer/ViewerShell.tsx`, `apps/viewer/src/App.tsx`, and dedicated live-graph store or delta-expander helpers.
- **N11h detached-camera replan/purge surfaces:** `plan/requirements.md`, `plan/decisions.md`, `plan/acceptance.md`, `plan/roadmap.md`, `plan/continuation.md`, plus viewer `apps/viewer/src/App.tsx`, `apps/viewer/src/viewer/ViewerShell.tsx`, `apps/viewer/src/viewer/SmokeCanvas.tsx`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/viewer/dynamicRuntime.ts`, and any helper modules implicated by the audit.
- **N11i growth-embedding interaction surfaces:** viewer `apps/viewer/src/viewer/dynamicRuntime.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/viewer/navigation.ts`, `apps/viewer/src/viewer/ViewerShell.tsx`, `apps/viewer/src/viewer/SmokeCanvas.tsx`, `apps/viewer/src/App.tsx`, camera or embedding helpers, URL seed or path parsing utilities, and dedicated live-store residency or render-demand enumeration helpers.
- **N11j traversal-proof review surfaces:** live viewer interaction in `apps/viewer/src/App.tsx`, `apps/viewer/src/viewer/SmokeCanvas.tsx`, `apps/viewer/src/viewer/ViewerShell.tsx`, runtime demand and salience wiring in `apps/viewer/src/viewer/runtimeKernel.ts` and `apps/viewer/src/viewer/dynamicRuntime.ts`, plus recorded review artifacts under `artifacts/viewer/review/`.
- **Additional-node decision:** No prerequisite nodes are opened between N11b and N11c because the discovered schema/coverage work belongs to N11c, the import-export work belongs to N11d, the resolver/bootstrap work belongs to N11e, and the fixture-quarantine work belongs to N11f.

## Visual review overlay

- `N10c`, `N11`, `N11j`, `N12`, `N13`, and `N14` are visually judged nodes and require recorded human render review in addition to automated assertions.
- These nodes may remain active across multiple visible-change commits; a commit may change the render without settling the node.

## Settlement criteria by node

- **N00a**: Reproducible workspace boots on a clean machine; viewer smoke build passes; uv-managed Python builder package installs and runs an env-check CLI; external engine/tablebase paths are declarative and optional; lockfiles and setup instructions exist.
- **N00**: Build passes with placeholder modules and explicit interfaces.
- **N01**: `plan/acceptance.md` includes declared corpus scope, salience-source declaration template, and budget section.
- **N02a**: Distinct occurrence identity and stable state-key mapping verified on fixtures.
- **N03**: Declared corpus ingests into continuous directed occurrence paths.
- **N02b**: Repeated-state relation index and query surface verified from ingested corpus examples.
- **N04**: DAG metrics confirm expected fan-out/fan-in and convergence.
- **N05**: Phase/material labels exported and verified on fixtures.
- **N06**: Terminal labels and anchors present for terminal occurrences.
- **N07**: Salience normalization stable and runtime prioritization checks pass.
- **N08**: Coarse embedding is deterministic for fixed seed/config and dataset declaration and usable as a navigation basis.
- **N08a**: Runtime query/refinement loads previously unseen local neighborhoods under budget without ontology swap, and can enumerate the renderable neighborhood or frontier for the current query quickly enough to drive later camera-bound generation.
- **N09**: Builder-owned move-family transition facts are available across the runtime boundary, and departure rules are classifiable at coarse zoom with capture departures stronger than matched quiet-move controls.
- **N10a**: Multiscale carrier rules and refinement operators generate local geometry without topology errors under declared budgets while preserving builder/runtime responsibility boundaries and coarse move-family semantics.
- **N10b**: Direct move/root/terminal labels are anchored on the geometry, the focused board reference remains collapsible secondary material, deterministic structure-zoom and refinement-step review artifacts plus a verdict template generate from fixture manifests, and fixture checks pass without shifting builder/runtime responsibility boundaries.
- **N10c**: Recorded human review confirms structure-zoom carrier renders are visually readable, coarse move-family readings survive distance, refinement-step views add detail without overturning the coarse reading, and the live viewer uses a branch-aware label-density policy that keeps geometry primary under higher branching.
- **N11**: Camera-driven refinement preserves one object ontology and enforces zoom-monotone semantic band reveal; the camera grammar exposes a coherent focus level relating view distance to local ply reach and parallel legible context; and recorded human review confirms those behaviors read correctly on screen.
- **N11a**: Requirements, decisions, roadmap, and acceptance all declare one represented object over explicit opening-table, middlegame-procedural, and endgame-table substrates; project-owned truth surfaces and builder-only foreign-format ingestion boundaries are explicit; the fixture is demoted to test-only; and N12/N14 are no longer framed as settleable from fixture-backed phase coverage.
- **N11b**: The roadmap explicitly maps existing builder and viewer files plus planned module families onto N11c-N11i, classifies fixture-backed seams and their replacements, and confirms that no additional prerequisite nodes are required before N11c.
- **N11c**: Builder shared-contract surfaces and viewer schema mirrors define versioned regime declarations and representation records that cover occurrence, transition, anchor, salience, provenance, coverage metadata, resolver inputs, and stable identity semantics.
- **N11d**: Builder CLI, config, manifest-export, and dedicated import-export modules publish opening/endgame project-owned web shards/manifests with schema version, coverage metadata, provenance, and deterministic hashes; runtime truth artifacts contain no foreign binary payloads.
- **N11e**: Viewer bootstrap and dedicated generation modules can build an initial live graph in browser from an explicit seed board state via legal moves; optional opening/endgame assets may refine interpretation, but runtime graph genesis no longer depends on exported corpus bootstrap truth.
- **N11f**: Exported bootstrap, scene, and corpus artifacts across viewer harness modules and builder fixture-export utilities are test/review or explicit comparison paths only, hard-fail acceptance exists for canned-corpus bypass of live runtime generation, and later viewer nodes consume the JS-generated runtime by default.
- **N11g**: The live viewer owns a long-lived browser-side graph store or expander; the default click or focus interaction on a non-terminal frontier occurrence triggers additional legal-move expansion without full-page restart; the resulting graph contains occurrences or transitions that were absent before the interaction; and returned deltas merge into the same represented object rather than replacing it with a fresh bootstrap.
- **N11h**: Requirements, decisions, acceptance, roadmap, and continuation all explicitly lock detached camera navigation independent of node snapping; the current viewer/runtime structure is audited against those requirements; non-serving structure introduced during the recent camera-demand iterations is simplified or removed rather than preserved beside the target interaction model; and the replan cleanly opens N11i as the implementation node plus N11j as the traversal-proof review node.
- **N11i**: Detached forward or backward travel, orbit, and zoom can materialize additional graph required for what would render without requiring click-to-expand interaction or camera snapping to a focused occurrence; render-demand enumeration from the current camera/view state is fast enough to drive that generation under declared budgets; expanding a pursued line can increase the materialized graph without changing the current camera or neighborhood visibility settings; the live store uses shared or compressed residency so many distant low-detail occurrences can remain available under the declared memory envelope; additive embedding keeps previously placed nodes stable within declared tolerance when new branches are expanded; and both camera-driven refinement and URL path pre-expansion materialize compatible state on the same growing object.
- **N11j**: Recorded live review confirms one traversal-first slice over the generated object in which camera travel itself reveals procedurally generated local detail, the geometry makes at least one promising or forcing continuation visually discoverable before the board reference is consulted, higher-salience continuations remain more discoverable than comparable lower-salience ones, and the board reference serves only as confirmation rather than as the primary discovery surface.
- **N12**: Focus presets or anchored entrypoints switch viewpoint, emphasis, and anchor only over one live expandable JS-generated object; optional asset-backed anchors may refine those presets, but crossing overlay boundaries preserves identity, anchoring, detached-camera navigation, query continuity, later expansion ability, and the same focus-level or render-budget semantics; and recorded human review confirms the views still read as one object without a seam.
- **N13**: Known transpositions show multiple occurrences plus visible relation sourced from the repeated-state query surface across both local-neighborhood and newly expanded path flows; transposition rendering participates in the same render-demand and residency budgets as the rest of the object; and recorded human review confirms the relation remains legible without collapsing occurrence identity or fracturing the shared object.
- **N14**: All operational acceptance checks pass within declared budgets against the live expandable JS-generated runtime plus any optional project-owned opening/endgame assets, including traversal-first geometry reading, declared visible low-detail node counts, render-demand enumeration latency, and memory envelope, with human-reviewed evidence attached for the visual-legibility and continuity checks.
