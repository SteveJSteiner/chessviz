# Artifact Boundary Contract

This directory declares the placeholder handoff between the builder and viewer during roadmap node N00.

- `artifacts/builder/bootstrap.json` is reserved for builder-owned canonical declarations, indices, and coarse guides.
- `artifacts/viewer/scene-manifest.json` is reserved for viewer-side runtime exploration configuration and coarse manifests, not fully baked final scene geometry.
- `CHESSVIZ_ARTIFACT_ROOT` may override the repository-local `artifacts/` root for builder-side tooling.
- `CHESSVIZ_STOCKFISH_BIN` and `CHESSVIZ_SYZYGY_DIR` remain optional external engine and tablebase inputs.

The files above are not generated yet; this contract only fixes their paths, ownership, and the offline-versus-runtime split.