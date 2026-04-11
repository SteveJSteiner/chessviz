export interface ViewerRenderTuning {
  nodeRadiusScale: number;
  carrierThicknessScale: number;
  carrierHaloOpacityScale: number;
  labelScale: number;
}

export const DEFAULT_VIEWER_RENDER_TUNING: ViewerRenderTuning = {
  nodeRadiusScale: 1,
  carrierThicknessScale: 0.2,
  carrierHaloOpacityScale: 1,
  labelScale: 0.35
};

export function clampViewerRenderTuning(
  tuning: ViewerRenderTuning
): ViewerRenderTuning {
  return {
    nodeRadiusScale: clampNumber(tuning.nodeRadiusScale, 0.65, 1.4),
    carrierThicknessScale: clampNumber(tuning.carrierThicknessScale, 0.08, 0.8),
    carrierHaloOpacityScale: clampNumber(tuning.carrierHaloOpacityScale, 0, 1.5),
    labelScale: clampNumber(tuning.labelScale, 0.12, 0.8)
  };
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}