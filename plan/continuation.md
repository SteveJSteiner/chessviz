# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N02b

## Why this is current
- N03 was settled by commit 9a97f9b, which introduced a declared corpus fixture and verified continuous occurrence-path ingestion on it.
- N02b is now the earliest unresolved node in topological order.
- N04 and N13 both depend on a repeated-state query surface over ingested occurrences, so transposition indexing is the next gating step.

## Settle-and-advance conditions
- A repeated-state relation index and query surface are built over ingested occurrences without collapsing distinct occurrence identities.
- Fixture checks verify the declared corpus transposition example yields one shared state key with multiple occurrence ids and that both occurrences are discoverable through relation queries.
- Relation output distinguishes singleton states from repeated states and supports query by occurrence id or state key rather than assuming a pre-rendered overlay consumer.
- The repeated-state query surface remains separate from later overlay, salience, labeling, and embedding concerns while remaining consumable by runtime exploration.
- A commit records N02b settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
