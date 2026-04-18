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
- **D14f. Single geometric interface** — The live viewer keeps the geometry as the primary reading surface, and the board panel remains a single-position reference for the currently focused node.
- **D14g. Chrome must justify itself** — Non-data visual elements stay out of the live viewer unless they solve a named legibility problem.
- **D14h. Live label-density control is mandatory** — Branch-heavy views require salience/proximity-aware label selection so the geometry does not become wallpaper.
- **D14i. One visual channel, one semantic job** — Channel roles remain singular and stable; redundancy is allowed only as an accessibility backup.

## Carrier-form decisions (experimental, not locked)

- **D15. Carrier family status** — Spiral and rope carriers are explicitly experimental until validated on fixture corpora.
- **D16. Promotion rule** — A carrier form is promoted to locked decision only after acceptance checks pass on fixture datasets.

## Data and computation stance (locked)

- **D17. Represented subset** — The rendered object is a represented subset of chess sourced from an explicit seed state plus live runtime generation, optionally refined by declared opening/endgame assets; it is not a literal enumeration of all legal positions.
- **D18. Runtime-run declaration required** — Each run declares the seed state, live runtime expansion and pruning policy, and any optional opening/endgame assets or coverage metadata that participate in the run.
- **D19. Salience-source declaration required** — Each run must declare salience inputs and weights (frequency, eval, terminal pull, policy, centrality).
- **D20. Determinism policy** — For a fixed dataset and seed, structural outputs used for acceptance must be reproducible.

## Runtime substrate decisions (locked)

