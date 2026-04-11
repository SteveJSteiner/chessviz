# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N00a

## Why this is current
- N00a is the earliest unresolved node in topological order.
- N00 depends on a working, reproducible environment so that its interface boundaries are actually buildable.

## Settle-and-advance conditions
- Root workspace files exist and document the JS and Python toolchains.
- Viewer smoke app builds and opens a minimal Three/R3F canvas.
- Builder package installs via uv and runs an environment check command.
- Engine and tablebase configuration are declared via environment variables, not hard-coded.
- A commit records N00a settlement and updates both `plan/completion-log.md` and this file to `N00`.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
