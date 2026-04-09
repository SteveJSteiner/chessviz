# Operational Acceptance (File Contract: measurable acceptance only)

This file contains explicit, testable acceptance checks and performance/rendering budgets.

## Declared initial data scope

- **Corpus profile:** Curated PGN subset + tagged opening lines + terminal-labeled outcomes.
- **Represented-subset rule:** The object is built from the declared corpus subset, not exhaustive legal-state enumeration.
- **Run declaration requirement:** Each acceptance run records corpus version/hash and salience-input declaration.

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
- **A5. Capture departure salience:** Capture edges show stronger departure metric than matched quiet-move controls.
- **A6. Coarse salience preservation:** At coarse zoom, configured top-k salient frontier remains legible.
- **A7. Branching preservation:** Fan-out and fan-in metrics match fixture expectations.
- **A8. Deterministic reproducibility:** For fixed seed/config/corpus declaration, structural outputs are reproducible.

## Recording protocol

- Record pass/fail for A1-A8 and B1-B4 in commit artifacts tied to N14 settlement.
- Any budget change requires updating this file in the same commit as the decision update.
