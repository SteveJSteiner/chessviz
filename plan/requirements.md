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

## 5. Width versus depth

- **R12.** The visualization shall treat width and depth as distinct.
- **R13.** Width shall arise from the large number of still-distinguishable alternatives at roughly similar stage, including both distinct piece sets and distinct configurations within a piece set.
- **R14.** Game length shall not be treated as the primary source of visual complexity.

## 6. Salience

- **R15.** All legal positions may exist in the represented space, but visual mass shall not be allocated uniformly.
- **R16.** More salient paths shall remain legible at coarser zoom levels.
- **R17.** Less salient but still legal structure shall remain available at close zoom rather than dominating the large-scale view.
- **R18.** Salience shall be able to affect thickness, persistence across zoom, brightness, or other optical weight without removing legality from the underlying object.

## 7. Coarse organization by region of chess

- **R19.** The visualization shall support an opening region in which named openings compress large amounts of otherwise irrelevant local noise.
- **R20.** The visualization shall support a middlegame region in which organization can rely on piece set or material signature when opening names no longer organize the space well.
- **R21.** The visualization shall support an endgame region in which terminal structure and piece-taking make large-scale routing especially legible.

## 8. Terminal structure

- **R22.** The endgame side shall support convergence toward three terminal outcome classes: White win, Draw, Black win.
- **R23.** The path toward terminal outcomes shall be visually readable at coarse scale.
- **R24.** Capture-driven simplification shall be able to produce coarse large-scale branching that remains visibly connected to fine-scale occurrence structure.

## 9. Focused rendering

- **R25.** The system need not render the entire space of chess as one always-legible picture.
- **R26.** It shall be possible to render any chosen anchored view legibly.
- **R27.** At minimum, anchored views shall include:
  - an opening-focused view,
  - a middlegame/material-focused view,
  - an endgame/terminal-focused view.
- **R28.** Any anchored view shall still behave as a view into the same underlying object rather than as an unrelated substitute graphic.

## 10. Camera behavior

- **R29.** Camera movement shall afford navigation through the object rather than mere inspection of a static diagram.
- **R30.** The camera shall be able to move so that detail comes into and out of focus continuously.
- **R31.** The camera shall support reading entailed path direction toward later structure and terminal pull.

## 11. Spatial geometry

- **R32.** The visualization shall be three-dimensional.
- **R33.** The visualization shall use some form of hyperbolic projection or hyperbolic-style embedding.
- **R34.** The purpose of the hyperbolic projection shall be to keep the high branching factor, especially in the middlegame, legible under navigation and zoom.
- **R35.** The geometry shall allow a single camera viewpoint to hold both local path detail and larger branching context simultaneously.

## 12. Non-requirements

- **R36.** The visualization is not required to be a literal time spiral.
- **R37.** The visualization is not required to use fractality to represent unbounded temporal length.
- **R38.** The visualization is not required to force all state identity into a single collapsed node view.
