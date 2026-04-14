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
- **N08a** (depends on: N07, N08): Implement runtime exploration kernel for neighborhood query, cache, and budgeted local refinement.
- **N09** (depends on: N08): Export move-family transition facts and derive coarse move-interaction departure geometry rules.
- **N10a** (depends on: N07, N08, N08a, N09): Generate multiscale carrier rules and refinement operators over the existing builder/runtime seam.
- **N10b** (depends on: N10a): Land direct-label carrier labeling, secondary board reference, and deterministic review-artifact scaffolding for human legibility review.
- **N10c** (depends on: N10b): Validate live carrier legibility and branch-aware label density under recorded human render review.
- **N11** (depends on: N08a, N10c): Implement camera grammar v1 integrated with runtime refinement and zoom-monotone band reveal.
- **N11a** (depends on: N11): Re-plan the unified regime substrate, shared representation contract, project-owned truth surfaces, and fixture demotion required before anchored entrypoints can honestly resume.
- **N11b** (depends on: N11a): Finalize the concrete builder/runtime/module partition for regime substrate work, insert prerequisite implementation nodes, and keep N12 closed until the partition is explicit.
- **N11c** (depends on: N11b): Define the shared regime declaration and representation contract across builder/runtime types, including coverage metadata, provenance, resolver inputs, and stable cross-regime identity fields.
- **N11d** (depends on: N11c): Build opening-table and endgame-table import/export pipelines that emit project-owned web shards and manifests from foreign inputs without exposing foreign formats at runtime.
- **N11e** (depends on: N11c, N11d): Implement browser-side legal-move graph generation, optional asset-backed overlays, and bootstrap/focus materialization over the shared contract instead of exported fixture/bootstrap truth.
- **N11f** (depends on: N11e): Demote exported artifact runtimes to test/review or explicit comparison paths, wire hard-fail acceptance around corpus-truth bypass, and reopen N12 only on JS-generated runtime inputs.
- **N12** (depends on: N10c, N11, N11f): Add anchored or focus-preset entrypoints over one JS-generated object instance, with optional asset-backed anchors refining but not replacing runtime generation.
- **N13** (depends on: N02b, N08a, N10c, N11f): Add transposition relation rendering layer over the repeated-state query surface without violating the shared regime contract.
- **N14** (depends on: N07, N08a, N10c, N11, N11f, N12, N13): Execute operational acceptance suite and budgets over the JS-generated runtime plus any optional project-owned assets.

## Sequence

Topological baseline:
`N00a -> N00 -> N01 -> N02a -> N03 -> N02b -> N04 -> N05 -> N06 -> N07 -> N08 -> N08a -> N09 -> N10a -> N10b -> N10c -> N11 -> N11a -> N11b -> N11c -> N11d -> N11e -> N11f -> N12 -> N13 -> N14`

Parallel branches allowed by dependencies:
- `N05` and `N06` after `N03`.
- `N09` after `N08`.
- `N12` and `N13` after `N11f`.

## N11b concrete module partition

- **N11c shared-contract surfaces:** builder `tools/builder/src/chessviz_builder/contracts.py` plus regime declaration/publication modules and `tools/builder/src/chessviz_builder/artifact_manifest.py`; viewer `apps/viewer/src/viewer/contracts.ts` plus regime-contract mirrors.
- **N11d table-asset publication surfaces:** builder `tools/builder/src/chessviz_builder/cli.py`, `tools/builder/src/chessviz_builder/config.py`, `tools/builder/src/chessviz_builder/artifact_manifest.py`, and dedicated opening/endgame import-export modules for project-owned web shards and manifests.
- **N11e runtime generation/bootstrap surfaces:** viewer `apps/viewer/src/viewer/bootstrap.ts`, `apps/viewer/src/viewer/navigation.ts`, `apps/viewer/src/viewer/runtimeKernel.ts`, `apps/viewer/src/viewer/dynamicRuntime.ts`, `apps/viewer/src/App.tsx`, and dedicated generation/bootstrap helpers; optional asset publication remains builder-owned.
- **N11f artifact-demotion/hard-fail surfaces:** viewer `apps/viewer/src/viewer/runtimeArtifacts.ts`, `apps/viewer/src/viewer/runtimeArtifactFiles.ts`, `apps/viewer/src/App.tsx`, and review/test helpers; exported fixture/bootstrap artifacts remain comparison-only utilities alongside acceptance hard-fail wiring.
- **Additional-node decision:** No prerequisite nodes are opened between N11b and N11c because the discovered schema/coverage work belongs to N11c, the import-export work belongs to N11d, the resolver/bootstrap work belongs to N11e, and the fixture-quarantine work belongs to N11f.

