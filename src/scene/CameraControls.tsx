import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { registerVerticalMove, setViewFloor } from '../state/camera'
import { useFocused } from '../state/focus'
import { BUILDING, BUILDING_HEIGHT, ROOM_DEPTH } from './building/config'
import { ROOM_BY_ID, roomGeometry } from './building/rooms'
import { SIDEWALK_HEIGHT } from './surroundings/layout'

const HOME_TARGET = new Vector3(0, 14, 0)
/** 방 줌인할 때 창 밖 몇 m 앞에 설지. 넓은 방일수록 뒤로 물러나서 방 전체가 보이게 */
const viewDistance = (width: number) => 1.1 + width * 0.75
const TOP_Y = SIDEWALK_HEIGHT + BUILDING_HEIGHT + BUILDING.crownHeight
const TARGET_BOUNDS = { xz: 14, minY: 1.5, maxY: TOP_Y }
const RECENTER_FROM = 45 // 이보다 멀리 빠지면 시선을 건물 중심으로 천천히 되돌림

type Pose = { position: Vector3; target: Vector3 }

/**
 * 건물 주위를 360도로 도는 카메라.
 * - 휠 줌은 마우스가 가리키는 쪽으로 들어감 (아래를 가리키면 거리, 위를 가리키면 꼭대기 층)
 * - 오른쪽 드래그 / ↑↓ 키 / 엘리베이터 버튼으로 시선 높이를 위아래로 옮김
 * - 창을 클릭하면(focused) 그 방 창 앞으로 날아가고, 나가면 원래 자리로 돌아옴
 */
export function CameraControls() {
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera)
  const focused = useFocused()
  const saved = useRef<Pose | null>(null) // 줌인 직전 카메라 자리
  const flight = useRef<Pose | null>(null) // 지금 날아가는 목적지
  const lastFocused = useRef<string | null>(null)
  const verticalGoal = useRef<number | null>(null) // 엘리베이터로 가려는 시선 높이

  // 엘리베이터: 버튼·↑↓ 키 한 번에 한 층씩
  useEffect(() => {
    const go = (floors: number) => {
      const controls = ref.current
      if (!controls || focused) return
      const from = verticalGoal.current ?? controls.target.y
      verticalGoal.current = MathUtils.clamp(
        from + floors * BUILDING.floorHeight,
        TARGET_BOUNDS.minY,
        TARGET_BOUNDS.maxY,
      )
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') go(1)
      if (e.key === 'ArrowDown') go(-1)
    }
    registerVerticalMove(go)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      registerVerticalMove(null)
    }
  }, [focused])

  useFrame((_, delta) => {
    const controls = ref.current
    if (!controls) return

    if (focused !== lastFocused.current) {
      const room = focused ? ROOM_BY_ID.get(focused) : undefined
      if (room) {
        if (!lastFocused.current) {
          saved.current = { position: camera.position.clone(), target: controls.target.clone() }
        }
        const { worldCenter, normal, width } = roomGeometry(room)
        flight.current = {
          position: worldCenter.clone().addScaledVector(normal, viewDistance(width)),
          target: worldCenter.clone().addScaledVector(normal, -ROOM_DEPTH * 0.55),
        }
        verticalGoal.current = null
        controls.enabled = false
      } else if (saved.current) {
        flight.current = saved.current
        saved.current = null
      }
      lastFocused.current = focused
    }

    const k = 1 - Math.exp(-delta * 4)

    if (flight.current) {
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

    const target = controls.target

    // 엘리베이터 이동: 카메라와 시선을 같이 올려야 각도가 유지됨
    if (verticalGoal.current !== null) {
      const dy = (verticalGoal.current - target.y) * k
      target.y += dy
      camera.position.y += dy
      if (Math.abs(verticalGoal.current - target.y) < 0.01) verticalGoal.current = null
    }

    // 멀리 빠지면 시선이 건물 중심으로 돌아옴 (줌투커서로 엉뚱한 데 가 있어도 길 잃지 않게)
    const distance = camera.position.distanceTo(target)
    if (distance > RECENTER_FROM && verticalGoal.current === null) {
      const before = target.clone()
      target.lerp(HOME_TARGET, k * 0.5)
      camera.position.add(target.clone().sub(before))
    }

    // 시선이 건물 블록 밖·땅속·하늘로 나가지 않게
    const clamped = target.clone()
    clamped.x = MathUtils.clamp(clamped.x, -TARGET_BOUNDS.xz, TARGET_BOUNDS.xz)
    clamped.z = MathUtils.clamp(clamped.z, -TARGET_BOUNDS.xz, TARGET_BOUNDS.xz)
    clamped.y = MathUtils.clamp(clamped.y, TARGET_BOUNDS.minY, TARGET_BOUNDS.maxY)
    if (!clamped.equals(target)) {
      camera.position.add(clamped.clone().sub(target))
      target.copy(clamped)
    }

    // 지금 보고 있는 층 (엘리베이터 표시용). 0 = 1층
    setViewFloor(Math.floor((target.y - SIDEWALK_HEIGHT) / BUILDING.floorHeight))
  })

  return (
    <OrbitControls
      ref={ref}
      target={HOME_TARGET.toArray()}
      enableDamping
      dampingFactor={0.08}
      zoomToCursor
      screenSpacePanning
      minDistance={8}
      maxDistance={70}
      minPolarAngle={Math.PI * 0.15}
      maxPolarAngle={Math.PI * 0.47}
    />
  )
}
