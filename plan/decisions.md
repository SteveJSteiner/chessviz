# Decisions (File Contract: decisions only)

This file contains design and process decisions only. It must not become a task checklist or implementation plan.

## Hard commitments (locked)

- **D1. Occurrence-first identity** — Board occurrences are the primary represented entities.
- **D2. Non-collapse transposition semantics** — Shared board state is represented as a relation across occurrences; state equality does not force node merge.
- **D2a. Repeated-state relations are query surfaces** — The repeated-state index is a canonical queryable relation surface for runtime exploration and later rendering layers; it is not defined only as a post-hoc overlay artifact.
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
- **D14d. Visual design commitments are binding** — `plan/visual-design-commitments.md` is a locked rendering-constraint artifact with the same authority as the other `plan/` files.
- **D14e. Labels stay on the object** — Move names live on carriers, game names on roots, and terminal outcomes on terminal nodes; side panels are reference only.
- **D14f. No second chess representation** — The live viewer does not grow a move list, PGN tree, or parallel chess diagram beside the geometry; the board panel remains a single-position reference.
- **D14g. Chrome must justify itself** — Non-data visual elements stay out of the live viewer unless they solve a named legibility problem.
- **D14h. Live label-density control is mandatory** — Branch-heavy views require salience/proximity-aware label selection so the geometry does not become wallpaper.
- **D14i. One visual channel, one semantic job** — Channel roles remain singular and stable; redundancy is allowed only as an accessibility backup.

## Carrier-form decisions (experimental, not locked)

- **D15. Carrier family status** — Spiral and rope carriers are explicitly experimental until validated on fixture corpora.
- **D16. Promotion rule** — A carrier form is promoted to locked decision only after acceptance checks pass on fixture datasets.

## Data and computation stance (locked)

- **D17. Represented subset** — The rendered object is a represented subset of chess sourced from declared regime surfaces; it is not a literal enumeration of all legal positions.
- **D18. Per-regime declaration required** — Each run declares opening-table assets and coverage metadata, middlegame-procedural expansion and pruning policy, and endgame-table assets plus supported material classes.
- **D19. Salience-source declaration required** — Each run must declare salience inputs and weights (frequency, eval, terminal pull, policy, centrality).
- **D20. Determinism policy** — For a fixed dataset and seed, structural outputs used for acceptance must be reproducible.

## Regime substrate decisions (locked)

- **D20a. One represented object, three backing regimes** — Opening-table, middlegame-procedural, and endgame-table are explicit substrate regimes beneath one represented object.
- **D20b. Explicit regime resolution** — Runtime regime selection is a typed internal dispatch surface, not a user-facing mode switch.
- **D20c. Phase labels are annotations, not substrate selectors** — Opening/middlegame/endgame labels may remain useful annotations, but they do not define the runtime backing regime on their own.
- **D20d. Shared representation contract** — Every regime emits compatible occurrence, transition, anchor, salience, and provenance records with stable identities so cross-regime continuity is representable without object swaps.
- **D20e. Stable identity across regime boundaries** — Re-encountering the same position, occurrence, or anchored path across regime boundaries preserves identity/continuity semantics instead of minting unrelated objects.
- **D20f. Project-owned tabular truth surfaces** — Opening-table and endgame-table data live in project-owned, textual, inspectable formats that carry schema version, position key, continuation or terminal payload, weight/frequency/score fields, and provenance.
- **D20g. Imported and procedural outputs converge** — Imported opening/endgame records and live middlegame procedural outputs normalize into the same representation schema and review surface.
- **D20h. Builder-only external ingestion boundary** — Foreign opening-book or tablebase formats may be read only by explicit builder commands such as `import-opening-book`, `import-endgame-table`, and `build-web-corpus`; they are never runtime truth surfaces.
- **D20i. Middlegame remains live procedural** — The middlegame path is generated from live legal-move expansion plus declared scoring/prioritization/pruning policy rather than from a precomputed middlegame table.
- **D20j. Bootstrap derives from regime surfaces** — Any bootstrap artifact is materialized from opening-table assets, live middlegame procedural expansion, and endgame-table assets, never from the builder fixture.
- **D20k. Fixture demotion is binding** — The existing fixture remains a unit-test-only input for identity, transposition, and DAG assembly checks and is excluded from runtime corpus, bootstrap truth, and settlement review.
- **D20l. Settlement hard-fails on bypass or fracture** — Missing required opening/endgame assets, bypassing the middlegame procedural path, or fracturing identity/anchoring/navigation/query semantics at regime boundaries is a hard failure.

## Performance/rendering budget stance (locked)

- **D21. Budgeted legibility** — Legibility claims must be attached to explicit test budgets (dataset size, frame time targets, memory envelope, zoom range).
- **D22. Budget publication** — Budget values live in `plan/acceptance.md` and are versioned as planning decisions evolve.

## Process decisions for DAG execution (locked)

- **D23. Transition discipline** — Node transitions occur only in a commit that records the transition.
- **D24. Continuation discipline** — `plan/continuation.md` is the single source of current active node and settle/advance conditions.
- **D25. Frontier tracking** — `plan/completion-log.md` is concise, one line per committed frontier event.
- **D26. Frontier plasticity** — DAG frontier may split; nodes may be inserted (e.g., `N02a`, `N02b`) when discovery requires it.
- **D27. No estimates policy** — Planning artifacts contain nodes/dependencies only; no effort estimates.
- **D28. Human visual review gate** — Visual-representation nodes are not settled by automated assertions alone; settlement requires a recorded human review of the rendered result against the node's visual legibility claims.
- **D29. Incremental visual iteration** — Active visual nodes may span multiple visible-change commits before settlement; each commit may advance the render, but the node settles only after reviewed visual iteration converges.

## Open decision questions

- **O1. Salience blend** — Relative weighting of frequency/eval/policy/centrality/terminal pull.
- **O2. State-sameness rendering grammar** — Glow vs braid vs cross-fiber.
- **O3. Carrier geometry details** — Rope surface/interior treatment and bundle behavior.
- **O4. Camera grammar tuning** — Blend of path-following and context preservation.
- **O5. Transposition reveal policy** — Reveal aggressiveness vs occurrence separation.
- **O6. Middlegame partition features** — Material-only vs material + pawn/king/mobility factors.
- **O7. Terminal color grammar** — Joint encoding of W/D/L, salience, and family cues.
- **O8. Runtime refinement policy** — Query radius, cache eviction, and refinement triggers under camera motion.
- **O9. High-branch label selection policy** — Exact blend of top-k salience, proximity, hover, and fade rules in dense live neighborhoods.
- **O10. Opening-table serialization and sharding** — Exact textual schema and shard map for opening coverage.
- **O11. Endgame-table serialization and sharding** — Exact textual schema and material-class partition for endgame assets.
- **O12. Regime coverage cutoff metadata** — Exact opening-coverage cutoff and resolver precedence details when multiple regimes might claim the same position.
- **O13. Middlegame procedural policy** — Expansion horizon, pruning thresholds, and prioritization blend for live middlegame generation.
- **O14. Cross-regime provenance exposure** — Which provenance fields stay runtime-visible versus review-only once all regimes emit the shared contract.
- **O15. Bootstrap materialization granularity** — How much of the unified object is pre-seeded versus fetched or expanded on demand once regime surfaces replace the fixture.
