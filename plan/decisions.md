# Decisions (File Contract: decisions only)

This file contains design and process decisions only. It must not become a task checklist or implementation plan.

## Hard commitments (locked)

- **D1. Occurrence-first identity** — Board occurrences remain the represented units.
- **D2. One live object** — The viewer presents one continuous generated object rather than separate diagrams, presets, or review artifacts.
- **D3. Browser-generated runtime first** — The live viewer starts from a seed FEN or canonical state and grows legal continuations in the browser.
- **D4. Detached camera is primary** — Orbit, forward or backward travel, dolly, and drift remain available without snapping the camera to a selected occurrence.
- **D5. Camera motion drives reveal** — Moving through the object is allowed to trigger graph growth and detail reveal directly.
- **D6. Geometry carries chess meaning** — Move families, forcing pressure, captures, and salience must read from carrier shape, thickness, persistence, and motion before the board is opened.
- **D7. Board reference is secondary** — The board panel confirms the currently tracked occurrence; it is not the discovery interface.
- **D8. Purge-first simplification** — Anchored entrypoints, artifact-backed runtime paths, transposition overlays, and review-document generators are removed unless they directly serve the traversal slice.
- **D9. Larger live graph beats fixture polish** — A materially larger generated graph is more important than preserving the old tiny fixture pipeline.
- **D10. Honest review over decorative evidence** — The key evaluation is whether a human can fly to a promising or forcing line from the geometry itself; static SVG evidence is not a substitute.

## Process decisions (locked)

- **D11. Continuation discipline** — `plan/continuation.md` stays the source of the active node until a commit records settlement.
- **D12. Frontier tracking** — `plan/completion-log.md` remains concise and commit-bound.

## Open decision questions

- **O1. Salience blend** — Exact weighting for runtime frontier priority.
- **O2. Carrier grammar tuning** — Exact mapping from quiet, forcing, capture, castle, and terminal moves into geometry.
- **O3. Flight control feel** — Best blend of drag orbit, dolly, forward motion, and drift for readable traversal.
