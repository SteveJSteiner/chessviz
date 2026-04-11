import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCarrierRibbonMeshData } from './carrierRibbon.ts';

test('buildCarrierRibbonMeshData widens the surface when width increases', () => {
  const narrowRibbon = buildCarrierRibbonMeshData({
    samples: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2]
    ],
    halfWidth: 0.05,
    twist: 0
  });
  const wideRibbon = buildCarrierRibbonMeshData({
    samples: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2]
    ],
    halfWidth: 0.12,
    twist: 0
  });

  assert.ok(averageRibbonWidth(wideRibbon.positions) > averageRibbonWidth(narrowRibbon.positions));
});

test('buildCarrierRibbonMeshData uses twist to rotate the carrier surface', () => {
  const untwistedRibbon = buildCarrierRibbonMeshData({
    samples: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2]
    ],
    halfWidth: 0.08,
    twist: 0
  });
  const twistedRibbon = buildCarrierRibbonMeshData({
    samples: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2]
    ],
    halfWidth: 0.08,
    twist: 0.15
  });

  assert.ok(maxAbsoluteX(twistedRibbon.positions) > maxAbsoluteX(untwistedRibbon.positions));
});

function averageRibbonWidth(positions: number[]) {
  let accumulatedWidth = 0;
  let segmentCount = 0;

  for (let index = 0; index < positions.length; index += 6) {
    const leftX = positions[index]!;
    const leftY = positions[index + 1]!;
    const leftZ = positions[index + 2]!;
    const rightX = positions[index + 3]!;
    const rightY = positions[index + 4]!;
    const rightZ = positions[index + 5]!;
    accumulatedWidth += Math.hypot(leftX - rightX, leftY - rightY, leftZ - rightZ);
    segmentCount += 1;
  }

  return accumulatedWidth / segmentCount;
}

function maxAbsoluteX(positions: number[]) {
  let maximum = 0;

  for (let index = 0; index < positions.length; index += 3) {
    maximum = Math.max(maximum, Math.abs(positions[index]!));
  }

  return maximum;
}