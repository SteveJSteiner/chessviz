# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N07

## Why this is current
- N06 was settled by commit 8c43135, which attached W/D/L terminal labels and stable terminal anchors on the declared fixture.
- N07 is now the earliest unresolved node in topological order.
- N08 is also unlocked after N06, but the declared baseline order advances through salience before embedding work.

## Settle-and-advance conditions
- Salience v1 scores and runtime prioritization hints are attached to builder artifacts without changing the N02a identity layer, the N02b repeated-state query surface, the N04 DAG topology, the N05 phase/material label surface, or the N06 terminal label surface.
- Fixture checks verify salience normalization and prioritization hints are stable on the declared corpus for a fixed declaration/config.
- Salience outputs are queryable from builder artifacts and remain separate from embedding and render-refinement concerns.
- The salience seam preserves compatibility with anchored entrypoints, terminal anchors, and later runtime prioritization logic.
- A commit records N07 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
