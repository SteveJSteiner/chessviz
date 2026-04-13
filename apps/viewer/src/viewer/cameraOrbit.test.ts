import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMERA_ORBIT_LIMITS,
  advanceCameraOrbitState,
  deriveCameraOrbitState,
  normalizeCameraOrbitState,
  resolveOrbitUpVector,
  resolveOrbitCameraPosition
} from './cameraOrbit.ts';

test('derives the default orbit from the scene camera offset', () => {
  const orbitState = deriveCameraOrbitState([0, 0.45, 4.2]);

  assert.equal(orbitState.azimuth, 0);
  assert.ok(orbitState.elevation > 0);
  assert.ok(orbitState.elevation < CAMERA_ORBIT_LIMITS.maxElevation);
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

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
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