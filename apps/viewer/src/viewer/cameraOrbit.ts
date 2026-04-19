import type { Vector3 } from './contracts';

export interface CameraOrbitState {
  azimuth: number;
  elevation: number;
  roll?: number;
}

export interface DetachedKeyboardTranslationIntent {
  lateral: number;
  vertical: number;
  forward: number;
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
      elevation: 0,
      roll: 0
    };
  }

  return normalizeCameraOrbitState({
    azimuth: Math.atan2(offset[0], offset[2]),
    elevation: Math.asin(clampNumber(offset[1] / radius, -1, 1)),
    roll: 0
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
    elevation: orbitState.elevation - (deltaY * sensitivity),
    roll: orbitState.roll ?? 0
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

export function resolveCameraRightVector(orbitState: CameraOrbitState): Vector3 {
  const lookVector = resolveCameraLookVector(orbitState);
  const upVector = resolveOrbitUpVector(orbitState);

  return normalizeVector(crossProduct(lookVector, upVector));
}

export function resolveCameraSetPoint(
  position: Vector3,
  orbitState: CameraOrbitState,
  distance: number
): Vector3 {
  return addVector3(
    position,
    scaleVector3(resolveCameraLookVector(orbitState), Math.max(distance, 0.1))
  );
}

export function normalizeCameraOrbitState(
  orbitState: CameraOrbitState
): CameraOrbitState {
  return {
    azimuth: wrapAngle(orbitState.azimuth),
    elevation: wrapAngle(orbitState.elevation),
    roll: wrapAngle(orbitState.roll ?? 0)
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
  const baseUpVector = [
    -(Math.sin(azimuth) * Math.sin(elevation)),
    Math.cos(elevation),
    -(Math.cos(azimuth) * Math.sin(elevation))
  ] satisfies Vector3;

  const lookVector = resolveCameraLookVector(normalizedOrbitState);
  const rolledUpVector = rotateVectorAroundAxis(
    baseUpVector,
    lookVector,
    normalizedOrbitState.roll ?? 0
  );

  return normalizeVector(rolledUpVector);
}

export function resolveDetachedKeyboardOrbit(
  pressedKeys: ReadonlySet<string>,
  orbitState: CameraOrbitState,
  turnStep: number,
  pitchStep: number,
  rollStep: number
): CameraOrbitState {
  let azimuth = orbitState.azimuth;
  let elevation = orbitState.elevation;
  let roll = orbitState.roll ?? 0;

  if (pressedKeys.has('arrowleft')) {
    azimuth += turnStep;
  }
  if (pressedKeys.has('arrowright')) {
    azimuth -= turnStep;
  }
  if (pressedKeys.has('arrowup')) {
    elevation -= pitchStep;
  }
  if (pressedKeys.has('arrowdown')) {
    elevation += pitchStep;
  }
  if (pressedKeys.has('q')) {
    roll += rollStep;
  }
  if (pressedKeys.has('e')) {
    roll -= rollStep;
  }

  if (
    azimuth === orbitState.azimuth &&
    elevation === orbitState.elevation &&
    roll === (orbitState.roll ?? 0)
  ) {
    return orbitState;
  }

  return normalizeCameraOrbitState({
    azimuth,
    elevation,
    roll
  });
}

export function resolveDetachedKeyboardTranslation(
  pressedKeys: ReadonlySet<string>,
  orbitState: CameraOrbitState,
  distance: number
): Vector3 | null {
  const intent = resolveDetachedKeyboardTranslationIntent(pressedKeys, distance);

  return intent
    ? resolveCameraRelativeTranslation(orbitState, intent)
    : null;
}

export function resolveDetachedKeyboardTranslationIntent(
  pressedKeys: ReadonlySet<string>,
  distance: number
): DetachedKeyboardTranslationIntent | null {
  const step = Math.max(0.02, distance);
  let lateral = 0;
  let vertical = 0;
  let forward = 0;

  if (pressedKeys.has('a')) {
    lateral -= step;
  }
  if (pressedKeys.has('d')) {
    lateral += step;
  }
  if (pressedKeys.has('r')) {
    vertical += step;
  }
  if (pressedKeys.has('f')) {
    vertical -= step;
  }
  if (pressedKeys.has('w')) {
    forward += step;
  }
  if (pressedKeys.has('s')) {
    forward -= step;
  }

  if (lateral === 0 && vertical === 0 && forward === 0) {
    return null;
  }

  return {
    lateral,
    vertical,
    forward
  };
}

export function resolveCameraRelativeTranslation(
  orbitState: CameraOrbitState,
  intent: DetachedKeyboardTranslationIntent
): Vector3 {
  return addVector3(
    addVector3(
      scaleVector3(resolveCameraRightVector(orbitState), intent.lateral),
      scaleVector3(resolveOrbitUpVector(orbitState), intent.vertical)
    ),
    scaleVector3(resolveCameraLookVector(orbitState), intent.forward)
  );
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

function rotateVectorAroundAxis(
  vector: Vector3,
  axis: Vector3,
  angle: number
): Vector3 {
  if (Math.abs(angle) <= 1e-6) {
    return vector;
  }

  const normalizedAxis = normalizeVector(axis);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return addVector3(
    addVector3(
      scaleVector3(vector, cosine),
      scaleVector3(crossProduct(normalizedAxis, vector), sine)
    ),
    scaleVector3(
      normalizedAxis,
      dotProduct(normalizedAxis, vector) * (1 - cosine)
    )
  );
}

function crossProduct(left: Vector3, right: Vector3): Vector3 {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0])
  ];
}

function dotProduct(left: Vector3, right: Vector3) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}