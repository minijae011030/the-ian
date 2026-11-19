import { Canvas } from '@react-three/fiber'
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

      {/* 건물 자리 표시용. 다음 단계에서 파사드 그리드로 교체 */}
      <mesh position={[0, 14, 0]}>
        <boxGeometry args={[12, 28, 8]} />
        <meshStandardMaterial color="#d9dde6" />
      </mesh>

      <CameraControls />
    </Canvas>
  )
}
