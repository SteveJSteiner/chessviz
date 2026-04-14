# N13 Review Notes

Use this file as the human verdict record for the live N13 interactive review.
Do not answer the transposition-legibility question from the static SVG artifacts alone; they are supporting evidence only.

## Run context
- graphObjectId: initial-represented-subset:2026-04-11-fixture-004
- sceneId: runtime-exploration-fixture
- graphOccurrenceCount: 118
- graphEdgeCount: 111
- scaleGate: insufficient for the requested 1000+ node live-view threshold (118 total nodes in current artifact set)
- opening anchor: occ-27e2be7f2bf706c6 · Initial position · ply 0 · radius 3 · distance 5.0
- middlegame anchor: occ-25c32c2bc0227f68 · 1. e4 subtree · ply 8 · radius 2 · distance 4.2
- endgame anchor: occ-50c5276a269f4c53 · 1. Nc3 subtree · ply 35 · radius 3 · distance 3.3
- transpositionStateKey: rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -
- transpositionOccurrenceCount: 2
- transpositionFocusNode: ply 6 · middlegame · white[Q1,R2,B2,N2,P8]|black[Q1,R2,B2,N2,P8]
- transpositionFocusTurn: White to move
- transpositionLocalRadius: 1
- transpositionLocalDistance: 3.2
- transpositionWholeObjectDistance: 5.0
- transpositionLocalOffViewEchoes: 1
- transpositionWholeObjectLinks: 1

## Required live review
- start from the known repeated-state focus recorded above or select that occurrence from the focus menu in the live viewer
- inspect both local-neighborhood scope and whole-object scope in one session before recording the verdict
- drag on the canvas to orbit and use scroll or the distance slider to test whether the stitched relation stays readable across camera changes
- switch across the opening, middlegame, and endgame entrypoints before and after inspecting the repeated-state focus to confirm the relation still reads as part of the same shared object
- click the repeated occurrence cards or echo nodes to confirm the viewer changes focus without merging occurrence identity
- record screenshots or screen capture from the live viewer after the interactive pass

## Supporting artifacts
- review/transposition-relations.svg
- review/anchored-entrypoints.svg
- review/structure-zoom.svg
- review/refinement-steps.svg
- review/camera-grammar.svg

## Reviewer
- name:
- date:

## Relation verdict
- the known repeated state rendered as multiple occurrences rather than collapsing into a single node:
- the stitched relation stayed readable in whole-object scope:
- the local-neighborhood view surfaced the off-view echo without losing the focused occurrence as the primary anchor:
- switching entrypoints or focusing the repeated sibling still read as one shared object rather than a detached overlay:

## Carryover checks
- orbiting still kept the focused repeated position legible while preserving the surrounding branch context:
- zooming closer still changed only legibility and emphasis, not occurrence identity or regime continuity:
- zooming back out still kept the repeated-state relation visible enough to track without introducing a regime seam:
- what still needs iteration:

## Settlement note
- N13 settled: no / yes
- if yes, reference the commit that updates plan/completion-log.md and plan/continuation.md

Do not mark N13 settled without recorded human review.