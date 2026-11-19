import { OrbitControls } from '@react-three/drei'

/** 건물 주위를 360도로 도는 카메라. 땅 아래로는 못 내려가게 막아둠 */
export function CameraControls() {
  return (
    <OrbitControls
      target={[0, 14, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={18}
      maxDistance={70}
      minPolarAngle={Math.PI * 0.15}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}
