# Operational Acceptance (File Contract: measurable acceptance only)

This file contains explicit, testable acceptance checks and budgets for detached traversal through the represented structure.

## Declared run surface

- **Seed surface:** The run starts from an explicit FEN or canonical state.
- **Runtime surface:** The browser expands legal continuations directly; no exported fixture bootstrap is required.
- **Review surface:** The live viewer itself is the primary evidence surface.

## Budgets

- **B1. Responsiveness:** Median frame time during active flight stays at or below 33ms on the declared review machine.
- **B2. Startup scale:** Default startup materializes a graph materially larger than the retired 118-node fixture baseline.
- **B3. Reveal continuity:** Camera-driven growth does not require a click-to-expand step or an anchor retarget to continue moving.

## Acceptance checks

- **A1. Dynamic-only truth:** The viewer starts from runtime generation rather than committed scene/bootstrap artifacts.
- **A2. Detached traversal:** Drag orbit, forward or backward travel, dolly, and drift all remain available without snapping to a selected occurrence.
- **A3. Procedural reveal under flight:** Moving toward a branch causes additional nearby boards and carriers to materialize ahead within the same represented continuity.
- **A4. Geometry-first reading:** At least one promising, forcing, or capture-heavy continuation is discoverable from carrier geometry and salience before opening the board.
- **A5. Secondary board confirmation:** The board reference confirms the tracked occurrence after traversal; it is not the interface required to discover the line.
- **A6. Larger live graph:** The runtime-generated view feels spatially navigable rather than like a small labeled knot.

## Human review question

- **Q1.** Can a human traverse the represented structure, pick out a promising or forcing line, and then open the board only to confirm it?

Pass:
The geometry leads, camera travel reveals structure, salient lines pull attention, and the board is only confirmation.

Fail:
The user still has to select anchors, read labels first, or inspect boards to understand anything important.
