# Decisions (File Contract: decisions only)

This file contains design and process decisions only. It must not become a task checklist or implementation plan.

## Hard commitments (locked)

- **D1. Occurrence-first identity** — Board occurrences are the primary represented entities.
- **D2. Non-collapse transposition semantics** — Shared board state is represented as a relation across occurrences; state equality does not force node merge.
- **D3. Single-object continuity across zoom** — Zoom changes emphasis/legibility, never ontology.
- **D4. DAG/path preservation** — Single games are continuous directed paths; multi-game space preserves fan-out and fan-in.
- **D5. Width-first geometry stance** — The main structural difficulty is branching width, not path length.
- **D6. Hyperbolic-style 3D stance** — Use 3D with hyperbolic-style embedding/projection to preserve local detail while retaining distal branching context.
- **D7. Anchored-view continuity** — Opening/middlegame/endgame presets are views into the same object instance.
- **D8. Salience compression policy** — Optical mass is salience-weighted; low-salience legal structure remains available at close zoom.
- **D9. Edge paths are multiscale semantic carriers** — Edge paths are semantic carriers, not neutral connectors.
- **D10. Lower bands dominate interpretation** — Higher-band detail may refine readings but may not overturn coarse move-family interpretation.
- **D11. Geometry vs surface split** — The low semantic band lives in centerline geometry; mid/high bands may use bounded geometric modulation, surface treatment, or both with stable semantic roles.
- **D12. Shell model compiles into bands** — Shell layers compile into scale-separated path behavior (shell 0/1 coarse departure, shell 2 tactical mid-band, shell 3 contextual residue).
- **D13. Bounded perturbation over unrestricted fractal detail** — Use base curves plus bounded band-limited perturbations to preserve silhouette-level reading.
- **D14. Zoom-monotone reveal is required** — Nearer views may add tactical/contextual residue but must not invalidate coarse readings.
- **D14a. Render-time local exploration is first-class** — Camera motion and zoom may trigger local neighborhood acquisition and refinement at render time; this is part of the representation, not a fallback interface behavior.
- **D14b. Builder/runtime responsibility split** — Builder outputs canonical occurrence structure, relation indices, declarations, and coarse guides; runtime owns neighborhood query, cache, and budgeted refinement.
- **D14c. View-dependent realization is allowed** — Not all render geometry must be fully materialized ahead of time, provided runtime realization preserves object identity and zoom-monotone semantics.

## Carrier-form decisions (experimental, not locked)

- **D15. Carrier family status** — Spiral and rope carriers are explicitly experimental until validated on fixture corpora.
- **D16. Promotion rule** — A carrier form is promoted to locked decision only after acceptance checks pass on fixture datasets.

## Data and computation stance (locked)

- **D17. Represented subset** — The rendered object is a represented subset of chess sourced from declared corpora; it is not a literal enumeration of all legal positions.
- **D18. Data-source declaration required** — Each run must declare corpus composition (e.g., PGN corpus, opening book, tablebase slice, engine tree slice).
- **D19. Salience-source declaration required** — Each run must declare salience inputs and weights (frequency, eval, terminal pull, policy, centrality).
- **D20. Determinism policy** — For a fixed dataset and seed, structural outputs used for acceptance must be reproducible.

## Performance/rendering budget stance (locked)

- **D21. Budgeted legibility** — Legibility claims must be attached to explicit test budgets (dataset size, frame time targets, memory envelope, zoom range).
- **D22. Budget publication** — Budget values live in `plan/acceptance.md` and are versioned as planning decisions evolve.

## Process decisions for DAG execution (locked)

- **D23. Transition discipline** — Node transitions occur only in a commit that records the transition.
- **D24. Continuation discipline** — `plan/continuation.md` is the single source of current active node and settle/advance conditions.
- **D25. Frontier tracking** — `plan/completion-log.md` is concise, one line per committed frontier event.
- **D26. Frontier plasticity** — DAG frontier may split; nodes may be inserted (e.g., `N02a`, `N02b`) when discovery requires it.
- **D27. No estimates policy** — Planning artifacts contain nodes/dependencies only; no effort estimates.

## Open decision questions

- **O1. Salience blend** — Relative weighting of frequency/eval/policy/centrality/terminal pull.
- **O2. State-sameness rendering grammar** — Glow vs braid vs cross-fiber.
- **O3. Carrier geometry details** — Rope surface/interior treatment and bundle behavior.
- **O4. Camera grammar tuning** — Blend of path-following and context preservation.
- **O5. Transposition reveal policy** — Reveal aggressiveness vs occurrence separation.
- **O6. Middlegame partition features** — Material-only vs material + pawn/king/mobility factors.
- **O7. Terminal color grammar** — Joint encoding of W/D/L, salience, and family cues.
- **O8. Runtime refinement policy** — Query radius, cache eviction, and refinement triggers under camera motion.
