import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

const NEAR = { distance: 16, targetY: 5 } // 바짝 당기면 건물 1층·광장 높이를 봄
const FAR = { distance: 50, targetY: 14 } // 멀리서는 건물 중간을 봄

/**
 * 건물 주위를 360도로 도는 카메라. 땅 아래로는 못 내려가게 막아둠.
 * 줌인할수록 바라보는 높이가 내려가서, 가까이 가면 건물 앞 거리를 걷는 시점이 됨
 */
export function CameraControls() {
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null)

  useFrame(({ camera }) => {
    const controls = ref.current
    if (!controls) return
    const distance = camera.position.distanceTo(controls.target)
    const t = Math.min(1, Math.max(0, (distance - NEAR.distance) / (FAR.distance - NEAR.distance)))
    const targetY = NEAR.targetY + (FAR.targetY - NEAR.targetY) * t
    const dy = targetY - controls.target.y
    if (Math.abs(dy) > 0.001) {
      // 타깃과 카메라를 같이 옮겨야 각도가 튀지 않음
      controls.target.y += dy * 0.15
      camera.position.y += dy * 0.15
    }
  })

  return (
    <OrbitControls
      ref={ref}
      target={[0, FAR.targetY, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={NEAR.distance}
      maxDistance={70}
      minPolarAngle={Math.PI * 0.15}
      maxPolarAngle={Math.PI * 0.46}
    />
  )
}
