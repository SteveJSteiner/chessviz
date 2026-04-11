# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N04

## Why this is current
- N02b was settled by commit 4910e46, which exposed repeated-state relations as a runtime-query surface over ingested occurrences.
- N04 is now the earliest unresolved node in topological order.
- N05 and N06 are also unlocked after N03, but the declared baseline order advances through N04 before parallelizing further frontier work.

## Settle-and-advance conditions
- A DAG artifact is built directly from the ingested occurrence paths and repeated-state query surface without collapsing path-distinct occurrences.
- Fixture checks verify expected node count, edge count, fan-out, and fan-in on the declared corpus sample.
- Convergence metrics confirm the transposition example preserves distinct occurrences while still exposing shared-state relations through N02b outputs.
- DAG outputs remain free of later salience, labeling, embedding, and render-refinement concerns.
- A commit records N04 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
