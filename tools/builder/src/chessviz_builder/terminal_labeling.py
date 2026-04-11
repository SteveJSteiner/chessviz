"""Terminal W/D/L labeling and anchor grouping for declared terminal games."""

from __future__ import annotations

from .contracts import IngestedCorpus, TerminalLabelQuerySurface, TerminalLabelRecord

WHITE_WIN_OUTCOME = "white-win"
DRAW_OUTCOME = "draw"
BLACK_WIN_OUTCOME = "black-win"

WHITE_WIN_WDL = "W"
DRAW_WDL = "D"
BLACK_WIN_WDL = "L"

_OUTCOME_TO_WDL = {
    WHITE_WIN_OUTCOME: WHITE_WIN_WDL,
    DRAW_OUTCOME: DRAW_WDL,
    BLACK_WIN_OUTCOME: BLACK_WIN_WDL,
}


class TerminalOutcomeLabeler:
    def label(self, ingested_corpus: IngestedCorpus) -> TerminalLabelQuerySurface:
        return TerminalLabelQuerySurface.from_records(
            TerminalLabelRecord(
                occurrence_id=game.final_occurrence.occurrence_id,
                wdl_label=_OUTCOME_TO_WDL[game.declared_terminal_outcome],
                outcome_class=game.declared_terminal_outcome,
                anchor_id=_terminal_anchor_id(game.declared_terminal_outcome),
            )
            for game in ingested_corpus.games
            if game.declared_terminal_outcome is not None
        )


def _terminal_anchor_id(outcome_class: str) -> str:
    return f"terminal:{outcome_class}"