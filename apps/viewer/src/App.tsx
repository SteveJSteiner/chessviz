import { Canvas } from '@react-three/fiber';

export default function App() {
  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#7e57c2" />
        </mesh>
      </Canvas>
    </main>
  );
}
