# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11h

## Why this is current
- The N11g settlement commit lands the long-lived browser-side graph store the runtime had been missing: selecting a non-terminal frontier occurrence now expands legal moves into the same represented object instead of replacing startup materialization.
- Live review in the dev viewer confirmed that node selection grows the graph without full-page restart and that the returned deltas add new occurrences or transitions to the existing object.
- The next honest frontier is now N11h because the live runtime still requires explicit node selection to request more graph; camera movement and view-driven navigation do not yet materialize additional structure as a function of what would actually need to render, and graph growth still does not yet provide the fast render-subset enumeration or compressed residency model needed to scale beyond the tiny current object.

## Settle-and-advance conditions
- Camera movement or other view changes can cause the runtime to materialize additional graph required for what would render in the current display without requiring a click-to-expand step.
- The runtime can determine the occurrence, edge, and LOD subset required for the current camera/view state fast enough that render-demand enumeration itself does not become the gating bottleneck.
- Expanding a pursued line can increase the materialized graph without changing the current camera or neighborhood visibility settings.
- The live store uses shared, flyweight, compressed, or otherwise pooled representation so many distant low-detail occurrences can accumulate without violating the declared memory envelope.
- Additive embedding keeps previously placed nodes stable within declared tolerance when new branches are expanded.
- Interactive focus change may retarget the view, but both camera-driven refinement and URL path pre-expansion materialize compatible state on the same growing object.
- A commit records N11h settlement and updates both `plan/completion-log.md` and this file to N12.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
