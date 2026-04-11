# chessviz

Planning artifacts for a continuous, zoomable chess-space visualization represented as a DAG-backed 3D object.

## Plan files

- `plan/requirements.md` — requirements only.
- `plan/decisions.md` — decisions only.
- `plan/roadmap.md` — DAG-partitioned work and sequence only.
- `plan/acceptance.md` — measurable acceptance checks and budgets.
- `plan/completion-log.md` — concise one-line frontier events.
- `plan/continuation.md` — current active node and settle/advance conditions.

## Environment bootstrap

- Preferred: run `./setup_env.sh` from the repository root.
- JS workspace uses pnpm with the viewer app at `apps/viewer`.
- Python builder uses uv with project files under `tools/builder`.
- Shared artifact boundaries live under `artifacts/`.

## Module boundaries

- Viewer scene bootstrap lives in `apps/viewer/src/viewer/bootstrap.ts`.
- Viewer navigation entrypoints live in `apps/viewer/src/viewer/navigation.ts`.
- Viewer owns runtime exploration, camera-driven refinement, and anchored entrypoints over the shared object.
- Viewer may consume coarse manifests and canonical guides from `artifacts/viewer/scene-manifest.json`, but it is not limited to fully baked scene geometry.
- Builder occurrence identity, ingestion, DAG assembly, labeling seam, and embedding seam live under `tools/builder/src/chessviz_builder/`.
- Builder owns canonical structure, relation, and coarse-guide artifacts under `artifacts/builder/bootstrap.json`; it does not define the final authoritative render at all zooms.

```bash
./setup_env.sh

# manual steps
pnpm install
pnpm build:viewer
pnpm check:workspace
cd tools/builder && uv sync
cd tools/builder && uv run chessviz-builder env-check
```
