# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11h

## Why this is current
- The N11g settlement commit lands the long-lived browser-side graph store the runtime had been missing: selecting a non-terminal frontier occurrence now expands legal moves into the same represented object instead of replacing startup materialization.
- Live review in the dev viewer confirmed that node selection grows the graph without full-page restart and that the returned deltas add new occurrences or transitions to the existing object.
- The next honest frontier is now N11h because graph growth still reuses the current sector and view geometry, so pursued-line expansion narrows visually and the runtime does not yet cleanly separate materialization horizon from visibility and embedding stability.

## Settle-and-advance conditions
- Expanding a pursued line can increase the materialized graph without changing the current camera or neighborhood visibility settings.
- Additive embedding keeps previously placed nodes stable within declared tolerance when new branches are expanded.
- Interactive focus-click-expand flow and URL path pre-expansion materialize compatible state on the same growing object.
- A commit records N11h settlement and updates both `plan/completion-log.md` and this file to N12.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
