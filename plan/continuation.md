# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11i

## Why this is current
- The repository is now cut back to one live traversal slice instead of multiple parallel surfaces.
- The active implementation question is now narrower: repair the busted detached controls so the live slice is actually flyable again.
- The next scheduled action after N11i is a performance pass on reveal/materialization pressure, and the honest human review stays after that.

## Settle-and-advance conditions
- Detached orbit, turn, travel, dolly, reset, and click-to-center work on the live generated object without a persistent retarget requirement.
- Camera motion itself can cause additional nearby structure to materialize ahead on the same object.
- The default live graph is materially larger than the retired tiny fixture baseline.
- A commit records N11i settlement and updates both `plan/completion-log.md` and this file to N11j.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
