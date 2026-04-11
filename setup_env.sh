#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

echo "[setup] verifying required tools"
command -v node >/dev/null 2>&1 || { echo "[setup] missing required tool: node" >&2; exit 1; }
command -v corepack >/dev/null 2>&1 || { echo "[setup] missing required tool: corepack" >&2; exit 1; }
command -v uv >/dev/null 2>&1 || { echo "[setup] missing required tool: uv" >&2; exit 1; }

echo "[setup] enabling corepack"
corepack enable

echo "[setup] installing JavaScript dependencies"
pnpm install

echo "[setup] building viewer"
pnpm build:viewer

echo "[setup] syncing Python builder environment"
(
  cd tools/builder
  uv sync
)

echo "[setup] running builder env-check"
(
  cd tools/builder
  uv run chessviz-builder env-check
)

echo "[setup] environment setup complete"
