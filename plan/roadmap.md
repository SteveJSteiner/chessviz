# Roadmap (File Contract: partitioned work and sequence only)

This file contains only the remaining work nodes, dependencies, and settlement criteria.

## Node list

- **N11i** (depends on: none): Repair detached traversal controls so the viewer remains a flyable view into one represented chess structure.
- **N11j** (depends on: N11i): Run one explicit performance pass on reveal/materialization pressure so the current larger runtime-generated view remains navigable under detached traversal.
- **N12** (depends on: N11j): Run the honest human evaluation on the larger runtime-generated view and record whether the geometry actually carries the read.

## Sequence

`N11i -> N11j -> N12`

## Settlement criteria by node

- **N11i**: Detached orbit, turn, travel, dolly, reset, and click-to-center work without sticky anchoring; camera motion itself can trigger graph growth and local reveal; the runtime-generated view is materially larger than the retired tiny fixture; and the board stays secondary.
- **N11j**: Reveal/materialization pressure drops enough that the current larger graph feels navigable under traversal instead of oversubscribed.
- **N12**: A reviewer can traverse the represented structure, identify at least one promising or forcing continuation from geometry before opening the board, and then confirm that read within that same represented continuity.
