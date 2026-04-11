import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMERA_ORBIT_LIMITS,
  advanceCameraOrbitState,
  deriveCameraOrbitState,
  resolveOrbitCameraPosition
} from './cameraOrbit.ts';

test('derives the default orbit from the scene camera offset', () => {
  const orbitState = deriveCameraOrbitState([0, 0.45, 4.2]);

  assert.equal(orbitState.azimuth, 0);
  assert.ok(orbitState.elevation > 0);
  assert.ok(orbitState.elevation < CAMERA_ORBIT_LIMITS.maxElevation);
});

test('advances the orbit by drag delta while clamping elevation', () => {
  const initialOrbit = {
    azimuth: 0,
    elevation: 0
  };
  const advancedOrbit = advanceCameraOrbitState(initialOrbit, 20, -40, 0.01);
  const clampedOrbit = advanceCameraOrbitState(initialOrbit, 0, -10_000, 0.01);

  assert.equal(advancedOrbit.azimuth, -0.2);
  assert.equal(advancedOrbit.elevation, 0.4);
  assert.equal(clampedOrbit.elevation, CAMERA_ORBIT_LIMITS.maxElevation);
});

test('projects orbit state into a camera position around the focus node', () => {
  const focus = [1.2, -0.4, 0.5] as [number, number, number];
  const cameraPosition = resolveOrbitCameraPosition(focus, 4, {
    azimuth: Math.PI / 2,
    elevation: 0
  });

  assert.deepEqual(cameraPosition.map((value) => round(value)), [5.2, -0.4, 0.5]);
});

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}