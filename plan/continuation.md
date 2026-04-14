# Continuation (File Contract: active node state only)

This file states the current active node, why it is current, and what must be true to settle it and advance.

## Current active node
- **Node:** N11g

## Why this is current
- Commit 3912b73 made the runtime pivot the plan had been missing: the live viewer now generates its graph in-browser from a seed state instead of depending on exported artifact truth.
- That pivot also exposed the next flaw in the way the plan had unfolded: the graph is still frozen at startup, so later focus changes only navigate a one-shot snapshot instead of growing the represented object.
- The follow-up re-plan corrected that sequencing mistake by inserting N11g and N11h ahead of N12 and N13, so N11g is now the earliest honest frontier.

## Settle-and-advance conditions
- The live viewer owns a long-lived browser-side graph store or expander rather than a one-shot startup snapshot.
- The default click or focus interaction on a non-terminal frontier occurrence triggers additional legal-move expansion without full-page restart.
- The resulting graph contains occurrences or transitions that were absent before the interaction.
- Returned deltas merge into the same represented object rather than replacing it with a fresh bootstrap.
- A commit records N11g settlement and updates both `plan/completion-log.md` and this file to N11h.

## Advancement rule
- Formal frontier events are tracked in `plan/completion-log.md` against the commit that records the exact continuation state transition.
