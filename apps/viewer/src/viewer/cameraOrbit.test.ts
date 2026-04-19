import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMERA_ORBIT_LIMITS,
  advanceCameraOrbitState,
  deriveCameraOrbitState,
  resolveCameraSetPoint,
  resolveCameraLookVector,
  resolveDetachedKeyboardOrbit,
  resolveDetachedKeyboardTranslation,
  normalizeCameraOrbitState,
  resolveOrbitUpVector,
  resolveOrbitCameraPosition
} from './cameraOrbit.ts';

test('derives the default orbit from the scene camera offset', () => {
  const orbitState = deriveCameraOrbitState([0, 0.45, 4.2]);

  assert.equal(orbitState.azimuth, 0);
  assert.ok(orbitState.elevation > 0);
  assert.ok(orbitState.elevation < CAMERA_ORBIT_LIMITS.maxElevation);
  assert.equal(orbitState.roll, 0);
});

test('advances the orbit by drag delta without hitting a vertical wall', () => {
  const initialOrbit = {
    azimuth: 0,
    elevation: 0
  };
  const advancedOrbit = advanceCameraOrbitState(initialOrbit, 20, -40, 0.01);
  const overTopOrbit = advanceCameraOrbitState(
    {
      azimuth: 0,
      elevation: Math.PI * 0.48
    },
    0,
    -30,
    0.01
  );

  assert.equal(round(advancedOrbit.azimuth), -0.2);
  assert.equal(round(advancedOrbit.elevation), 0.4);
  assert.ok(overTopOrbit.elevation > Math.PI * 0.5);
});

test('normalizes orbit angles periodically instead of clamping at the pole', () => {
  const normalizedOrbit = normalizeCameraOrbitState({
    azimuth: Math.PI * 3,
    elevation: Math.PI * 1.2
  });

  assert.equal(round(normalizedOrbit.azimuth), round(Math.PI));
  assert.equal(round(normalizedOrbit.elevation), round(-(Math.PI * 0.8)));
});

test('projects orbit state into a camera position around the focus node', () => {
  const focus = [1.2, -0.4, 0.5] as [number, number, number];
  const cameraPosition = resolveOrbitCameraPosition(focus, 4, {
    azimuth: Math.PI / 2,
    elevation: 0
  });

  assert.deepEqual(cameraPosition.map((value) => round(value)), [5.2, -0.4, 0.5]);
});

test('resolves the detached look vector from orbit state', () => {
  const forward = resolveCameraLookVector({
    azimuth: 0,
    elevation: 0
  });
  const left = resolveCameraLookVector({
    azimuth: Math.PI / 2,
    elevation: 0
  });

  assert.deepEqual(forward.map((value) => round(value)), [0, 0, -1]);
  assert.deepEqual(left.map((value) => round(value)), [-1, 0, 0]);
});

test('maps detached keyboard rotation to yaw on arrows and pitch from the camera frame', () => {
  const rotated = resolveDetachedKeyboardOrbit(
    new Set(['arrowleft', 'arrowup']),
    {
      azimuth: 0,
      elevation: 0,
      roll: 0
    },
    0.2,
    0.1,
    0.15
  );

  assert.equal(round(rotated.azimuth), 0.2);
  assert.equal(round(rotated.elevation), -0.1);
  assert.equal(round(rotated.roll ?? 0), 0);
});

test('maps detached keyboard Q/E to roll left and right', () => {
  const rolledLeft = resolveDetachedKeyboardOrbit(
    new Set(['q']),
    {
      azimuth: 0,
      elevation: 0,
      roll: 0
    },
    0.2,
    0.1,
    0.15
  );
  const rolledRight = resolveDetachedKeyboardOrbit(
    new Set(['e']),
    {
      azimuth: 0,
      elevation: 0,
      roll: 0
    },
    0.2,
    0.1,
    0.15
  );

  assert.equal(round(rolledLeft.azimuth), 0);
  assert.equal(round(rolledLeft.elevation), 0);
  assert.equal(round(rolledLeft.roll ?? 0), 0.15);
  assert.equal(round(rolledRight.azimuth), 0);
  assert.equal(round(rolledRight.elevation), 0);
  assert.equal(round(rolledRight.roll ?? 0), -0.15);
});

test('maps detached keyboard translation onto the camera x y and z axes', () => {
  const forward = resolveDetachedKeyboardTranslation(
    new Set(['w']),
    {
      azimuth: 0,
      elevation: 0
    },
    0.5
  );
  const left = resolveDetachedKeyboardTranslation(
    new Set(['a']),
    {
      azimuth: 0,
      elevation: 0
    },
    0.5
  );
  const rise = resolveDetachedKeyboardTranslation(
    new Set(['r']),
    {
      azimuth: 0,
      elevation: 0
    },
    0.5
  );
  const noRotationTranslation = resolveDetachedKeyboardTranslation(
    new Set(['arrowup', 'q']),
    {
      azimuth: 0,
      elevation: 0
    },
    0.5
  );

  assert.deepEqual(forward?.map((value) => round(value)), [0, 0, -0.5]);
  assert.deepEqual(left?.map((value) => round(value)), [-0.5, 0, 0]);
  assert.deepEqual(rise?.map((value) => round(value)), [0, 0.5, 0]);
  assert.equal(noRotationTranslation, null);
});

test('resolves the current set point from camera position, look, and pivot distance', () => {
  const setPoint = resolveCameraSetPoint(
    [1, 2, 3],
    {
      azimuth: 0,
      elevation: 0
    },
    2
  );

  assert.deepEqual(setPoint.map((value) => round(value)), [1, 2, 1]);
});

test('resolves a continuous up vector across the vertical pole', () => {
  const nearPoleUp = resolveOrbitUpVector({
    azimuth: 0.35,
    elevation: Math.PI * 0.49
  });
  const overPoleUp = resolveOrbitUpVector({
    azimuth: 0.35,
    elevation: Math.PI * 0.51
  });

  assert.ok(magnitude(nearPoleUp) > 0.99);
  assert.ok(magnitude(overPoleUp) > 0.99);
  assert.ok(dotProduct(nearPoleUp, overPoleUp) > 0.95);
});

test('applies roll around the look vector when resolving the up vector', () => {
  const rolledUp = resolveOrbitUpVector({
    azimuth: 0,
    elevation: 0,
    roll: Math.PI / 2
  });

  assert.deepEqual(rolledUp.map((value) => round(value)), [1, 0, 0]);
});

function round(value: number) {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;

  return Object.is(rounded, -0) ? 0 : rounded;
}

function magnitude(vector: [number, number, number]) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function dotProduct(
  left: [number, number, number],
  right: [number, number, number]
) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}