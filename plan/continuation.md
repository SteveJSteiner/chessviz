# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N02a

## Why this is current
- N01 was settled by commit ff855b4, which made the acceptance run declaration explicit for corpus scope, salience inputs, and determinism.
- N02a is now the earliest unresolved node in topological order.
- N03 depends on both N01 and N02a, so occurrence identity must be verified before declared corpus ingestion can advance.

## Settle-and-advance conditions
- A stable state-key mapping is defined independently of corpus-specific labeling or salience metadata.
- Fixture checks show the same board state reproduces the same state key across repeated construction.
- Fixture checks show distinct path contexts can share a state key while still producing distinct occurrence identities.
- The identity layer is exposed through explicit builder interfaces that later ingestion and DAG stages can consume unchanged.
- A commit records N02a settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
