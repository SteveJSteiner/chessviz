import type { Vector3 } from './contracts';

export interface CameraOrbitState {
  azimuth: number;
  elevation: number;
}

export const CAMERA_ORBIT_LIMITS = {
  minElevation: -(Math.PI * 0.38),
  maxElevation: Math.PI * 0.44,
  dragSensitivity: 0.0085
} as const;

export function deriveCameraOrbitState(offset: Vector3): CameraOrbitState {
  const radius = magnitude(offset);

  if (radius <= 1e-6) {
    return {
      azimuth: 0,
      elevation: 0
    };
  }

  return {
    azimuth: Math.atan2(offset[0], offset[2]),
    elevation: clampNumber(
      Math.asin(clampNumber(offset[1] / radius, -1, 1)),
      CAMERA_ORBIT_LIMITS.minElevation,
      CAMERA_ORBIT_LIMITS.maxElevation
    )
  };
}

export function advanceCameraOrbitState(
  orbitState: CameraOrbitState,
  deltaX: number,
  deltaY: number,
  sensitivity: number = CAMERA_ORBIT_LIMITS.dragSensitivity
): CameraOrbitState {
  return {
    azimuth: orbitState.azimuth - (deltaX * sensitivity),
    elevation: clampNumber(
      orbitState.elevation - (deltaY * sensitivity),
      CAMERA_ORBIT_LIMITS.minElevation,
      CAMERA_ORBIT_LIMITS.maxElevation
    )
  };
}

export function resolveOrbitCameraPosition(
  focus: Vector3,
  distance: number,
  orbitState: CameraOrbitState
): Vector3 {
  const clampedDistance = Math.max(distance, 0.1);
  const clampedElevation = clampNumber(
    orbitState.elevation,
    CAMERA_ORBIT_LIMITS.minElevation,
    CAMERA_ORBIT_LIMITS.maxElevation
  );
  const planarDistance = clampedDistance * Math.cos(clampedElevation);

  return [
    focus[0] + (Math.sin(orbitState.azimuth) * planarDistance),
    focus[1] + (Math.sin(clampedElevation) * clampedDistance),
    focus[2] + (Math.cos(orbitState.azimuth) * planarDistance)
  ];
}

function magnitude(vector: Vector3) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}