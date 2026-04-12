# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N12

## Why this is current
- N11 is treated as settled on the roadmap criteria: camera grammar now controls viewpoint, refinement, and semantic-band reveal over the existing one-object carrier, and recorded live review confirms the QCD Bogo-Indian A initial-position reproduction no longer jumps when view distance crosses 4.6 -> 4.7 at neighborhood radius 4.
- Commit 5c0978a landed the N11 camera-grammar seam, the runtime continuity correction, and the updated review artifacts that now back the recorded live verification.
- N12 is now the earliest unresolved node in the baseline sequence, and anchored opening/middlegame/endgame entrypoints are the next baseline dependency after stable live camera grammar.
- The declared fixture/artifact set now includes real endgame coverage in `2026-04-11-fixture-004`, so N12 can be implemented and reviewed against opening, middlegame, and endgame entrypoints on the same graph object.
- N13 remains unblocked in parallel by existing repeated-state and runtime work, but N12 is the current frontier because anchored entrypoints are the next baseline presentation seam before the final acceptance sweep.

## Settle-and-advance conditions
- Anchored opening, middlegame, and endgame entrypoints set viewpoint, emphasis, and anchor over the same underlying graph object rather than swapping object instances.
- Switching entrypoints preserves object identity and local exploration continuity; the change is in emphasis and camera anchoring, not ontology.
- Anchored entrypoints compose cleanly with the N11 camera grammar, the existing builder-owned departure seam, and the current phase/material/terminal labeling surface without shifting responsibility boundaries.
- The declared fixture used for N12 includes real endgame occurrences under the current labeling rule so the endgame entrypoint can be implemented and exercised with the same artifact set as opening and middlegame.
- Recorded human review confirms the anchored entrypoints still read as one object while making opening, middlegame, and endgame orientation clearer.
- Evidence artifacts for the reviewed anchored-entrypoint behavior are recorded with short verdict notes.
- N12 remains separable from transposition rendering policy and the final N14 acceptance sweep.
- N12 may span multiple visible-change commits before settlement; commit cadence alone does not imply node completion.
- A commit records N12 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
