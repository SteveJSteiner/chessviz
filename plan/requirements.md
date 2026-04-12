# Requirements (File Contract: requirements only)

This file contains only normative requirements. It must not include implementation plans, sequencing, or design decisions.

## 1. Purpose

The visualization shall make the visual object itself primary. It shall not treat summary diagrams, labels, or explanatory overlays as the main artifact.

The system shall represent chess as a single continuous zoomable object in which local board detail and large-scale branching structure are parts of the same thing.

## 2. Unit of representation

- **R1.** The minimum resolved unit shall be a board occurrence, not merely an abstract board state.
- **R2.** A board occurrence shall be able to remain distinct from other occurrences that share the same board state when their path context differs.
- **R3.** Shared board state shall be representable as a relation or shared dimension across occurrences, rather than forcing immediate collapse to a single point.

## 3. Continuity of the object

- **R4.** Zoom shall not swap the user into a different diagram family. The object shall remain continuous across zoom.
- **R5.** Zoom shall change focus, emphasis, and legibility, not ontology.
- **R6.** Large branches, local detail, and intermediate structure shall remain parts of the same object, even when some scales are softened and others sharpened.
- **R7.** A single camera viewpoint shall be able to hold both nearby detail and some distal branching context at the same time.

## 4. Path and graph structure

- **R8.** A single game shall be representable as a continuous path.
- **R9.** The whole space of games shall be representable as a graph of such paths, with fan-out and fan-in preserved.
- **R10.** The representation shall support both forward branching from the initial position and backward convergence toward terminal outcomes.
- **R11.** Major regime changes, especially captures, shall be visually legible as strong departures in path behavior.

## 5. Edge path semantics

- **R12.** Edge paths shall act as multiscale carriers of move information, not merely as adjacency routes.
- **R13.** At least one coarse semantic band shall be encoded in edge geometry itself so that move-family distinctions remain legible at structure-level zoom.
- **R14.** Finer semantic bands may be encoded through bounded geometric modulation, surface treatment, or both, but shall never overturn the coarse semantic reading established by the lower band.
- **R15.** Zooming in shall reveal additional path information monotonically: closer views may add tactical or contextual residue, but shall not reverse or contradict the move-family reading available from farther views.
- **R16.** Semantic families shall be assigned stable representational jobs by scale. Different scales shall not redundantly or arbitrarily encode the same feature family.
- **R17.** Edge-path deviation from the global object grammar shall be bounded. Local move-specific encoding shall not destroy the continuity, global orientation, or one-object ontology of the visualization.
- **R18.** The representation shall preserve a distinction between centerline geometry, local frame/twist orientation, and surface-level treatment.
- **R19.** The implementation may use one or more of those channels, but shall keep their semantic jobs stable across the represented subset.

## 6. Width versus depth

- **R20.** The visualization shall treat width and depth as distinct.
- **R21.** Width shall arise from the large number of still-distinguishable alternatives at roughly similar stage, including both distinct piece sets and distinct configurations within a piece set.
- **R22.** Game length shall not be treated as the primary source of visual complexity.

## 7. Salience

- **R23.** All legal positions may exist in the represented space, but visual mass shall not be allocated uniformly.
- **R24.** More salient paths shall remain legible at coarser zoom levels.
- **R25.** Less salient but still legal structure shall remain available at close zoom rather than dominating the large-scale view.
- **R26.** Salience shall be able to affect thickness, persistence across zoom, brightness, or other optical weight without removing legality from the underlying object.

## 8. Coarse organization by region of chess

- **R27.** The visualization shall support an opening region in which named openings compress large amounts of otherwise irrelevant local noise.
- **R28.** The visualization shall support a middlegame region in which organization can rely on piece set or material signature when opening names no longer organize the space well.
- **R29.** The visualization shall support an endgame region in which terminal structure and piece-taking make large-scale routing especially legible.

## 9. Terminal structure

- **R30.** The endgame side shall support convergence toward three terminal outcome classes: White win, Draw, Black win.
- **R31.** The path toward terminal outcomes shall be visually readable at coarse scale.
- **R32.** Capture-driven simplification shall be able to produce coarse large-scale branching that remains visibly connected to fine-scale occurrence structure.

## 10. Focused rendering

- **R33.** The system need not render the entire space of chess as one always-legible picture.
- **R34.** It shall be possible to render any chosen anchored view legibly.
- **R35.** At minimum, anchored views shall include:
  - an opening-focused view,
  - a middlegame/material-focused view,
  - an endgame/terminal-focused view.
- **R36.** Any anchored view shall still behave as a view into the same underlying object rather than as an unrelated substitute graphic.

## 11. Camera behavior

- **R37.** Camera movement shall afford navigation through the object rather than mere inspection of a static diagram.
- **R38.** The camera shall be able to move so that detail comes into and out of focus continuously.
- **R39.** The camera shall support reading entailed path direction toward later structure and terminal pull.

## 12. Spatial geometry

- **R40.** The visualization shall be three-dimensional.
- **R41.** The visualization shall use some form of hyperbolic projection or hyperbolic-style embedding.
- **R42.** The purpose of the hyperbolic projection shall be to keep the high branching factor, especially in the middlegame, legible under navigation and zoom.
- **R43.** The geometry shall allow a single camera viewpoint to hold both local path detail and larger branching context simultaneously.

## 13. Unified regime representation

- **R44.** The visualization shall represent opening, middlegame, and endgame as one continuous represented object rather than three substitute objects.
- **R45.** Distinct backing regimes shall normalize into a common representation contract for occurrence, transition, anchor, salience, and provenance so they inhabit the same represented structure.
- **R46.** Crossing regime boundaries shall preserve occurrence identity, anchored-path continuity, navigation semantics, and query semantics.
- **R47.** Regime selection shall remain an internal substrate mechanism and shall not require the user to switch visualizer, object instance, mode, or mental model.
- **R48.** When the same position or anchored path is encountered across regime boundaries, the system shall preserve stable identity and continuity semantics rather than reintroducing it as a new unrelated object.
- **R49.** The represented subset shall distinguish three internal backing regimes: opening-table, middlegame-procedural, and endgame-table.
- **R50.** Positions inside declared opening coverage shall be served from opening-table assets.
- **R51.** Positions inside declared supported terminal-material coverage shall be served from endgame-table assets.
- **R52.** Positions outside opening-table and endgame-table coverage shall be expanded live by a middlegame-procedural path rather than by a precomputed middlegame lookup corpus.
- **R53.** Opening-table and endgame-table support shall come from project-owned, inspectable, web-ready assets rather than from foreign binary formats at runtime.
- **R54.** External binary opening-book or tablebase formats may exist as ingestion inputs, but they shall not be the browser/runtime truth surface.
- **R55.** The builder fixture shall remain a test-only input and shall not act as the runtime corpus, bootstrap source, or settlement review surface.
- **R56.** Acceptance of regime-spanning navigation shall verify continuity of the represented object when exploration crosses opening, middlegame, and endgame boundaries.

## 14. Non-requirements

- **R57.** The visualization is not required to be a literal time spiral.
- **R58.** The visualization is not required to use unconstrained self-similar fractal geometry as a primary encoding method.
- **R59.** The visualization is not required to force all state identity into a single collapsed node view.
