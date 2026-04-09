# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N00

## Why this is current
- N00 is the earliest unresolved node in topological order.
- N01/N02a/N03 and all downstream nodes depend on N00 interface boundaries.

## Settle-and-advance conditions
- Minimal module skeleton for ingestion, graph model, embedding, salience, rendering, camera, and views exists.
- Interface boundaries are defined and buildable.
- A commit records N00 settlement and updates both `plan/completion-log.md` (one-line event) and this file to the next active node.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
