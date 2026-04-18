# Operational Acceptance (File Contract: measurable acceptance only)

This file contains explicit, testable acceptance checks and performance/rendering budgets.

## Declared initial data scope

- **Seed-state surface:** Acceptance runs declare an explicit seed board state as a canonical state key or full FEN.
- **Runtime graph surface:** Acceptance runs use browser-side legal-move expansion from that seed under a declared expansion, scoring, and pruning policy; no exported corpus or precomputed middlegame lookup corpus is allowed as a runtime prerequisite.
- **Optional asset surface:** Acceptance runs may include project-owned opening-table or endgame-table assets as optional overlays, prioritization hints, or validation references, but those assets do not replace live graph generation.
- **Fixture rule:** The builder fixture is test-only or review-only and is excluded from required runtime graph genesis and settlement review.
- **Truth-surface rule:** Reviewed and settled runtime data comes from the browser-generated graph plus any optional project-owned assets, not foreign binary layouts or exported fixture corpora.
- **Bootstrap rule:** Any bootstrap or seeded scene used for acceptance is derived from the explicit seed state plus runtime configuration rather than from fixture data or exported corpus bootstrap artifacts.
- **Entrypoint rule:** Runtime focus presets or anchors derive from generated graph state and optional declared overlays, not phase labels embedded in fixture artifacts.
- **Represented-subset rule:** The object is the dynamically generated neighborhood and relation surface around the declared seed, not exhaustive legal-state enumeration.
- **Determinism rule:** Each acceptance run records the seed, config hash, and any optional asset hashes or policy hashes used to produce structural outputs.
- **Run declaration requirement:** Each acceptance run records seed-state metadata, runtime-generation policy, any builder-time import inputs for optional assets, and the salience-input declaration.

## Acceptance run declaration template

- **Seed declaration fields:** Every recorded run declares the seed state, seed kind, and any explicit starting-position normalization applied before generation.
- **Salience declaration fields:** Every recorded run declares frequency, eval, terminal pull, policy, and centrality inputs with a source plus weight, or marks the input as omitted.
- **Bootstrap declaration fields:** Every recorded run declares the bootstrap seed surface, focus-candidate source, and focus-preset or anchor derivation surface.
- **Determinism declaration fields:** Every recorded run declares the fixed seed, config hash, and any supplemental optional-asset hashes used in the run.

```yaml
run_declaration:
  representation:
    graph_object_id:
    schema_version:
  bootstrap:
    seed_state:
    seed_kind:
    focus_candidates_source:
    entrypoint_derivation:
  runtime_generation:
    expansion_policy:
    pruning_policy:
    scoring_policy:
    render_subset_policy:
    residency_policy:
    lod_policy:
    focus_level_policy:
    runtime_config_hash:
    max_depth:
    max_branching:
    max_local_ply_from_focus:
    visible_low_detail_occurrence_target:
    visible_edge_target:
  optional_assets:
    opening_table:
      asset_set: omitted
      manifest_hash: omitted
      coverage_cutoff: omitted
      schema_version: omitted
    endgame_table:
      asset_set: omitted
      manifest_hash: omitted
      supported_material_classes: []
      schema_version: omitted
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
    optional_asset_hashes: []
```

## Performance/rendering budgets

- **B1. Interaction frame budget:** median frame time <= 33ms during scripted navigation path.
- **B2. Peak memory budget:** process RSS <= declared envelope for acceptance run.
- **B3. Load budget:** initial scene build completes within declared acceptance timeout.
- **B4. Zoom continuity budget:** no ontology swap events across full tested zoom range.
- **B5. Local refinement budget:** entering a previously unseen local neighborhood by camera/view navigation reaches the declared refinement target within the acceptance-timeout envelope without blocking navigation continuity or requiring a click-to-expand step.
- **B6. Render-subset enumeration budget:** determining the occurrence, edge, and LOD subset required for the current camera/view state completes within the declared latency envelope for the acceptance run.
- **B7. Visible low-detail scale budget:** at structure zoom, the renderer sustains the declared visible low-detail occurrence and edge targets within the frame-time and memory envelopes.

## Acceptance checks

