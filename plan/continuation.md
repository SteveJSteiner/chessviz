# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N08

## Why this is current
- N07 was settled by commit 2f4783f, which attached normalized salience scores and runtime priority hints on the declared fixture.
- N08 is now the earliest unresolved node in topological order.
- N08a remains blocked on N08, so the declared baseline order advances through coarse embedding before runtime neighborhood refinement.

## Settle-and-advance conditions
- Coarse embedding coordinates are attached to builder artifacts without changing the N02a identity layer, the N02b repeated-state query surface, the N04 DAG topology, the N05 phase/material label surface, the N06 terminal label surface, or the N07 salience surface.
- Fixture checks verify the embedding is deterministic for a fixed declaration/config/seed and yields stable coordinates usable as a navigation basis on the declared corpus.
- Embedding outputs are queryable from builder artifacts and remain separate from later runtime refinement and camera concerns.
- The embedding seam preserves compatibility with anchored entrypoints, terminal anchors, and runtime prioritization hints.
- A commit records N08 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
