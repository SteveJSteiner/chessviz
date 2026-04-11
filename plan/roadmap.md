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
- **N12** (depends on: N05, N06, N10c, N11): Add anchored opening/middlegame/endgame entrypoints over one object instance.
- **N13** (depends on: N02b, N08a, N10c): Add transposition relation rendering layer over the repeated-state query surface.
- **N14** (depends on: N07, N08a, N10c, N11, N12, N13): Execute operational acceptance suite and budgets.

## Sequence

Topological baseline:
`N00a -> N00 -> N01 -> N02a -> N03 -> N02b -> N04 -> N05 -> N06 -> N07 -> N08 -> N08a -> N09 -> N10a -> N10b -> N10c -> N11 -> N12 -> N13 -> N14`

Parallel branches allowed by dependencies:
- `N05` and `N06` after `N03`.
- `N09` after `N08`.
- `N13` after `N02b`, `N08a`, and `N10c`.

## Visual review overlay

- `N10c` through `N14` are visually judged nodes and require recorded human render review in addition to automated assertions.
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
- **N12**: Anchored entrypoints switch viewpoint/emphasis/anchor only; object identity unchanged and local exploration remains available, and recorded human review confirms the views still read as one object.
- **N13**: Known transpositions show multiple occurrences plus visible relation sourced from the repeated-state query surface, and recorded human review confirms the relation is legible without collapsing occurrence identity.
- **N14**: All operational acceptance checks pass within declared budgets, with human-reviewed evidence attached for the visual-legibility checks.