- **A1. Occurrence distinction + transposition relation:** A known transposition case renders as multiple occurrences with a visible relation.
- **A2. Ontology continuity across zoom:** Zoom changes legibility/emphasis only; object identity remains constant.
- **A3. Focus-preset unity plus optional-overlay continuity:** Any opening, middlegame, endgame, or equivalent focus presets reference the same underlying generated object id, and shared positions preserve stable identity when optional overlays are present.
- **A4. Runtime graph-generation correctness:** From the declared seed state, the browser runtime expands legal positions without exported corpus dependency; optional opening-table or endgame-table assets may refine interpretation but do not replace graph generation.
- **A5. Optional-overlay continuity:** When opening-table or endgame-table overlays are enabled, they preserve object identity, anchor semantics, navigation continuity, and query semantics.
- **A6. Mixed-scale single frame:** One camera frame can show local board-detail proxy and distal branching context together.
- **A7. Move-interaction departure salience:** Move-interaction departures remain classifiable at coarse zoom, with captures still showing stronger departure than matched quiet-move controls.
- **A8. Coarse salience preservation:** At coarse zoom, configured top-k salient frontier remains legible.
- **A9. Branching preservation:** Fan-out and fan-in metrics match declared regime-surface expectations for the acceptance run.
- **A10. Deterministic reproducibility:** For fixed seed/config/regime declaration, structural outputs are reproducible.
- **A11. Structure-zoom path legibility:** At structure zoom, known move families remain classifiable from coarse path geometry.
- **A12. Medium-zoom tactical residue:** At medium zoom, tactical residue becomes visible without changing the coarse move-family reading.
- **A13. Close-zoom contextual residue:** At close zoom, fine contextual residue becomes visible without causing a previously correct coarse classification to become false.
- **A14. Runtime local refinement continuity:** Entering a previously unseen local region by camera/view navigation refines continuously without switching object family, without bypassing the live legal-move generation path when runtime expansion is required, without requiring explicit click-to-expand interaction as the gating mechanism, and without requiring the camera to snap to or remain attached to a focused occurrence in order to continue navigation after an explicit neighborhood-anchor retarget.
- **A15. On-object labeling primacy:** Move, root, and terminal labels remain readable on the geometry itself without requiring a sidebar or legend lookup.
- **A16. Reference-view subordination:** The selected board reference stays secondary; collapsing or ignoring it does not prevent reading the local geometry, and selecting a new reference or neighborhood anchor does not become a prerequisite for continued orbit or zoom.
- **A17. Branch-aware label density:** In declared high-branch runs, label selection or fade keeps the geometry readable without simultaneous all-edge text saturation.
- **A18. Runtime truth surface only:** Acceptance runs and browser/runtime fetch paths use the browser-generated graph plus any optional declared opening/endgame web assets; fixture data is absent from required runtime truth.
- **A19. Runtime asset boundary:** No foreign binary opening-book or tablebase formats are committed as runtime truth artifacts or loaded by the web runtime.
- **A20. Hard-fail integrity:** Acceptance fails when live runtime graph generation is bypassed by canned corpus truth, optional assets are treated as mandatory runtime prerequisites, or overlays fracture identity, anchoring, navigation, or query continuity.
- **A21. Entrypoint derivation boundary:** Focus presets, anchors, and bootstrap focus candidates are derived from generated graph state or declared overlay annotations rather than from phase labels embedded in fixture manifests.
- **A22. Focus-level budget semantics:** For declared camera/view states, the runtime maps view distance and orientation to a bounded local ply horizon and parallel visible position budget that remain legible and reproducible under the declared run budgets.
- **A23. Render-demand enumeration continuity:** The runtime can determine the renderable occurrence, edge, and LOD subset for the current camera/view state fast enough to drive generation and rendering without full-graph traversal becoming the gating bottleneck.
- **A24. Distant-detail accumulation:** Structure-zoom runs can keep a declared large low-detail visible subset available under the memory envelope while near-focus detail remains available for refinement on the same represented object.
- **A25. Traversal-first object read:** In a declared live run, a reviewer can move through the represented object with detached camera travel, identify at least one promising, forcing, or otherwise high-salience continuation from geometry, label persistence, and reveal behavior before consulting the board reference, and then confirm that continuation on the same object without ontology swap.
- **A26. Procedural reveal under flight:** During detached forward or backward travel plus zoom, previously unseen local occurrence and move detail materializes along the pursued path on demand without requiring explicit anchor switching or click-to-expand as the gating interaction.
- **A27. Close-approach confirmation:** At close traversal, the approached local structure presents a readable board-detail proxy or equivalent positional confirmation while distal object context remains recoverable on the same represented object, and the secondary board reference remains confirmation rather than the primary discovery surface.

## Visual evidence requirements

- **V1. Human review gate:** Checks `A1` through `A8`, `A11` through `A17`, and `A22` through `A27` require human-reviewed render evidence.
- **V2. Evidence artifact:** Each reviewed run records at least one screenshot or screen capture for each exercised visual regime plus a short verdict of what did and did not read.
- **V3. Automation role:** Automated assertions may support those checks but cannot produce a pass on their own.

## Recording protocol

- Record pass/fail for A1-A27 and B1-B7 in commit artifacts tied to N14 settlement.
- Record the human review artifacts required by V1-V3 in the same commit artifacts for any visual-node settlement claim.
- Any budget change requires updating this file in the same commit as the decision update.
