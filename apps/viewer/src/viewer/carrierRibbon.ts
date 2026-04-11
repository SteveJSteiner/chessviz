import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Vector3 as ThreeVector3
} from 'three';
import type { Vector3 } from './contracts';

export interface CarrierRibbonMeshData {
  positions: number[];
  indices: number[];
}

export function buildCarrierRibbonMeshData({
  samples,
  halfWidth,
  twist,
  surfaceOffset = 0,
  segmentCount = Math.max(12, (samples.length - 1) * 6)
}: {
  samples: Vector3[];
  halfWidth: number;
  twist: number;
  surfaceOffset?: number;
  segmentCount?: number;
}): CarrierRibbonMeshData {
  if (samples.length < 2 || halfWidth <= 0) {
    return {
      positions: [],
      indices: []
    };
  }

  const curve = new CatmullRomCurve3(
    samples.map((sample) => new ThreeVector3(...sample))
  );
  const points = curve.getPoints(segmentCount);
  const positions: number[] = [];
  const indices: number[] = [];
  let previousBaseWidthAxis: ThreeVector3 | null = null;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const progress = points.length === 1 ? 0 : index / (points.length - 1);
    const tangent = curve.getTangent(progress).normalize();
    const baseWidthAxis: ThreeVector3 = previousBaseWidthAxis
      ? transportWidthAxis(previousBaseWidthAxis, tangent, point)
      : fallbackWidthAxis(point, tangent);
    const twistAngle = twist * Math.PI * 2 * progress;
    const widthAxis = baseWidthAxis.clone().applyAxisAngle(tangent, twistAngle).normalize();
    const normalAxis = tangent.clone().cross(widthAxis).normalize();
    const leftPoint = point
      .clone()
      .add(widthAxis.clone().multiplyScalar(halfWidth))
      .add(normalAxis.clone().multiplyScalar(surfaceOffset));
    const rightPoint = point
      .clone()
      .add(widthAxis.clone().multiplyScalar(-halfWidth))
      .add(normalAxis.clone().multiplyScalar(surfaceOffset));

    positions.push(
      leftPoint.x,
      leftPoint.y,
      leftPoint.z,
      rightPoint.x,
      rightPoint.y,
      rightPoint.z
    );

    if (index < points.length - 1) {
      const baseIndex = index * 2;
      indices.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex + 1,
        baseIndex + 3,
        baseIndex + 2
      );
    }

    previousBaseWidthAxis = baseWidthAxis;
  }

  return {
    positions,
    indices
  };
}

export function createCarrierRibbonGeometry(args: {
  samples: Vector3[];
  halfWidth: number;
  twist: number;
  surfaceOffset?: number;
  segmentCount?: number;
}) {
  const meshData = buildCarrierRibbonMeshData(args);
  const geometry = new BufferGeometry();

  if (meshData.positions.length === 0) {
    return geometry;
  }

  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(meshData.positions, 3)
  );
  geometry.setIndex(meshData.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function transportWidthAxis(
  previousWidthAxis: ThreeVector3,
  tangent: ThreeVector3,
  point: ThreeVector3
): ThreeVector3 {
  const transportedAxis = previousWidthAxis
    .clone()
    .sub(tangent.clone().multiplyScalar(previousWidthAxis.dot(tangent)));

  if (transportedAxis.lengthSq() <= 1e-6) {
    return fallbackWidthAxis(point, tangent);
  }

  return transportedAxis.normalize();
}

function fallbackWidthAxis(point: ThreeVector3, tangent: ThreeVector3): ThreeVector3 {
  const hints = [
    point.clone(),
    new ThreeVector3(0, 1, 0),
    new ThreeVector3(1, 0, 0),
    new ThreeVector3(0, 0, 1)
  ];

  for (const hint of hints) {
    if (hint.lengthSq() <= 1e-6) {
      continue;
    }

    const candidate = hint
      .clone()
      .sub(tangent.clone().multiplyScalar(hint.dot(tangent)));

    if (candidate.lengthSq() > 1e-6) {
      return candidate.normalize();
    }
  }

  return new ThreeVector3(1, 0, 0);
}