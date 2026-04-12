# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11

## Why this is current
- N10b was settled by commit c9c8232, which landed direct move/root/terminal labels on the geometry, a collapsible board reference, and deterministic structure-zoom plus refinement-step review artifacts over the existing builder-owned carrier seam.
- N10c is treated as settled on the roadmap criteria: recorded human review confirmed structure-zoom readability, coarse move-family readings surviving distance, refinement-step detail arriving without overturning the coarse reading, and live branch-aware label density keeping geometry primary on the reviewed higher-branch fixture.
- The prior demand for broader in-situ or still-higher-branch fixture evidence exceeded the roadmap settlement language for N10c; larger branching stress is deferred to N14 acceptance with a real corpus rather than kept as an open carrier-rendering blocker.
- N11 is now the earliest unresolved node in the baseline sequence, and camera grammar is the next dependency needed for the visualization to move beyond static review passes into live navigation.
- N13 is unblocked in parallel by N10c settlement, but N11 remains the current frontier because downstream visual interaction depends first on camera-driven refinement and zoom-monotone band reveal.
- Recorded live review has already found an unresolved N11 continuity defect: for QCD Bogo-Indian A at the initial position, moving view distance from 4.6 to 4.7 at neighborhood radius 4 makes the local edge set jump rather than change monotonically; this failure is logged in `artifacts/viewer/review/n11-live-review-notes.md`.

## Settle-and-advance conditions
- Camera grammar controls viewpoint, refinement, and semantic-band reveal over the existing one-object carrier rather than swapping to a second representation.
- Zoom-monotone reveal holds in live interaction: moving closer adds detail and labels, while moving away preserves the coarse reading instead of introducing contradictory emphasis.
- Runtime refinement and camera behavior stay coordinated so focus, orbit, and detail expansion behave predictably under interaction rather than as disconnected review-only steps.
- The recorded QCD Bogo-Indian A initial-position failure at view distance 4.6 -> 4.7 and neighborhood radius 4 is resolved so the local edge set no longer jumps across that transition.
- Recorded human review confirms the live camera grammar reads correctly on screen and keeps the geometry legible while detail bands appear.
- N11 remains anchored to the existing builder-owned departure seam, coarse embedding surface, and N10c label-density policy without reclassifying move families or shifting builder/runtime responsibility boundaries.
- Evidence artifacts for the reviewed camera behavior used to justify settlement are recorded with short verdict notes.
- The camera-grammar seam remains separable from later anchored entrypoint logic, transposition rendering policy, and final acceptance sweep.
- N11 may span multiple visible-change commits before settlement; commit cadence alone does not imply node completion.
- A commit records N11 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
