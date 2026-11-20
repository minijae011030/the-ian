import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import { createRandom, range } from '../../../lib/random'
import { environment } from '../../environment'
import { isInsideLake, LANE, roadLines } from '../layout'
import { type Axis, lightFor, signalClock, STOP_LINE } from './signals'

/**
 * 도로 위 차들. 차 한 대씩 앞차 간격과 신호를 보고 속도를 정함.
 * - 빨간불이면 정지선 앞에 서고, 뒤차들이 줄줄이 섬 → 출퇴근엔 자연스럽게 막힘
 * - 차선 끝까지 가면 처음으로 돌아옴 (교통량이 줄었으면 그때 사라짐)
 * - 우측통행: 진행 방향 오른쪽 차선
 */
export const RANGE = 160
const SPAN = RANGE * 2
const MAX_PER_LANE = 30
const CAR_LENGTH = 2.3
const MIN_GAP = 1.2 // 서 있을 때 앞차와 간격
const ACCEL = 5
const BRAKE = 22

const BODY_COLORS = ['#e9e9ec', '#1d1f24', '#8b9099', '#c8ccd2', '#2f4a7a', '#7a1f24', '#e9e9ec', '#1d1f24']

type Car = { slot: number; s: number; v: number }

type Lane = {
  axis: Axis
  line: number
  dir: 1 | -1
  offset: number
  /** 이 차선 기준 정지선 위치들 (s 좌표, 오름차순) */
  stops: number[]
  /** 뒤에서 앞 순서(s 오름차순)로 정렬된 차들 */
  cars: Car[]
}

function createLanes(): Lane[] {
  const lines = roadLines().filter((l) => Math.abs(l) <= RANGE)
  const lanes: Lane[] = []
  for (const line of lines) {
    for (const axis of ['x', 'z'] as const) {
      for (const dir of [1, -1] as const) {
        // 진행 방향 오른쪽: x축 +방향이면 +z, z축 +방향이면 -x
        const right = axis === 'x' ? dir : -dir
        // 교차로마다 진행 방향 앞쪽 정지선. 월드 좌표 t = dir * (s - RANGE)
        const stops = lines
          .map((cross) => dir * (cross - dir * STOP_LINE) + RANGE)
          .filter((s) => s > 0 && s < SPAN)
          .sort((a, b) => a - b)
        lanes.push({ axis, line, dir, offset: right * LANE.offset, stops, cars: [] })
      }
    }
  }
  return lanes
}

const dummy = new Object3D()

