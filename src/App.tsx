import { Canvas } from '@react-three/fiber'
import { TheIan } from './scene/building/TheIan'
import { CameraControls } from './scene/CameraControls'
import { Ground } from './scene/Ground'
import { Sky } from './scene/Sky'
import { Surroundings } from './scene/surroundings'

export default function App() {
  return (
    <Canvas camera={{ position: [0, 3, 40], fov: 50, far: 2000 }}>
      <fog attach="fog" args={['#6d93d6', 90, 520]} />
      <hemisphereLight args={['#9bb7ee', '#2a3142', 2.2]} />
      <directionalLight position={[-60, 80, 40]} intensity={0.6} color="#c9d8ff" />
      <Sky />
      <Ground />
      <Surroundings />

      <TheIan />

      <CameraControls />
    </Canvas>
  )
}