- **D20a. One represented object, browser-generated first** — The live viewer’s primary object is generated in-browser from an explicit seed board state through legal-move expansion.
- **D20b. Seed-state primacy** — A valid canonical state key or full FEN is sufficient to start a runtime object; no exported corpus is required for graph genesis.
- **D20c. Assets are overlays, not graph genesis** — Opening-table and endgame-table assets may enrich, prioritize, or annotate the live object, but they do not replace graph generation.
- **D20d. Shared semantics at explicit boundaries** — Runtime-generated and asset-backed data may use different in-memory representations, but occurrences, transitions, anchors, salience, and provenance must normalize at explicit integration, review, or export boundaries so continuity remains representable without object swaps.
- **D20e. Stable identity across overlays and revisits** — Re-encountering the same position, occurrence, or anchored path across runtime generation and optional overlays preserves identity/continuity semantics instead of minting unrelated objects.
- **D20f. Project-owned optional truth surfaces** — Opening-table and endgame-table data live in project-owned, textual, inspectable formats that carry schema version, position key, continuation or terminal payload, weight/frequency/score fields, and provenance.
- **D20g. Imported and procedural outputs converge where they meet** — Imported opening/endgame records and live browser procedural outputs may keep separate runtime internals, but they must converge when compared, reviewed, or exported together.
- **D20h. Builder-only external ingestion boundary** — Foreign opening-book or tablebase formats may be read only by explicit builder commands such as `import-opening-book`, `import-endgame-table`, and `build-web-corpus`; they are never runtime truth surfaces.
- **D20i. Live legal-move generation is binding** — The viewer runtime expands legal moves from the current seed state rather than requiring a precomputed runtime corpus.
- **D20ia. Incremental camera/navigation-driven expansion is binding** — The live runtime expands legal moves on demand from the part of the graph that current camera/view navigation requires to render; focus changes may retarget demand, but generation may not depend on explicit click-to-expand interaction.
- **D20ib. Graph horizon and view scope are separate** — The amount of graph materialized in memory is independent from the currently visible neighborhood or camera scope; zoom does not cap how deep a pursued line may grow.
- **D20ic. Live graph store over immutable manifest** — The browser runtime owns a long-lived mutable graph store; startup bootstrap is only the first state of that store, not the immutable whole object.
- **D20id. Additive stable embedding** — Expanding one frontier may add coordinates for new nodes but may not perturb already-placed nodes during normal exploration.
- **D20ie. Camera-view-driven refinement is primary exploration** — Camera movement, zoom, and other navigation that would expose previously unseen local structure must be able to trigger generation and refinement directly; selecting a node may still retarget or accelerate exploration, but it is not a required prerequisite for graph growth.
- **D20if. Seed URLs may carry path pre-expansion** — A seed FEN or state key plus an optional move path may pre-grow a line before interactive exploration begins.
- **D20j. Bootstrap comes from explicit seed state** — Any live bootstrap derives from the current seed board state plus runtime configuration, never from fixture or exported corpus truth.
- **D20k. Fixture demotion is binding** — The existing fixture remains a unit-test or review input for identity, transposition, and DAG assembly checks and is excluded from required runtime graph genesis and settlement review.
- **D20l. Settlement hard-fails on bypass or fracture** — Bypassing live runtime generation with canned corpus truth, or fracturing identity/anchoring/navigation/query semantics, is a hard failure.
- **D20m. Versioned publication contracts remain required** — Shared serialized occurrence, transition, anchor, salience, and provenance records remain versioned and inspectable whenever they are published from browser or builder flows, even if the live in-memory store is viewer-owned.
- **D20n. Builder owns optional asset publication** — Opening-table and endgame-table import adapters, validation, sharding, provenance capture, and coverage metadata are builder responsibilities.
- **D20o. Runtime owns graph generation and exploration** — Runtime generates and grows the graph from the current seed state, resolves any optional assets, caches neighborhoods, and never substitutes phase-label inference or canned bootstrap truth for graph genesis.
- **D20p. Seed surfaces are runtime truth** — The runtime seed state, plus any explicitly requested path pre-expansion, is the truth surface for live graph genesis; any exported bootstrap artifact is convenience scaffolding only.
- **D20q. Focus presets are graph-backed** — Opening, middlegame, endgame, or equivalent focus presets derive from generated graph state, operate over the live graph store, and do not freeze later expansion; optional asset-backed anchors may refine but not replace them.
- **D20r. Exported artifact quarantine** — `artifacts/builder/bootstrap.json`, `artifacts/viewer/scene-manifest.json`, and related exported runtime artifacts are test/review or explicit comparison paths only and may not be the default live runtime source.
- **D20s. Builder schema authority applies to published artifacts only** — `tools/builder/src/chessviz_builder/contracts.py` remains authoritative for shared serialized occurrence, transition, anchor, salience, and provenance structures that are published or compared, but the live JS runtime may keep its own internal graph-store types and adapters.
- **D20t. Viewer mirror, live-store, and adapter split** — `apps/viewer/src/viewer/contracts.ts` mirrors published schemas, while the live graph store, incremental expander, seed/path bootstrap, and optional asset adapters live in dedicated viewer modules rather than inside `App.tsx`.
- **D20u. Runtime kernel is a query and indexing layer over the live store** — `apps/viewer/src/viewer/runtimeKernel.ts` queries the current graph and neighborhood surface; graph generation and optional asset loading happen outside the kernel, but the kernel must tolerate store growth without full-page restart.
- **D20v. Artifact harnesses stay quarantined** — Artifact-backed runtime loaders remain explicit comparison or review harnesses; the live viewer default is the JS-generated runtime.
- **D20w. Render-demand enumeration is a first-class runtime query** — The runtime must be able to determine the occurrence, edge, and LOD subset required for the current camera/view state quickly enough that enumeration itself does not become the gating bottleneck for generation or rendering.
- **D20x. Compressed shared-state residency is binding** — The live store may expose rich occurrence and render interfaces, but it must internally reuse heavy state through flyweight, pooled, shared, or otherwise compressed representation so large distant low-detail subsets remain feasible under budget while distinct occurrences stay distinct.
- **D20y. Detail demotion precedes identity loss** — When memory pressure rises, distant structure should first drop render detail or derived payload rather than collapsing occurrence identity; any deeper eviction or regeneration boundary must preserve deterministic continuity semantics.

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
- **O13. Runtime growth policy** — Per-expansion depth, pruning thresholds, and prioritization blend for live JS graph growth from a seed state or focused frontier.
- **O14. Cross-regime provenance exposure** — Which provenance fields stay runtime-visible versus review-only once all regimes emit the shared contract.
- **O15. Seed and frontier materialization granularity** — How much of the unified object is generated up front, how much may be pre-grown along a URL-provided path, and how much is expanded on demand around the current focus.
- **O16. Occurrence identity discriminant** — Whether live runtime occurrences should continue to store full path ancestry as an identity/provenance field, shift to a lighter discriminant such as `(parentOccurrenceId, moveUci)` with ancestry reconstructed on demand, or keep the current scheme if depth and payload costs stay acceptable, while preserving R2/R3 occurrence distinction and deterministic path pre-expansion.
- **O17. Live-store residency and compaction model** — Exact hot or warm or cold tiering, demotion, eviction, and regeneration boundaries for the compressed runtime store as camera demand changes.
- **O18. Focus-level and render-budget mapping** — Exact relationship between camera/view state, local ply horizon, parallel visible position budget, LOD selection, and declared render-demand enumeration targets.
