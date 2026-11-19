import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { useFocused } from '../state/focus'
import { ROOM_DEPTH, SLOT_BY_ID, slotNormal, slotWorldPosition } from './building/config'

const NEAR = { distance: 16, targetY: 5 } // 바짝 당기면 건물 1층·광장 높이를 봄
const FAR = { distance: 50, targetY: 14 } // 멀리서는 건물 중간을 봄
const VIEW_DISTANCE = 2.4 // 방 줌인할 때 창 밖 몇 m 앞에 설지

type Pose = { position: Vector3; target: Vector3 }

/**
 * 건물 주위를 360도로 도는 카메라.
 * - 줌인할수록 바라보는 높이가 내려가서, 가까이 가면 건물 앞 거리 시점이 됨
 * - 창을 클릭하면(focused) 그 방 창 앞으로 날아가고, 나가면 원래 자리로 돌아옴
 */
export function CameraControls() {
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const focused = useFocused()
  const saved = useRef<Pose | null>(null) // 줌인 직전 카메라 자리
  const flight = useRef<Pose | null>(null) // 지금 날아가는 목적지

  // focused가 바뀐 프레임에 목적지를 정함
  const lastFocused = useRef<string | null>(null)

  useFrame(({ camera }, delta) => {
    const controls = ref.current
    if (!controls) return

    if (focused !== lastFocused.current) {
      const slot = focused ? SLOT_BY_ID.get(focused) : undefined
      if (slot) {
        if (!lastFocused.current) {
          saved.current = { position: camera.position.clone(), target: controls.target.clone() }
        }
        const windowPos = slotWorldPosition(slot)
        const normal = slotNormal(slot)
        flight.current = {
          position: windowPos.clone().addScaledVector(normal, VIEW_DISTANCE),
          target: windowPos.clone().addScaledVector(normal, -ROOM_DEPTH * 0.55),
        }
        controls.enabled = false
      } else if (saved.current) {
        flight.current = saved.current
        saved.current = null
      }
      lastFocused.current = focused
    }

    if (flight.current) {
      const k = 1 - Math.exp(-delta * 4)
      camera.position.lerp(flight.current.position, k)
      controls.target.lerp(flight.current.target, k)
      camera.lookAt(controls.target)
      const arrived =
        camera.position.distanceTo(flight.current.position) < 0.02 &&
        controls.target.distanceTo(flight.current.target) < 0.02
      if (arrived) {
        flight.current = null
        if (!focused) controls.enabled = true
      }
      return
    }

    if (focused) return

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