## Visual review overlay

- `N10c`, `N11`, `N12`, `N13`, and `N14` are visually judged nodes and require recorded human render review in addition to automated assertions.
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
- **N08a**: Runtime query/refinement loads previously unseen local neighborhoods under budget without ontology swap.
- **N09**: Builder-owned move-family transition facts are available across the runtime boundary, and departure rules are classifiable at coarse zoom with capture departures stronger than matched quiet-move controls.
- **N10a**: Multiscale carrier rules and refinement operators generate local geometry without topology errors under declared budgets while preserving builder/runtime responsibility boundaries and coarse move-family semantics.
- **N10b**: Direct move/root/terminal labels are anchored on the geometry, the focused board reference remains collapsible secondary material, deterministic structure-zoom and refinement-step review artifacts plus a verdict template generate from fixture manifests, and fixture checks pass without shifting builder/runtime responsibility boundaries.
- **N10c**: Recorded human review confirms structure-zoom carrier renders are visually readable, coarse move-family readings survive distance, refinement-step views add detail without overturning the coarse reading, and the live viewer uses a branch-aware label-density policy that keeps geometry primary under higher branching.
- **N11**: Camera-driven refinement preserves one object ontology and enforces zoom-monotone semantic band reveal, and recorded human review confirms those behaviors read correctly on screen.
- **N11a**: Requirements, decisions, roadmap, and acceptance all declare one represented object over explicit opening-table, middlegame-procedural, and endgame-table substrates; project-owned truth surfaces and builder-only foreign-format ingestion boundaries are explicit; the fixture is demoted to test-only; and N12/N14 are no longer framed as settleable from fixture-backed phase coverage.
- **N11b**: The roadmap explicitly maps existing builder and viewer files plus planned module families onto N11c-N11f, classifies fixture-backed seams and their replacements, and confirms that no additional prerequisite nodes are required before N11c.
- **N11c**: Builder shared-contract surfaces and viewer schema mirrors define versioned regime declarations and representation records that cover occurrence, transition, anchor, salience, provenance, coverage metadata, resolver inputs, and stable identity semantics.
- **N11d**: Builder CLI, config, manifest-export, and dedicated import-export modules publish opening/endgame project-owned web shards/manifests with schema version, coverage metadata, provenance, and deterministic hashes; runtime truth artifacts contain no foreign binary payloads.
- **N11e**: Viewer bootstrap, navigation, runtime-kernel integration, and dedicated generation/bootstrap modules build the live graph in browser from an explicit seed board state via legal moves; optional opening/endgame assets may refine interpretation, but runtime graph genesis no longer depends on exported corpus bootstrap truth.
- **N11f**: Exported bootstrap, scene, and corpus artifacts across viewer harness modules and builder fixture-export utilities are test/review or explicit comparison paths only, hard-fail acceptance exists for canned-corpus bypass of live runtime generation, and N12/N13/N14 consume the JS-generated runtime by default.
- **N12**: Focus presets or anchored entrypoints switch viewpoint/emphasis/anchor only over one JS-generated object; optional asset-backed anchors may refine those presets, but crossing overlay boundaries preserves identity, anchoring, navigation, and query continuity; and recorded human review confirms the views still read as one object without a seam.
- **N13**: Known transpositions show multiple occurrences plus visible relation sourced from the repeated-state query surface, and recorded human review confirms the relation remains legible without collapsing occurrence identity or fracturing the shared regime contract.
- **N14**: All operational acceptance checks pass within declared budgets against the JS-generated runtime plus any optional project-owned opening/endgame assets, with human-reviewed evidence attached for the visual-legibility and continuity checks.
