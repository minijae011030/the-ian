import { Canvas } from '@react-three/fiber'
import { TheIan } from './scene/building/TheIan'
import { CameraControls } from './scene/CameraControls'
import { EnvironmentController } from './scene/EnvironmentController'
import { Ground } from './scene/Ground'
import { Plaza } from './scene/plaza'
import { Sky } from './scene/Sky'
import { Surroundings } from './scene/surroundings'
import { Clock } from './ui/Clock'
import { FocusOverlay } from './ui/FocusOverlay'

export default function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 3, 40], fov: 50, far: 2000 }}>
        <fog attach="fog" args={['#6d93d6', 90, 520]} />
        <EnvironmentController />
        <directionalLight position={[-60, 80, 40]} intensity={0.6} color="#c9d8ff" />
        <Sky />
        <Ground />
        <Surroundings />
        <TheIan />
        <Plaza />
        <CameraControls />
      </Canvas>
      <Clock />
      <FocusOverlay />
    </>
  )
}
