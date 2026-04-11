# chessviz-builder

Minimal uv-managed Python project for environment validation during roadmap node N00a.

## Placeholder seams

- `state_key.py` defines stable board-state keys independent of corpus labels or salience metadata.
- `occurrence_identity.py` defines stable occurrence ids.
- `corpus_ingest.py` defines the declared-corpus ingestion seam.
- `dag.py` defines the DAG assembly seam.
- `labeling.py` and `embedding.py` mark later-node extension points.
- `pipeline.py` wires the placeholder modules together for env-check validation.

## Fixture checks

```bash
uv run python -m unittest discover -s tests
```

## Usage

```bash
uv sync
uv run chessviz-builder env-check
```
