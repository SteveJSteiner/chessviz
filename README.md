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

- JS workspace uses pnpm with the viewer app at `apps/viewer`.
- Python builder uses uv with project files under `tools/builder`.

```bash
pnpm install
pnpm build:viewer
cd tools/builder && uv sync
cd tools/builder && uv run chessviz-builder env-check
```
