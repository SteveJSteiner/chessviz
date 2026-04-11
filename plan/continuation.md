# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N00

## Why this is current
- N00a was settled by commit 29a261a, which locked both toolchains and validated the bootstrap smoke checks.
- N00 is the earliest unresolved node in topological order.
- N01 and N02a both depend on N00 establishing explicit module boundaries first.

## Settle-and-advance conditions
- Viewer code is split into placeholder modules with explicit interfaces for scene bootstrap and navigation entrypoints.
- Builder code is split into placeholder modules with explicit interfaces for occurrence identity, corpus ingestion, DAG construction, and later labeling/embedding seams.
- Shared configuration and artifact boundaries between viewer and builder are declared explicitly rather than left implicit in ad hoc scripts.
- Workspace build/check commands pass with placeholder implementations in place.
- A commit records N00 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
