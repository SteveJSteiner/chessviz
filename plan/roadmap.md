# Roadmap (File Contract: partitioned work and sequence only)

This file contains only DAG-partitioned work nodes, dependencies, and settlement criteria.

## Node list

- **N00a** (depends on: none): Establish reproducible workspace and developer environment.
- **N00** (depends on: N00a): Establish module skeleton and interface boundaries.
- **N01** (depends on: N00): Declare data scope and computation stance artifacts for the initial represented subset.
- **N02a** (depends on: N00): Implement state-key/occurrence identity layer (no corpus assumptions).
- **N03** (depends on: N01, N02a): Ingest declared corpus into continuous occurrence paths.
- **N02b** (depends on: N03): Build transposition relation index over ingested occurrences.
- **N04** (depends on: N02b, N03): Build DAG and validate fan-out/fan-in preservation.
- **N05** (depends on: N03): Add phase and material-signature labeling.
- **N06** (depends on: N03): Add W/D/L terminal labeling and terminal anchors.
- **N07** (depends on: N04, N05, N06): Implement salience v1 scoring and runtime prioritization hints.
- **N08** (depends on: N04, N05, N06): Implement canonical hyperbolic-style coarse embedding v1.
- **N08a** (depends on: N07, N08): Implement runtime exploration kernel for neighborhood query, cache, and budgeted local refinement.
- **N09** (depends on: N08): Add move-interaction departure geometry rules.
- **N10** (depends on: N07, N08, N08a, N09): Generate multiscale carrier rules and refinement operators (carrier form may vary).
- **N11** (depends on: N08a, N10): Implement camera grammar v1 integrated with runtime refinement and zoom-monotone band reveal.
- **N12** (depends on: N05, N06, N10, N11): Add anchored opening/middlegame/endgame entrypoints over one object instance.
- **N13** (depends on: N02b, N08a, N10): Add transposition relation overlay.
- **N14** (depends on: N07, N08a, N10, N11, N12, N13): Execute operational acceptance suite and budgets.

## Sequence

Topological baseline:
`N00a -> N00 -> N01 -> N02a -> N03 -> N02b -> N04 -> N05 -> N06 -> N07 -> N08 -> N08a -> N09 -> N10 -> N11 -> N12 -> N13 -> N14`

Parallel branches allowed by dependencies:
- `N05` and `N06` after `N03`.
- `N09` after `N08`.
- `N13` after `N02b`, `N08a`, and `N10`.

## Settlement criteria by node

- **N00a**: Reproducible workspace boots on a clean machine; viewer smoke build passes; uv-managed Python builder package installs and runs an env-check CLI; external engine/tablebase paths are declarative and optional; lockfiles and setup instructions exist.
- **N00**: Build passes with placeholder modules and explicit interfaces.
- **N01**: `plan/acceptance.md` includes declared corpus scope, salience-source declaration template, and budget section.
- **N02a**: Distinct occurrence identity and stable state-key mapping verified on fixtures.
- **N03**: Declared corpus ingests into continuous directed occurrence paths.
- **N02b**: Repeated-state relation index verified from ingested corpus examples.
- **N04**: DAG metrics confirm expected fan-out/fan-in and convergence.
- **N05**: Phase/material labels exported and verified on fixtures.
- **N06**: Terminal labels and anchors present for terminal occurrences.
- **N07**: Salience normalization stable and runtime prioritization checks pass.
- **N08**: Coarse embedding is deterministic for fixed seed/config and dataset declaration and usable as a navigation basis.
- **N08a**: Runtime query/refinement loads previously unseen local neighborhoods under budget without ontology swap.
- **N09**: Move-interaction departure rules are classifiable at coarse zoom with capture departures stronger than matched quiet-move controls.
- **N10**: Multiscale carrier rules and refinement operators generate local geometry without topology errors under declared budgets.
- **N11**: Camera-driven refinement preserves one object ontology and enforces zoom-monotone semantic band reveal.
- **N12**: Anchored entrypoints switch viewpoint/emphasis/anchor only; object identity unchanged and local exploration remains available.
- **N13**: Known transpositions show multiple occurrences plus visible relation.
- **N14**: All operational acceptance checks pass within declared budgets.
