# chessviz-builder

Minimal uv-managed Python project for environment validation during roadmap node N00a.

## Placeholder seams

- `state_key.py` defines stable board-state keys independent of corpus labels or salience metadata.
- `occurrence_identity.py` defines stable occurrence ids.
- `corpus_ingest.py` loads a declared corpus fixture and converts each game into a continuous occurrence path.
- `dag.py` defines the DAG assembly seam.
- `labeling.py` and `embedding.py` mark later-node extension points.
- `pipeline.py` wires the placeholder modules together for env-check validation.

## Builder versus runtime

- Builder is responsible for canonical structure, relation indices, declarations, and coarse guides.
- Runtime rendering is responsible for neighborhood query, cache behavior, and local refinement under camera motion.
- Builder artifacts are therefore inputs to runtime exploration, not a fully baked final scene.

## Declared corpus fixture

- The initial declared corpus fixture lives at `tools/builder/fixtures/initial_corpus.json`.
- Its declaration fields are `source_name`, `version`, and `location`, matching the N01 acceptance contract.

## Fixture checks

```bash
uv run python -m unittest discover -s tests
```

## Usage

```bash
uv sync
uv run chessviz-builder env-check
```
