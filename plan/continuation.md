# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N10c

## Why this is current
- N10b was settled by commit c9c8232, which landed direct move/root/terminal labels on the geometry, a collapsible board reference, and deterministic structure-zoom plus refinement-step review artifacts over the existing builder-owned carrier seam.
- N10c is now the earliest unresolved node in topological order.
- N11 remains blocked on N10c because camera grammar depends on live label reveal and density behavior that stays readable when branching increases, not just on static review artifacts.
- Narrow-move live review now indicates the current ribbon is sufficient to continue, and the one-sided presentation issue is no longer treated as a front-face culling problem.
- The remaining N10c blocker is broader evidence: more complex in-situ or higher-branch examples are still needed to judge longer-range carrier readability and branch-aware live label density before downstream visual nodes can treat this seam as settled.

## Settle-and-advance conditions
- Recorded human review of rendered structure-zoom views confirms the object is visually readable and that coarse move-family readings survive distance.
- Recorded human review of refinement-step views confirms tactical/contextual detail becomes visible without contradicting the coarse structure-zoom reading.
- Live viewer labels participate in zoom-monotone reveal and keep the geometry primary without requiring a second representation or an always-open board reference.
- Branch-aware label-density policy keeps higher-branch neighborhoods readable by salience, proximity, selection, or equivalent constrained reveal rather than simultaneous full saturation.
- Settlement evidence covers more than the current narrow local examples; it must include in-situ or higher-branch cases that actually exercise the longer-range readability requirement.
- Reviewed visual iterations remain anchored to the existing builder-owned departure seam and coarse embedding surface without reclassifying move families or shifting builder/runtime responsibility boundaries.
- Evidence artifacts for the reviewed renders used to justify settlement are recorded with short verdict notes.
- The carrier-visualization seam remains separable from later camera grammar, anchored entrypoint logic, transposition rendering policy, and final acceptance sweep.
- N10c may span multiple visible-change commits before settlement; commit cadence alone does not imply node completion.
- A commit records N10c settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
