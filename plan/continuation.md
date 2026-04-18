# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11i

## Why this is current
- The repository is now cut back to one live traversal slice instead of multiple parallel surfaces.
- The active implementation question is no longer about artifact plumbing or anchored presets; it is whether detached camera travel through the generated object is enough to reveal chess structure directly.
- N11j remains the follow-on review node and should not be claimed until a commit records that evaluation.

## Settle-and-advance conditions
- Detached orbit, travel, and dolly work on the live generated object without a retarget requirement.
- Camera motion itself can cause additional nearby structure to materialize ahead on the same object.
- The default live graph is materially larger than the retired tiny fixture baseline.
- A commit records N11i settlement and updates both `plan/completion-log.md` and this file to N11j.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
