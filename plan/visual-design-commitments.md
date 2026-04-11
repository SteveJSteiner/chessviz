# Visual Design Commitments (File Contract: locked visual rendering commitments only)

This file contains binding visual design commitments for the live viewer and review artifacts. These commitments have the same authority as the other `plan/` artifacts and change only in a planning commit.

## 1. The geometry is the visualization.

The carrier ribbons, node positions, and embedding coordinates are the primary visual object. Everything else, including labels, boards, panels, and legends, exists only to make the geometry readable, not to replace it. If a viewer can remove the geometry panel and still understand the chess content from the sidebar alone, the design has failed.

## 2. Labels live on the data, not beside it.

Move names belong on or adjacent to the carrier paths they describe. Game names belong at root nodes. Terminal outcomes belong at terminal nodes. Do not create a separate legend, table, or panel that duplicates what a label on the data would accomplish. When a label must exist in a sidebar, such as the board reference, it is reference material, not the primary reading surface.

## 3. Zoom reveals, never overturns.

At structure zoom, only move-family distinctions and game identity should be visible. At medium zoom, tactical labels and carrier texture appear. At close zoom, contextual residue, branching density, and fine detail emerge. A reading established at a coarser zoom must never be contradicted by information revealed at a finer zoom. This applies to both geometry and labels.

## 4. In the live viewer, labels participate in the zoom-monotone reveal.

Label opacity and visibility respond to camera distance rather than remaining permanently present. Move names on distant edges fade. Game names at roots remain visible longer. The board sidebar is detail-on-demand, not always on. Static SVG review artifacts may be denser because they are fixed frames, but the live viewer must not behave like a static SVG.

## 5. No second representation.

Do not render a move-list panel, a game-tree diagram, a PGN viewer, or any other parallel chess representation alongside the geometric object. The board sidebar is the one allowed secondary view, and it shows the state of a single focused node without narrating the game. If the viewer starts containing two ways to read the same information, one becomes the real interface and the geometry becomes wallpaper.

## 6. Every visual channel has one semantic job.

Centerline curvature encodes move family. Color hue on carriers encodes interaction class. Node size encodes salience. Phase determines node color. Terminal outcome determines terminal node color. These assignments are stable. Do not reuse a channel for a second meaning. Do not encode the same meaning in two channels redundantly unless one is a backup for accessibility.

## 7. Chrome is suspect by default.

Ground rings, decorative ellipses, panel borders, gradient backgrounds, and explanatory legends are chrome. They may exist in review artifacts for communication purposes. They should not exist in the live viewer unless they solve a specific legibility problem. Before adding any non-data visual element, name the legibility problem it solves. If the problem cannot be named, do not add the element.

## 8. The board sidebar is a reference check, not the interface.

The board renders the FEN of the focused node. It shows pieces, side to move, and castling rights. It should be collapsible. It should not contain move lists, evaluation bars, opening names, or anything else that would make it an independent chess viewer. Its job is: yes, this is the position the geometry is showing you. When it is collapsed, the geometry plus on-path labels must still be fully readable.

## 9. Label density must scale with branching factor.

The current fixture has shallow local branching. Real chess positions have far higher branching. At higher branching factor, showing every move label simultaneously creates visual noise. The live viewer therefore requires a label-density strategy: show labels for the top-k salient edges, show labels on hover or proximity for the rest, fade labels by salience, or an equivalent policy that keeps geometry primary. This is mandatory.

## 10. Aesthetics serve legibility, not the reverse.

The warm parchment palette, serif headings, and rounded-rect labels are acceptable only because they reduce fatigue and make the object feel intentional. If an aesthetic choice reduces legibility, whether through low contrast, decorative competition, or interface duplication, the aesthetic choice loses.