# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N09

## Why this is current
- N08a was settled by commit 34fa84d, which exported builder-owned manifests and validated runtime neighborhood query, cache behavior, and budgeted local refinement in the viewer.
- N09 is now the earliest unresolved node in topological order.
- N10 remains blocked on N09 because multiscale carrier refinement still needs coarse-zoom move-interaction departure rules.
- Builder-side occurrence transitions already carry canonical move facts, but the builder/viewer edge boundary does not yet export those facts or a coarse departure-rule surface for runtime consumption.

## Settle-and-advance conditions
- The builder/viewer edge boundary exports canonical move-family fields from occurrence transitions so the viewer/runtime seam does not reconstruct capture, check, or castling status from board state.
- Move-interaction departure rules are derived from the exported move-fact surface without changing occurrence identity, repeated-state relations, runtime neighborhood query semantics, or coarse embedding coordinates.
- Fixture checks verify capture departures are visually or numerically stronger than matched quiet-move departures at coarse zoom and that the rule surface remains classifiable from builder-owned data.
- The departure-rule seam remains queryable and separate from later multiscale carrier generation, camera grammar, anchored entrypoint logic, and eventual curved-path realization.
- A commit records N09 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
