# Viewer Artifact Boundary

This directory holds viewer-owned manifests and review artifacts generated over the builder-owned bootstrap surface.

- `scene-manifest.json` remains the runtime scene/bootstrap manifest consumed by the viewer.
- `review/` is reserved for deterministic N10b review artifacts generated from the current fixture manifests.
- Regenerate the review artifacts with `pnpm --filter viewer review:artifacts`.
- Human verdict notes must still be recorded manually before N10b can be settled.