# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N06

## Why this is current
- N05 was settled by commit b2dca35, which attached phase/material labels and exposed the label query surface on the declared fixture.
- N06 is now the earliest unresolved node in topological order.
- N07 and N08 remain blocked on N06, so the declared baseline order advances through terminal labeling before salience and embedding work.

## Settle-and-advance conditions
- Terminal W/D/L labels and terminal anchors are attached to terminal occurrences without changing the N02a identity layer, the N02b repeated-state query surface, the N04 DAG topology, or the N05 phase/material label surface.
- Fixture checks verify terminal occurrences in the declared corpus receive expected W/D/L labels and terminal-anchor metadata.
- Terminal-label outputs are queryable from builder artifacts and remain separate from later salience, embedding, and render-refinement concerns.
- The terminal-labeling seam preserves compatibility with anchored entrypoints and later runtime prioritization logic.
- A commit records N06 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
