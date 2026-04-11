import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type {
  NavigationEntryPoint,
  RuntimeNeighborhoodEdge,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  SceneBootstrap,
  Vector3
} from './contracts';

type SmokeCanvasProps = {
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
};

export function SmokeCanvas({
  sceneBootstrap,
  navigationEntryPoint,
  runtimeSnapshot
}: SmokeCanvasProps) {
  return (
    <Canvas
      camera={{
        position: sceneBootstrap.camera.position,
        fov: sceneBootstrap.camera.fov
      }}
    >
      <CameraRig
        navigationEntryPoint={navigationEntryPoint}
        sceneBootstrap={sceneBootstrap}
      />
      <color attach="background" args={['#f7faf5']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <NeighborhoodEdges
        edges={runtimeSnapshot.edges}
        occurrences={runtimeSnapshot.occurrences}
      />
      {runtimeSnapshot.occurrences.map((occurrence) => (
        <NeighborhoodNode
          accentColor={sceneBootstrap.accentColor}
          key={occurrence.occurrenceId}
          occurrence={occurrence}
        />
      ))}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.8, 48]} />
        <meshStandardMaterial color="#b7c8a8" />
      </mesh>
    </Canvas>
  );
}

function CameraRig({
  navigationEntryPoint,
  sceneBootstrap
}: {
  navigationEntryPoint: NavigationEntryPoint;
  sceneBootstrap: SceneBootstrap;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(
      navigationEntryPoint.focus[0],
      sceneBootstrap.camera.position[1] + navigationEntryPoint.focus[1],
      navigationEntryPoint.focus[2] + navigationEntryPoint.distance
    );
    camera.lookAt(...navigationEntryPoint.focus);
  }, [camera, navigationEntryPoint, sceneBootstrap]);

  return null;
}

function NeighborhoodNode({
  accentColor,
  occurrence
}: {
  accentColor: string;
  occurrence: RuntimeNeighborhoodOccurrence;
}) {
  const position = scaleCoordinate(occurrence.embedding.coordinate);
  const nodeColor = occurrence.terminal
    ? terminalColor(occurrence.terminal.wdlLabel)
    : phaseColor(occurrence.phase, accentColor);
  const radius = 0.08 + occurrence.salience.normalizedScore * 0.16;

  return (
    <mesh position={position}>
      <sphereGeometry args={[occurrence.isFocus ? radius * 1.2 : radius, 18, 18]} />
      <meshStandardMaterial
        color={nodeColor}
        emissive={occurrence.isFocus ? '#ffffff' : '#000000'}
        emissiveIntensity={occurrence.isFocus ? 0.18 : 0}
        roughness={0.35}
      />
    </mesh>
  );
}

function NeighborhoodEdges({
  edges,
  occurrences
}: {
  edges: RuntimeNeighborhoodEdge[];
  occurrences: RuntimeNeighborhoodOccurrence[];
}) {
  const occurrenceById = new Map(
    occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence])
  );

  return edges.map((edge) => {
    const sourceOccurrence = occurrenceById.get(edge.sourceOccurrenceId);
    const targetOccurrence = occurrenceById.get(edge.targetOccurrenceId);

    if (!sourceOccurrence || !targetOccurrence) {
      return null;
    }

    const positions = new Float32Array([
      ...scaleCoordinate(sourceOccurrence.embedding.coordinate),
      ...scaleCoordinate(targetOccurrence.embedding.coordinate)
    ]);

    return (
      <line key={`${edge.sourceOccurrenceId}:${edge.targetOccurrenceId}`}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#94a3b8" opacity={0.7} transparent />
      </line>
    );
  });
}

function phaseColor(phase: string, accentColor: string) {
  if (phase === 'opening') {
    return '#2563eb';
  }
  if (phase === 'middlegame') {
    return accentColor;
  }
  if (phase === 'endgame') {
    return '#7c3aed';
  }
  return accentColor;
}

function terminalColor(wdlLabel: string) {
  if (wdlLabel === 'W') {
    return '#15803d';
  }
  if (wdlLabel === 'D') {
    return '#c2410c';
  }
  if (wdlLabel === 'L') {
    return '#b91c1c';
  }
  return '#475569';
}

function scaleCoordinate(coordinate: Vector3): Vector3 {
  return [coordinate[0] * 2.6, coordinate[1] * 2.6, coordinate[2] * 2.6];
}