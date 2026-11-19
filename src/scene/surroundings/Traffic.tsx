import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import { createRandom, range } from '../../lib/random'
import { environment } from '../environment'
import { isInsideLake, roadLines } from './layout'

/**
 * 도로 위 차들.
 * - 차선마다 차가 일정 간격으로 줄지어 있고, 해시값 < 교통량 인 차만 보임
 *   → 같은 차선 차들은 속도가 같아서 서로 겹치지 않음
 * - 교통량이 많을수록(출퇴근) 차가 빽빽해지고 느려짐 = 막힘
 * - 우측통행: 진행 방향 오른쪽 차선으로 달림
 */
const RANGE = 160
const LANE_OFFSET = 1.7
const CARS_PER_LANE = 26
const BASE_SPEED = 9 // 텅 빈 도로 속도
const JAM_SPEED = 1.2 // 꽉 막혔을 때 속도

const BODY_COLORS = ['#e9e9ec', '#1d1f24', '#8b9099', '#c8ccd2', '#2f4a7a', '#7a1f24', '#e9e9ec', '#1d1f24']

type Lane = { axis: 'x' | 'z'; line: number; dir: 1 | -1; offset: number; phase: number }
type Car = { lane: Lane; slot: number; chance: number; color: Color }

function createCars() {
  const rand = createRandom(4242)
  const lanes: Lane[] = []
  for (const line of roadLines()) {
    if (Math.abs(line) > RANGE) continue
    for (const axis of ['x', 'z'] as const) {
      for (const dir of [1, -1] as const) {
        // 진행 방향 오른쪽: x축 +방향이면 +z, z축 +방향이면 -x
        const right = axis === 'x' ? dir : -dir
        lanes.push({ axis, line, dir, offset: right * LANE_OFFSET, phase: rand() })
      }
    }
  }

  const cars: Car[] = []
  for (const lane of lanes) {
    for (let slot = 0; slot < CARS_PER_LANE; slot++) {
      cars.push({
        lane,
        slot,
        chance: rand(),
        color: new Color(BODY_COLORS[Math.floor(rand() * BODY_COLORS.length)]).multiplyScalar(range(rand, 0.85, 1)),
      })
    }
  }
  return cars
}

const dummy = new Object3D()

export function Traffic() {
  const cars = useMemo(createCars, [])
  const bodyRef = useRef<InstancedMesh>(null)
  const cabinRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)
  const tailRef = useRef<InstancedMesh>(null)
  const travel = useRef(0)
  const colored = useRef(false)

  const geometries = useMemo(
    () => ({
      body: new BoxGeometry(2.3, 0.55, 1.05).translate(0, 0.5, 0),
      cabin: new BoxGeometry(1.25, 0.45, 0.92).translate(-0.15, 1.0, 0),
      head: new BoxGeometry(0.06, 0.16, 0.9).translate(1.16, 0.55, 0),
      tail: new BoxGeometry(0.06, 0.14, 0.9).translate(-1.16, 0.6, 0),
    }),
    [],
  )

  useFrame((_, delta) => {
    const meshes = [bodyRef.current, cabinRef.current, headRef.current, tailRef.current]
    if (meshes.some((m) => !m)) return
    const [body, cabin, head, tail] = meshes as InstancedMesh[]

    if (!colored.current) {
      cars.forEach((c, i) => body.setColorAt(i, c.color))
      if (body.instanceColor) body.instanceColor.needsUpdate = true
      colored.current = true
    }

    const traffic = environment.traffic
    const speed = BASE_SPEED + (JAM_SPEED - BASE_SPEED) * Math.pow(traffic, 1.5)
    travel.current += speed * Math.min(delta, 0.1)

    const span = RANGE * 2
    const gap = span / CARS_PER_LANE

    cars.forEach((car, i) => {
      const { lane } = car
      const visibleCar = car.chance < traffic
      let t = (((car.slot * gap + lane.phase * span + travel.current) % span) + span) % span - RANGE
      t *= lane.dir

      const x = lane.axis === 'x' ? t : lane.line + lane.offset
      const z = lane.axis === 'x' ? lane.line + lane.offset : t
      const hidden = !visibleCar || isInsideLake(x, z, 1)

      dummy.position.set(x, 0, z)
      dummy.rotation.set(0, lane.axis === 'x' ? (lane.dir === 1 ? 0 : Math.PI) : lane.dir === 1 ? -Math.PI / 2 : Math.PI / 2, 0)
      dummy.scale.setScalar(hidden ? 0 : 1)
      dummy.updateMatrix()
      body.setMatrixAt(i, dummy.matrix)
      cabin.setMatrixAt(i, dummy.matrix)
      head.setMatrixAt(i, dummy.matrix)
      tail.setMatrixAt(i, dummy.matrix)
    })

    for (const m of [body, cabin, head, tail]) m.instanceMatrix.needsUpdate = true

    // 어두울수록 전조등·후미등이 밝게
    const glow = 0.35 + 0.65 * environment.darkness
    ;(head.material as MeshBasicMaterial).color.setRGB(1, 0.96, 0.85).multiplyScalar(glow * 1.6)
    ;(tail.material as MeshBasicMaterial).color.setRGB(1, 0.12, 0.08).multiplyScalar(glow * 1.4)
  })

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometries.body, undefined, cars.length]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.35} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[geometries.cabin, undefined, cars.length]} frustumCulled={false}>
        <meshStandardMaterial color="#1b222c" roughness={0.2} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[geometries.head, undefined, cars.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tailRef} args={[geometries.tail, undefined, cars.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
