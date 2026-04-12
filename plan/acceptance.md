# Operational Acceptance (File Contract: measurable acceptance only)

This file contains explicit, testable acceptance checks and performance/rendering budgets.

## Declared initial data scope

- **Opening-table surface:** Acceptance runs use declared project-owned opening-table assets emitted as deterministic web shards plus manifest metadata for opening coverage.
- **Middlegame surface:** Acceptance runs use live procedural expansion from the current position under a declared expansion, scoring, and pruning policy; no precomputed full-middlegame lookup corpus is allowed.
- **Endgame-table surface:** Acceptance runs use declared project-owned endgame-table assets emitted as deterministic web shards plus manifest metadata for supported material classes.
- **Fixture rule:** The builder fixture is test-only and is excluded from runtime corpus, bootstrap truth, and settlement review.
- **Truth-surface rule:** Reviewed and settled runtime data comes from project-owned web assets and live procedural outputs, not foreign binary layouts.
- **Bootstrap rule:** Any bootstrap or seeded scene used for acceptance is derived from regime surfaces rather than from fixture data.
- **Represented-subset rule:** The object is built from the declared regime surfaces, not exhaustive legal-state enumeration.
- **Determinism rule:** Each acceptance run records the seed, config hash, and regime-surface hashes or policy hashes used to produce structural outputs.
- **Run declaration requirement:** Each acceptance run records regime surface metadata, any builder-time import inputs, and the salience-input declaration.

## Acceptance run declaration template

- **Corpus declaration fields:** Every recorded run declares corpus profile, corpus version/date, content hash, and each included or omitted slice with its source and selection rule.
- **Salience declaration fields:** Every recorded run declares frequency, eval, terminal pull, policy, and centrality inputs with a source plus weight, or marks the input as omitted.
- **Determinism declaration fields:** Every recorded run declares the fixed seed, config hash, and any supplemental external-slice hashes used in the run.

```yaml
run_declaration:
  representation:
    graph_object_id:
    schema_version:
  regimes:
    opening_table:
      asset_set:
      manifest_hash:
      coverage_cutoff:
      schema_version:
    middlegame_procedural:
      expansion_policy:
      pruning_policy:
      scoring_policy:
      runtime_config_hash:
    endgame_table:
      asset_set:
      manifest_hash:
      supported_material_classes: []
      schema_version:
  ingestion_inputs:
    opening_import:
      source: omitted
      source_hash: omitted
    endgame_import:
      source: omitted
      source_hash: omitted
  salience:
    frequency:
      source:
      weight:
    eval:
      source:
      weight:
    terminal_pull:
      source:
      weight:
    policy:
      source:
      weight:
    centrality:
      source:
      weight:
    normalization:
    top_k_frontier:
  determinism:
    seed:
    config_hash:
    regime_hashes: []
```

## Performance/rendering budgets

- **B1. Interaction frame budget:** median frame time <= 33ms during scripted navigation path.
- **B2. Peak memory budget:** process RSS <= declared envelope for acceptance run.
- **B3. Load budget:** initial scene build completes within declared acceptance timeout.
- **B4. Zoom continuity budget:** no ontology swap events across full tested zoom range.
- **B5. Local refinement budget:** entering a previously unseen local neighborhood reaches the declared refinement target within the acceptance-timeout envelope without blocking navigation continuity.

## Acceptance checks

- **A1. Occurrence distinction + transposition relation:** A known transposition case renders as multiple occurrences with a visible relation.
- **A2. Ontology continuity across zoom:** Zoom changes legibility/emphasis only; object identity remains constant.
- **A3. Anchored-view unity plus regime continuity:** Opening, middlegame, and endgame entrypoints reference the same underlying object id, and shared positions preserve stable identity when navigation crosses regime boundaries.
- **A4. Internal regime resolution correctness:** Declared opening-covered positions resolve to opening-table, declared supported terminal-material positions resolve to endgame-table, and all other declared positions resolve to middlegame-procedural.
- **A5. Cross-regime navigation continuity:** Traversals that cross opening-table to middlegame-procedural or middlegame-procedural to endgame-table preserve object identity, anchor semantics, navigation continuity, and query semantics.
- **A6. Mixed-scale single frame:** One camera frame can show local board-detail proxy and distal branching context together.
- **A7. Move-interaction departure salience:** Move-interaction departures remain classifiable at coarse zoom, with captures still showing stronger departure than matched quiet-move controls.
- **A8. Coarse salience preservation:** At coarse zoom, configured top-k salient frontier remains legible.
- **A9. Branching preservation:** Fan-out and fan-in metrics match declared regime-surface expectations for the acceptance run.
- **A10. Deterministic reproducibility:** For fixed seed/config/regime declaration, structural outputs are reproducible.
- **A11. Structure-zoom path legibility:** At structure zoom, known move families remain classifiable from coarse path geometry.
- **A12. Medium-zoom tactical residue:** At medium zoom, tactical residue becomes visible without changing the coarse move-family reading.
- **A13. Close-zoom contextual residue:** At close zoom, fine contextual residue becomes visible without causing a previously correct coarse classification to become false.
- **A14. Runtime local refinement continuity:** Entering a previously unseen local region refines continuously under navigation without switching object family and without bypassing the procedural middlegame path when middlegame resolution is required.
- **A15. On-object labeling primacy:** Move, root, and terminal labels remain readable on the geometry itself without requiring a sidebar or legend lookup.
- **A16. Reference-view subordination:** The focused board reference stays secondary; collapsing or ignoring it does not prevent reading the local geometry.
- **A17. Branch-aware label density:** In declared high-branch runs, label selection or fade keeps the geometry readable without simultaneous all-edge text saturation.
- **A18. Project-owned truth surface only:** Acceptance runs and browser/runtime fetch paths use only declared opening/endgame web assets plus live procedural middlegame outputs; fixture data is absent.
- **A19. Runtime asset boundary:** No foreign binary opening-book or tablebase formats are committed as runtime truth artifacts or loaded by the web runtime.
- **A20. Hard-fail integrity:** Acceptance fails when required opening/endgame assets are missing, middlegame procedural expansion is bypassed by canned coverage, or regime transitions fracture identity, anchoring, navigation, or query continuity.

## Visual evidence requirements

- **V1. Human review gate:** Checks `A1` through `A8` and `A11` through `A17` require human-reviewed render evidence.
- **V2. Evidence artifact:** Each reviewed run records at least one screenshot or screen capture for each exercised visual regime plus a short verdict of what did and did not read.
- **V3. Automation role:** Automated assertions may support those checks but cannot produce a pass on their own.

## Recording protocol

- Record pass/fail for A1-A20 and B1-B5 in commit artifacts tied to N14 settlement.
- Record the human review artifacts required by V1-V3 in the same commit artifacts for any visual-node settlement claim.
- Any budget change requires updating this file in the same commit as the decision update.
