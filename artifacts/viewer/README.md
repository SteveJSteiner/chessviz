# Viewer Artifact Boundary

This directory holds viewer-owned manifests and review artifacts generated over the builder-owned bootstrap surface.

- `scene-manifest.json` remains the runtime scene/bootstrap manifest consumed by the viewer.
- `review/` is reserved for deterministic viewer review artifacts generated from the current fixture manifests, including the N10b/N10c carrier legibility views and the N11 camera-grammar review surface.
- Regenerate the review artifacts with `pnpm --filter viewer review:artifacts`.
- Human verdict notes must still be recorded manually before the active visual node can be settled.