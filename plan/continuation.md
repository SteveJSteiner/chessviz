# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N10

## Why this is current
- N09 was settled by commit 17e7f9a, which exported builder-owned transition move facts and coarse departure rules across the builder/viewer boundary and validated their runtime query surface.
- N10 is now the earliest unresolved node in topological order.
- N11 remains blocked on N10 because camera grammar depends on multiscale carrier rules and refinement operators before zoom-monotone reveal can be enforced.
- The canonical departure-rule seam now exists, but multiscale carrier generation still needs to turn that seam into local geometry and refinement operators without topology errors.

## Settle-and-advance conditions
- Multiscale carrier rules are generated from the existing canonical departure-rule seam and coarse embedding surface without reclassifying move families or shifting builder/runtime responsibility boundaries.
- Refinement operators can realize local carrier geometry under declared budgets while preserving occurrence identity, repeated-state relations, runtime neighborhood query semantics, and coarse embedding coordinates.
- Fixture checks verify carrier generation and refinement preserve topology, keep coarse move-family readings intact at structure zoom, and do not introduce zoom-level contradictions for later semantic bands.
- The carrier-generation seam remains separable from later camera grammar, anchored entrypoint logic, transposition rendering policy, and final curved-path realization details.
- A commit records N10 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
