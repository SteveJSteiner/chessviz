# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N01

## Why this is current
- N00 was settled by commit ebf2ead, which introduced placeholder viewer/builder modules, explicit artifact boundaries, and workspace check commands.
- N01 is the earliest unresolved node in topological order.
- N02a is now unlocked as well, but advancement follows the declared baseline order until the frontier is intentionally split.

## Settle-and-advance conditions
- `plan/acceptance.md` declares the initial represented corpus scope in terms consistent with D17-D20.
- `plan/acceptance.md` includes an explicit salience-source declaration template for acceptance runs.
- `plan/acceptance.md` keeps the measurable budget section intact while adding the missing declaration details only.
- A commit records N01 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
