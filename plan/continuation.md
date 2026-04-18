# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11h

## Why this is current
- The N11g settlement commit lands the long-lived browser-side graph store the runtime had been missing: selecting a non-terminal frontier occurrence now expands legal moves into the same represented object instead of replacing startup materialization.
- Live review in the dev viewer confirmed that node selection grows the graph without full-page restart and that the returned deltas add new occurrences or transitions to the existing object, but it also exposed that the current navigation model is still semantically too node-bound.
- The earlier N11h framing proved premature: even with camera-demand plumbing underway, the forcing function is still wrong if camera rotation, forward movement, and zoom remain effectively tethered to a focused occurrence or board reference.
- The next honest frontier remains N11h, but N11h is now a replanning and purge node: before more runtime implementation, the plan must lock detached camera navigation independent of node snapping, separate board reference from camera control, and remove or simplify runtime/viewer structure that does not serve that requirement set.

## Settle-and-advance conditions
- Requirements, decisions, acceptance, roadmap, and this file explicitly state that camera rotation, forward or backward movement, and zoom remain available without snapping to or staying attached to a specific occurrence, while board reference and focus remain secondary.
- The viewer/runtime surfaces touched by the recent camera-demand work are audited against that requirement set, and non-serving structure is simplified or removed instead of preserved beside the target interaction model.
- The roadmap isolates detached camera-view-driven generation, additive embedding, render-demand enumeration, and compressed residency as follow-on node N11i rather than mixing that implementation work into the replanning node.
- A commit records N11h settlement and updates both `plan/completion-log.md` and this file to N11i.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
