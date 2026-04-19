import type { Vector3 } from './contracts';

export interface CameraOrbitState {
  azimuth: number;
  elevation: number;
}

export const CAMERA_ORBIT_LIMITS = {
  minElevation: -Math.PI,
  maxElevation: Math.PI,
  dragSensitivity: 0.0085,
  poleAvoidanceEpsilon: 1e-4
} as const;

export function deriveCameraOrbitState(offset: Vector3): CameraOrbitState {
  const radius = magnitude(offset);

  if (radius <= 1e-6) {
    return {
      azimuth: 0,
      elevation: 0
    };
  }

  return normalizeCameraOrbitState({
    azimuth: Math.atan2(offset[0], offset[2]),
    elevation: Math.asin(clampNumber(offset[1] / radius, -1, 1))
  });
}

export function advanceCameraOrbitState(
  orbitState: CameraOrbitState,
  deltaX: number,
  deltaY: number,
  sensitivity: number = CAMERA_ORBIT_LIMITS.dragSensitivity
): CameraOrbitState {
  return normalizeCameraOrbitState({
    azimuth: orbitState.azimuth - (deltaX * sensitivity),
    elevation: orbitState.elevation - (deltaY * sensitivity)
  });
}

export function resolveCameraLookVector(orbitState: CameraOrbitState): Vector3 {
  const normalizedOrbitState = normalizeCameraOrbitState(orbitState);
  const planarDistance = Math.cos(normalizedOrbitState.elevation);

  return normalizeVector([
    -(Math.sin(normalizedOrbitState.azimuth) * planarDistance),
    -Math.sin(normalizedOrbitState.elevation),
    -(Math.cos(normalizedOrbitState.azimuth) * planarDistance)
  ]);
}

export function normalizeCameraOrbitState(
  orbitState: CameraOrbitState
): CameraOrbitState {
  return {
    azimuth: wrapAngle(orbitState.azimuth),
    elevation: wrapAngle(orbitState.elevation)
  };
}

export function resolveOrbitCameraPosition(
  focus: Vector3,
  distance: number,
  orbitState: CameraOrbitState
): Vector3 {
  const clampedDistance = Math.max(distance, 0.1);
  const normalizedOrbitState = normalizeCameraOrbitState(orbitState);
  const clampedElevation = normalizedOrbitState.elevation;
  const planarDistance = clampedDistance * stabilizedCosine(clampedElevation);

  return [
    focus[0] + (Math.sin(normalizedOrbitState.azimuth) * planarDistance),
    focus[1] + (Math.sin(clampedElevation) * clampedDistance),
    focus[2] + (Math.cos(normalizedOrbitState.azimuth) * planarDistance)
  ];
}

export function resolveOrbitUpVector(orbitState: CameraOrbitState): Vector3 {
  const normalizedOrbitState = normalizeCameraOrbitState(orbitState);
  const { azimuth, elevation } = normalizedOrbitState;
  const upVector = [
    -(Math.sin(azimuth) * Math.sin(elevation)),
    Math.cos(elevation),
    -(Math.cos(azimuth) * Math.sin(elevation))
  ] satisfies Vector3;

  return normalizeVector(upVector);
}

export function resolveDetachedKeyboardOrbit(
  pressedKeys: ReadonlySet<string>,
  orbitState: CameraOrbitState,
  turnStep: number,
  pitchStep: number
): CameraOrbitState {
  let azimuth = orbitState.azimuth;
  let elevation = orbitState.elevation;

  if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) {
    azimuth += turnStep;
  }
  if (pressedKeys.has('d') || pressedKeys.has('arrowright')) {
    azimuth -= turnStep;
  }
  if (pressedKeys.has('q')) {
    elevation -= pitchStep;
  }
  if (pressedKeys.has('e')) {
    elevation += pitchStep;
  }

  if (azimuth === orbitState.azimuth && elevation === orbitState.elevation) {
    return orbitState;
  }

  return normalizeCameraOrbitState({
    azimuth,
    elevation
  });
}

export function resolveDetachedKeyboardTranslation(
  pressedKeys: ReadonlySet<string>,
  orbitState: CameraOrbitState,
  distance: number
): Vector3 | null {
  const step = Math.max(0.02, distance);
  const lookVector = resolveCameraLookVector(orbitState);
  let movement: Vector3 = [0, 0, 0];

  if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
    movement = addVector3(movement, scaleVector3(lookVector, step));
  }
  if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
    movement = addVector3(movement, scaleVector3(lookVector, -step));
  }

  return movement[0] === 0 && movement[1] === 0 && movement[2] === 0
    ? null
    : movement;
}

function magnitude(vector: Vector3) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function stabilizedCosine(angle: number) {
  const cosine = Math.cos(angle);
  if (Math.abs(cosine) >= CAMERA_ORBIT_LIMITS.poleAvoidanceEpsilon) {
    return cosine;
  }

  return Math.sign(cosine || 1) * CAMERA_ORBIT_LIMITS.poleAvoidanceEpsilon;
}

function normalizeVector(vector: Vector3): Vector3 {
  const length = magnitude(vector);
  if (length <= 1e-6) {
    return [0, 1, 0];
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function addVector3(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVector3(vector: Vector3, scale: number): Vector3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}