# N11 Live Review Notes

This file records intermediate human review for the live N11 camera-grammar work.

## Review context
- date: 2026-04-11
- scope: live viewer camera-grammar behavior over the current opening fixture set
- focus fixture: QCD Bogo-Indian A
- focus occurrence: initial position
- reproduction: at neighborhood radius 4, moving view distance from 4.6 to 4.7 causes the local edge set to jump instead of changing continuously

## Initial failure logged
- this is a known failure to fix in the current branch; the behavior is logged here rather than treated as resolved
- the local edges do not reveal monotonically across the 4.6 -> 4.7 distance transition for QCD Bogo-Indian A at the initial position
- the jump reads as a continuity break in the live camera grammar rather than an acceptable label-density or detail-band transition

## Failed commitments
- requirement R4: zoom shall not swap the user into a different diagram family
- requirement R5: zoom shall change focus, emphasis, and legibility, not ontology
- requirement R15: zooming in shall reveal additional path information monotonically
- acceptance A2: ontology continuity across zoom
- acceptance A12: runtime local refinement continuity

## Follow-up verification
- date: 2026-04-11
- verified commit: 5c0978a
- live result: at neighborhood radius 4, moving view distance from 4.6 to 4.7 no longer changes local node or edge membership
- reviewer note: the nodes do not jump, and the coarse read stays intact while closer zoom adds detail on the same object

## Settlement note
- N11 settled from this review: yes
- failure remains open: no
- next evidence needed: proceed to anchored entrypoint review under N12