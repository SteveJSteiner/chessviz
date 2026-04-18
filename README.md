# chessviz

Traversal-first chess-space viewer.

The repository is now centered on one live slice:

- browser-generated graph growth from a seed FEN or state
- detached camera flight through the object
- geometry-led reading of move family, forcing pressure, capture breaks, and salience
- board panel as confirmation, not as the primary interface

## Plan files

- `plan/requirements.md` — requirements only.
- `plan/decisions.md` — locked decisions for the live slice.
- `plan/roadmap.md` — only the remaining work nodes.
- `plan/acceptance.md` — simple pass/fail checks for the slice.
- `plan/completion-log.md` — frontier history.
- `plan/continuation.md` — current active node.

## Commands

```bash
./setup_env.sh
pnpm install
pnpm --filter viewer dev
pnpm --filter viewer build
pnpm --filter viewer check
```
