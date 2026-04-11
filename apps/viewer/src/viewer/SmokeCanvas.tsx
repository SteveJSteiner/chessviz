import { Canvas } from '@react-three/fiber';
import type { NavigationEntryPoint, SceneBootstrap } from './contracts';

type SmokeCanvasProps = {
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
};

export function SmokeCanvas({
  sceneBootstrap,
  navigationEntryPoint
}: SmokeCanvasProps) {
  return (
    <Canvas
      camera={{
        position: sceneBootstrap.camera.position,
        fov: sceneBootstrap.camera.fov
      }}
      onCreated={({ camera }) => {
        camera.position.set(...sceneBootstrap.camera.position);
        camera.lookAt(...sceneBootstrap.camera.lookAt);
      }}
    >
      <color attach="background" args={['#f7faf5']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <mesh position={navigationEntryPoint.focus}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={sceneBootstrap.accentColor} />
      </mesh>
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.8, 48]} />
        <meshStandardMaterial color="#b7c8a8" />
      </mesh>
    </Canvas>
  );
}