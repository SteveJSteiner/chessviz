# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N05

## Why this is current
- N04 was settled by commit 995ac08, which validated the occurrence DAG, adjacency metrics, and shared-state convergence on the declared fixture.
- N05 is now the earliest unresolved node in topological order.
- N06 is also unlocked after N03, but the declared baseline order advances through N05 before parallelizing further frontier work.

## Settle-and-advance conditions
- Phase and material-signature labels are attached to occurrences without changing the N02a identity layer or the N04 DAG topology.
- Fixture checks verify opening and early middlegame occurrences in the declared corpus receive expected phase/material labels.
- Label outputs are queryable from builder artifacts and remain separate from later salience, embedding, and render-refinement concerns.
- The labeling seam preserves compatibility with anchored entrypoints and later runtime prioritization logic.
- A commit records N05 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
