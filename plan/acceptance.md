# Operational Acceptance (File Contract: measurable acceptance only)

This file contains explicit, testable acceptance checks and performance/rendering budgets.

## Declared initial data scope

- **Primary corpus slices:** Curated PGN subset for continuous occurrence paths, tagged opening-line references for named early-branch anchors, and terminal-labeled outcomes for declared end states.
- **Optional supplemental slices:** Engine-tree slices and tablebase slices are allowed only when a run declaration names them explicitly; otherwise they are absent from the represented subset.
- **Represented-subset rule:** The object is built from the declared corpus subset, not exhaustive legal-state enumeration.
- **Determinism rule:** Each acceptance run records the seed and config hash used to produce structural outputs.
- **Run declaration requirement:** Each acceptance run records corpus version/hash, declared slices, and salience-input declaration.

## Acceptance run declaration template

- **Corpus declaration fields:** Every recorded run declares corpus profile, corpus version/date, content hash, and each included or omitted slice with its source and selection rule.
- **Salience declaration fields:** Every recorded run declares frequency, eval, terminal pull, policy, and centrality inputs with a source plus weight, or marks the input as omitted.
- **Determinism declaration fields:** Every recorded run declares the fixed seed, config hash, and any supplemental external-slice hashes used in the run.

```yaml
run_declaration:
  corpus:
    profile: initial-represented-subset
    version_or_date:
    content_hash:
    slices:
      - name: curated-pgn-subset
        source:
        selection_rule:
      - name: tagged-opening-lines
        source:
        selection_rule:
      - name: terminal-outcome-labels
        source:
        selection_rule:
      - name: optional-engine-tree-slice
        source: omitted
        selection_rule: omitted
      - name: optional-tablebase-slice
        source: omitted
        selection_rule: omitted
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
    supplemental_hashes: []
```

## Performance/rendering budgets

- **B1. Interaction frame budget:** median frame time <= 33ms during scripted navigation path.
- **B2. Peak memory budget:** process RSS <= declared envelope for acceptance run.
- **B3. Load budget:** initial scene build completes within declared acceptance timeout.
- **B4. Zoom continuity budget:** no ontology swap events across full tested zoom range.

## Acceptance checks

- **A1. Occurrence distinction + transposition relation:** A known transposition case renders as multiple occurrences with a visible relation.
- **A2. Ontology continuity across zoom:** Zoom changes legibility/emphasis only; object identity remains constant.
- **A3. Anchored-view unity:** Opening, middlegame, and endgame presets reference the same underlying graph/object id.
- **A4. Mixed-scale single frame:** One camera frame can show local board-detail proxy and distal branching context together.
- **A5. Move-interaction departure salience:** Move-interaction departures remain classifiable at coarse zoom, with captures still showing stronger departure than matched quiet-move controls.
- **A6. Coarse salience preservation:** At coarse zoom, configured top-k salient frontier remains legible.
- **A7. Branching preservation:** Fan-out and fan-in metrics match fixture expectations.
- **A8. Deterministic reproducibility:** For fixed seed/config/corpus declaration, structural outputs are reproducible.
- **A9. Structure-zoom path legibility:** At structure zoom, known move families remain classifiable from coarse path geometry.
- **A10. Medium-zoom tactical residue:** At medium zoom, tactical residue becomes visible without changing the coarse move-family reading.
- **A11. Close-zoom contextual residue:** At close zoom, fine contextual residue becomes visible without causing a previously correct coarse classification to become false.

## Recording protocol

- Record pass/fail for A1-A11 and B1-B4 in commit artifacts tied to N14 settlement.
- Any budget change requires updating this file in the same commit as the decision update.
