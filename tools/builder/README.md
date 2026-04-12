# chessviz-builder

Minimal uv-managed Python project for environment validation during roadmap node N00a.

## Placeholder seams

- `state_key.py` defines stable board-state keys independent of corpus labels or salience metadata.
- `occurrence_identity.py` defines stable occurrence ids.
- `corpus_ingest.py` loads a declared corpus fixture and converts each game into a continuous occurrence path.
- `OccurrenceTransition` records now carry canonical move facts so later geometry rules do not need to reconstruct captures, castling, or check status from scratch.
- `repeated_state.py` builds the repeated-state relation index and query surface over ingested occurrences.
- `dag.py` builds the occurrence DAG artifact and exposes adjacency plus fan-in/fan-out metrics.
- `labeling.py` attaches coarse phase/material label records and query surfaces over occurrence ids without changing occurrence identity or DAG topology.
- `terminal_labeling.py` attaches W/D/L labels and stable terminal anchor ids to declared terminal occurrences without collapsing occurrence identity.
- `salience.py` attaches normalized salience scores and runtime priority hints over the occurrence graph using deterministic builder-side signals.
- `embedding.py` attaches deterministic hyperbolic-style coarse coordinates and queryable embedding records over the occurrence graph.
- `opening_table.py` normalizes builder-only opening import sources into project-owned continuation shards and coverage manifests.
- `endgame_table.py` normalizes builder-only endgame import sources into project-owned terminal-evaluation shards and coverage manifests.
- `publication.py` owns canonical JSON hashing/writing so published table assets remain deterministic.
- `pipeline.py` wires the placeholder modules together for env-check validation.

## Builder versus runtime

- Builder is responsible for canonical structure, relation indices, declarations, and coarse guides.
- Runtime rendering is responsible for neighborhood query, cache behavior, and local refinement under camera motion.
- Builder artifacts are therefore inputs to runtime exploration, not a fully baked final scene.
- Repeated-state and transposition structures should be exposed as query surfaces for runtime use, not only as overlay exports.

## Declared corpus fixture

- The initial declared corpus fixture lives at `tools/builder/fixtures/initial_corpus.json`.
- Its declaration fields are `source_name`, `version`, and `location`, matching the N01 acceptance contract.

## Fixture checks

```bash
uv run python -m unittest discover -s tests
uv run chessviz-builder export-fixture-artifacts
uv run chessviz-builder build-web-corpus --opening-source /path/to/opening-import.json --endgame-source /path/to/endgame-import.json
```

## Usage

```bash
uv sync
uv run chessviz-builder env-check
uv run chessviz-builder export-fixture-artifacts
uv run chessviz-builder import-opening-book --source /path/to/opening-import.json
uv run chessviz-builder import-endgame-table --source /path/to/endgame-import.json
uv run chessviz-builder build-web-corpus --opening-source /path/to/opening-import.json --endgame-source /path/to/endgame-import.json
```

`CHESSVIZ_ARTIFACT_ROOT` now scopes fixture bootstrap output and the N11d opening/endgame/web-corpus publication surfaces together.
