# Artifact Boundary Contract

This directory declares the placeholder handoff between the builder and viewer during roadmap node N00.

- `artifacts/builder/bootstrap.json` is reserved for builder-owned bootstrap metadata.
- `artifacts/viewer/scene-manifest.json` is reserved for viewer-ready scene metadata.
- `CHESSVIZ_ARTIFACT_ROOT` may override the repository-local `artifacts/` root for builder-side tooling.
- `CHESSVIZ_STOCKFISH_BIN` and `CHESSVIZ_SYZYGY_DIR` remain optional external engine and tablebase inputs.

The files above are not generated yet; this contract only fixes their paths and ownership.