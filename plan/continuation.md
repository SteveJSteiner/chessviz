# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N10b

## Why this is current
- N10a was settled by commit 7b7ab83, which landed the runtime carrier surface, refinement operators, and fixture checks over the existing builder-owned departure seam and coarse embedding surface.
- N10b is now the earliest unresolved node in topological order.
- N11 remains blocked on N10b because camera grammar depends on a carrier presentation that is visually readable under reviewed structure-zoom and refinement-step renders, not just topologically valid.
- The runtime carrier seam now exists, but the current smoke rendering is not yet a readable object and must be iterated under the visual review gate before downstream visual nodes proceed.

## Settle-and-advance conditions
- Recorded human review of rendered structure-zoom views confirms the object is visually readable and that coarse move-family readings survive distance.
- Recorded human review of refinement-step views confirms tactical/contextual detail becomes visible without contradicting the coarse structure-zoom reading.
- Reviewed visual iterations remain anchored to the existing builder-owned departure seam and coarse embedding surface without reclassifying move families or shifting builder/runtime responsibility boundaries.
- Evidence artifacts for the reviewed renders used to justify settlement are recorded with short verdict notes.
- The carrier-visualization seam remains separable from later camera grammar, anchored entrypoint logic, transposition rendering policy, and final acceptance sweep.
- N10b may span multiple visible-change commits before settlement; commit cadence alone does not imply node completion.
- A commit records N10b settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
