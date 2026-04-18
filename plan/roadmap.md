# Roadmap (File Contract: partitioned work and sequence only)

This file contains only the remaining work nodes, dependencies, and settlement criteria.

## Node list

- **N11i** (depends on: none): Ship one live traversal-first viewer slice with detached free-flight camera, dynamic runtime graph growth, and board-as-confirmation behavior.
- **N11j** (depends on: N11i): Run the honest human evaluation on a larger live graph and record whether the geometry actually carries the read.
- **N12** (depends on: N11j): Only after the slice passes, harden scale and selectively reintroduce any missing structure that directly serves the live object.

## Sequence

`N11i -> N11j -> N12`

## Settlement criteria by node

- **N11i**: Detached orbit, travel, and dolly work without retargeting; camera motion itself can trigger graph growth and local reveal; the generated graph is materially larger than the retired tiny fixture; and the board stays secondary.
- **N11j**: A reviewer can fly through the object, identify at least one promising or forcing continuation from geometry before opening the board, and then confirm that read on the same object.
- **N12**: Only features that strengthen the traversal-first object without displacing it are reconsidered.
