# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N03

## Why this is current
- N02a was settled by commit dff611e, which separated canonical state keys from occurrence identity and verified both with transposition fixtures.
- N03 is now the earliest unresolved node in topological order.
- N02b, N04, N05, and N06 all depend on ingested occurrence paths, so declared corpus ingestion is the next gating step.

## Settle-and-advance conditions
- A declared initial corpus fixture exists with source name, version, and location fields consistent with the N01 acceptance contract.
- Corpus ingestion converts each declared game into a continuous directed occurrence path rooted at the initial position.
- Fixture checks verify path continuity, predecessor-successor ordering, and expected occurrence counts on a small declared corpus sample.
- Ingestion output is expressed only in terms of the N02a identity layer and remains free of later-node labeling, salience, or embedding concerns.
- A commit records N03 settlement and updates both `plan/completion-log.md` and this file to the next active node or frontier.

## Advancement rule
- No node advancement occurs without a commit that records the exact continuation state transition.
