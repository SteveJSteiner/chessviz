# N12 Live Review Notes

This file records human review for the live N12 anchored-entrypoint pass.

## Review context
- date: 2026-04-12
- scope: live viewer behavior in whole-object scope over the current regime-backed graph
- graph size: 118 occurrences, 111 edges
- exercised entrypoints: opening, middlegame, endgame

## Verdict
- the current whole-object view provides full visibility over the present graph instead of collapsing the review to a small local window
- switching between opening, middlegame, and endgame entrypoints still reads as one object rather than three substitute diagrams
- the current graph is smaller than the eventual larger-scale acceptance target, but this pass materially increases confidence in the one-object visual continuity required for N12

## Observed issue
- initial opening moves in whole-object scope are visible as paths, but their move labels are not positioned near those paths, so the earliest branches read as effectively unlabeled at object scale
- this is a real label-placement problem to carry forward, but it does not change the underlying anchored-entrypoint identity read from the current pass

## Limits of this review
- this review is over the current 118-node regime-backed graph, not a later larger-scale runtime corpus
- this review does not settle later operational acceptance around large-scale label density, full performance budgets, or future scale targets
- this review does not settle transposition relation rendering, which belongs to N13

## Settlement note
- N12 settled from this review: yes
- follow-on issue remains open: yes, initial-move label placement in whole-object scope
- next evidence needed: proceed to N13 transposition relation rendering, then N14 operational acceptance over the later larger-scale runtime surfaces