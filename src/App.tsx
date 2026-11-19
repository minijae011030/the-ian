import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} />
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="#f4e3b5" />
      </mesh>
    </Canvas>
  )
}