export function Traffic() {
  const { lanes, colors, poolSize } = useMemo(() => {
    const lanes = createLanes()
    const poolSize = lanes.length * MAX_PER_LANE
    const rand = createRandom(4242)
    const colors = Array.from({ length: poolSize }, () =>
      new Color(BODY_COLORS[Math.floor(rand() * BODY_COLORS.length)]).multiplyScalar(range(rand, 0.85, 1)),
    )
    return { lanes, colors, poolSize }
  }, [])

  const free = useRef<number[]>([])
  const initialized = useRef(false)
  const bodyRef = useRef<InstancedMesh>(null)
  const cabinRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)
  const tailRef = useRef<InstancedMesh>(null)

  const geometries = useMemo(
    () => ({
      body: new BoxGeometry(CAR_LENGTH, 0.55, 1.05).translate(0, 0.5, 0),
      cabin: new BoxGeometry(1.25, 0.45, 0.92).translate(-0.15, 1.0, 0),
      head: new BoxGeometry(0.06, 0.16, 0.9).translate(CAR_LENGTH / 2 + 0.01, 0.55, 0),
      tail: new BoxGeometry(0.06, 0.14, 0.9).translate(-CAR_LENGTH / 2 - 0.01, 0.6, 0),
    }),
    [],
  )

  useFrame((_, rawDelta) => {
    const meshes = [bodyRef.current, cabinRef.current, headRef.current, tailRef.current]
    if (meshes.some((m) => !m)) return
    const [body, cabin, head, tail] = meshes as InstancedMesh[]
    const dt = Math.min(rawDelta, 0.1)
    signalClock.t += dt

    const target = Math.round(MAX_PER_LANE * environment.traffic)
    const vmax = 10 - 3 * environment.traffic

    // 처음 한 번: 색 칠하고, 지금 교통량만큼 차선에 고르게 깔아둠
    if (!initialized.current) {
      colors.forEach((c, i) => body.setColorAt(i, c))
      if (body.instanceColor) body.instanceColor.needsUpdate = true
      free.current = Array.from({ length: poolSize }, (_, i) => poolSize - 1 - i)
      for (const lane of lanes) {
        for (let i = 0; i < target; i++) {
          lane.cars.push({ slot: free.current.pop()!, s: (SPAN / target) * i, v: vmax * 0.6 })
        }
      }
      initialized.current = true
    }

    for (const lane of lanes) {
      const cars = lane.cars
      const light = lightFor(lane.axis)

      // 앞에서부터 계산해야 앞차가 이번 프레임에 간 자리를 기준으로 따라감
      for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i]
        const leader = cars[(i + 1) % cars.length]
        const leaderS = i === cars.length - 1 ? leader.s + SPAN : leader.s
        const gap = cars.length === 1 ? Infinity : leaderS - car.s - CAR_LENGTH

        let desired = Math.min(vmax, Math.max(0, gap - MIN_GAP) * 1.4)

        // 다음 정지선: 빨강이면 서고, 노랑이면 너무 가까울 땐 그냥 지나감
        if (light !== 'green') {
          const stop = lane.stops.find((s) => s > car.s + CAR_LENGTH / 2 - 0.3)
          if (stop !== undefined) {
            const d = stop - (car.s + CAR_LENGTH / 2)
            const committed = light === 'yellow' && d < car.v * 0.6
            if (!committed) desired = Math.min(desired, Math.max(0, d - 0.2) * 1.6)
          }
        }

        car.v = desired > car.v ? Math.min(desired, car.v + ACCEL * dt) : Math.max(desired, car.v - BRAKE * dt)
        car.s += car.v * dt
        if (cars.length > 1) car.s = Math.min(car.s, leaderS - CAR_LENGTH - 0.3)
      }

      // 차선 끝 → 처음으로. 교통량이 줄었으면 이때 빠짐
      const last = cars[cars.length - 1]
      if (last && last.s >= SPAN) {
        cars.pop()
        if (cars.length >= target) free.current.push(last.slot)
        else cars.unshift({ ...last, s: last.s - SPAN })
      }

      // 교통량이 늘었으면 차선 시작에 자리 있을 때 한 대씩 들여보냄
      if (cars.length < target && free.current.length > 0 && (cars.length === 0 || cars[0].s > CAR_LENGTH + 6)) {
        cars.unshift({ slot: free.current.pop()!, s: 0, v: vmax * 0.6 })
      }
    }

    // 그리기
    for (const slot of free.current) {
      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      for (const m of [body, cabin, head, tail]) m.setMatrixAt(slot, dummy.matrix)
    }
    for (const lane of lanes) {
      const yaw = lane.axis === 'x' ? (lane.dir === 1 ? 0 : Math.PI) : lane.dir === 1 ? -Math.PI / 2 : Math.PI / 2
      for (const car of lane.cars) {
        const t = lane.dir * (car.s - RANGE)
        const x = lane.axis === 'x' ? t : lane.line + lane.offset
        const z = lane.axis === 'x' ? lane.line + lane.offset : t
        dummy.position.set(x, 0, z)
        dummy.rotation.set(0, yaw, 0)
        dummy.scale.setScalar(isInsideLake(x, z, 1) ? 0 : 1)
        dummy.updateMatrix()
        for (const m of [body, cabin, head, tail]) m.setMatrixAt(car.slot, dummy.matrix)
      }
    }
    for (const m of [body, cabin, head, tail]) m.instanceMatrix.needsUpdate = true

    // 어두울수록 전조등·후미등이 밝게
    const glow = 0.35 + 0.65 * environment.darkness
    ;(head.material as MeshBasicMaterial).color.setRGB(1, 0.96, 0.85).multiplyScalar(glow * 1.6)
    ;(tail.material as MeshBasicMaterial).color.setRGB(1, 0.12, 0.08).multiplyScalar(glow * 1.4)
  })

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometries.body, undefined, poolSize]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.35} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[geometries.cabin, undefined, poolSize]} frustumCulled={false}>
        <meshStandardMaterial color="#1b222c" roughness={0.2} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[geometries.head, undefined, poolSize]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tailRef} args={[geometries.tail, undefined, poolSize]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
