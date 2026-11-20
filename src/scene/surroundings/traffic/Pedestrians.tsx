import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, InstancedMesh, Object3D, SphereGeometry } from 'three'
import { createRandom, range } from '../../../lib/random'
import { environment } from '../../environment'
import { BLOCK_SIZE, blockCenters, isInsideLake, ROAD, SIDEWALK_HEIGHT, WALKWAY_INSET } from '../layout'
import { type Axis, canWalk } from './signals'

/**
 * 거리를 걷는 사람들.
 * - 블록 둘레 보도를 따라 걷다가, 모서리에서 가끔 횡단보도를 건너 옆 블록으로 감
 * - 보행 신호(같은 방향 차가 초록)일 때만 출발, 아니면 모서리에서 기다림
 * - 시간대별 인원은 environment.pedestrians
 */
const PED_RANGE = 80 // 건물 근처 블록에만 (멀리선 어차피 안 보임)
const POOL = 600
const SCALE = 1.25
const P = BLOCK_SIZE / 2 - WALKWAY_INSET // 블록 중심에서 걷는 줄까지
const SIDE = P * 2
const PERIMETER = SIDE * 4
const CROSS_CHANCE = 0.4

/** 모서리 번호 → 블록 중심 기준 부호. u = k * SIDE 위치 */
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]

type Ped = {
  slot: number
  bx: number
  bz: number
  u: number
  dir: 1 | -1
  speed: number
  phase: number
  state: 'walk' | 'wait' | 'cross'
  /** 기다리거나 건너는 중일 때 */
  cross?: { axis: Axis; from: [number, number]; to: [number, number]; toBlock: [number, number]; toCorner: number; t: number }
}

function blockKey(x: number, z: number) {
  return `${x},${z}`
}

/** 걸어 다닐 블록들 (호수에 걸친 블록 제외) */
function walkableBlocks() {
  const set = new Set<string>()
  const list: [number, number][] = []
  for (const bx of blockCenters()) {
    for (const bz of blockCenters()) {
      if (Math.hypot(bx, bz) > PED_RANGE) continue
      const corners = CORNERS.map(([sx, sz]) => [bx + sx * BLOCK_SIZE / 2, bz + sz * BLOCK_SIZE / 2])
      if (corners.some(([x, z]) => isInsideLake(x, z, 1)) || isInsideLake(bx, bz, 2)) continue
      set.add(blockKey(bx, bz))
      list.push([bx, bz])
    }
  }
  return { set, list }
}

function perimeterPoint(u: number): [number, number, number] {
  // 반환: 블록 중심 기준 x, z, 진행 방향 각도(u 증가 방향)
  const k = Math.floor(u / SIDE) % 4
  const f = u - k * SIDE
  switch (k) {
    case 0:
      return [-P + f, -P, 0]
    case 1:
      return [P, -P + f, -Math.PI / 2]
    case 2:
      return [P - f, P, Math.PI]
    default:
      return [-P, P - f, Math.PI / 2]
  }
}

const SKIN = ['#f1d3b8', '#e3b994', '#c99a74', '#f5dcc6']
const CLOTHES = ['#2f3542', '#57606f', '#e8e8e8', '#3b5b92', '#a33b3b', '#2e5e4e', '#c9a26b', '#1f1f24', '#7d5ba6']

const dummy = new Object3D()

export function Pedestrians() {
  const { blocks, colors } = useMemo(() => {
    const rand = createRandom(777)
    return {
      blocks: walkableBlocks(),
      colors: Array.from({ length: POOL }, () => ({
        body: new Color(CLOTHES[Math.floor(rand() * CLOTHES.length)]),
        head: new Color(SKIN[Math.floor(rand() * SKIN.length)]),
      })),
    }
  }, [])
  const rand = useMemo(() => createRandom(9001), [])
  const peds = useRef<Ped[]>([])
  const free = useRef<number[]>(Array.from({ length: POOL }, (_, i) => POOL - 1 - i))
  const bodyRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)

  const geometries = useMemo(
    () => ({
      body: new CylinderGeometry(0.13, 0.16, 0.62, 8).translate(0, 0.31, 0),
      head: new SphereGeometry(0.11, 10, 8).translate(0, 0.74, 0),
    }),
    [],
  )

  useLayoutEffect(() => {
    colors.forEach((c, i) => {
      bodyRef.current?.setColorAt(i, c.body)
      headRef.current?.setColorAt(i, c.head)
    })
    for (const m of [bodyRef.current, headRef.current]) if (m?.instanceColor) m.instanceColor.needsUpdate = true
  }, [colors])

  const spawn = () => {
    const [bx, bz] = blocks.list[Math.floor(rand() * blocks.list.length)]
    peds.current.push({
      slot: free.current.pop()!,
      bx,
      bz,
      u: rand() * PERIMETER,
      dir: rand() < 0.5 ? 1 : -1,
      speed: range(rand, 1.1, 1.7),
      phase: rand() * 10,
      state: 'walk',
    })
  }

  /** 모서리에 도착했을 때: 건널지, 그냥 돌아서 계속 걸을지 */
  const arriveAtCorner = (p: Ped, corner: number) => {
    if (rand() > CROSS_CHANCE) return
    const [sx, sz] = CORNERS[corner]
    const options: Ped['cross'][] = []
    const fromX = p.bx + sx * P
    const fromZ = p.bz + sz * P
    const step = ROAD.width + BLOCK_SIZE - SIDE // 걷는 줄에서 길 건너 걷는 줄까지
    // x 방향으로 건너기 → 옆 블록의 맞은편 모서리
    const nx = p.bx + sx * (BLOCK_SIZE + ROAD.width)
    if (blocks.set.has(blockKey(nx, p.bz))) {
      options.push({
        axis: 'x',
        from: [fromX, fromZ],
        to: [fromX + sx * step, fromZ],
        toBlock: [nx, p.bz],
        toCorner: CORNERS.findIndex(([cx, cz]) => cx === -sx && cz === sz),
        t: 0,
      })
    }
    const nz = p.bz + sz * (BLOCK_SIZE + ROAD.width)
    if (blocks.set.has(blockKey(p.bx, nz))) {
      options.push({
        axis: 'z',
        from: [fromX, fromZ],
        to: [fromX, fromZ + sz * step],
        toBlock: [p.bx, nz],
        toCorner: CORNERS.findIndex(([cx, cz]) => cx === sx && cz === -sz),
        t: 0,
      })
    }
    if (options.length === 0) return
    p.cross = options[Math.floor(rand() * options.length)]
    p.state = 'wait'
  }

  useFrame((_, rawDelta) => {
    const body = bodyRef.current
    const head = headRef.current
    if (!body || !head) return
    const dt = Math.min(rawDelta, 0.1)

    // 인원 맞추기: 늘었으면 바로 등장, 줄었으면 걷던 사람부터 천천히 퇴장
    const target = Math.round(POOL * environment.pedestrians)
    while (peds.current.length < target && free.current.length > 0) spawn()
    if (peds.current.length > target && rand() < 0.3) {
      const i = peds.current.findIndex((p) => p.state === 'walk')
      if (i >= 0) free.current.push(peds.current.splice(i, 1)[0].slot)
    }

    for (const p of peds.current) {
      p.phase += dt * p.speed * 6

      if (p.state === 'walk') {
        const before = p.u
        p.u = (((p.u + p.dir * p.speed * dt) % PERIMETER) + PERIMETER) % PERIMETER
        // 모서리를 지났는지 (진행 방향 기준)
        const kBefore = Math.floor(before / SIDE)
        const kAfter = Math.floor(p.u / SIDE)
        if (kBefore !== kAfter) {
          const corner = p.dir === 1 ? (kBefore + 1) % 4 : kBefore % 4
          p.u = corner * SIDE
          arriveAtCorner(p, corner)
          if (p.state === 'walk' && p.dir === -1) p.u = (p.u - 0.001 + PERIMETER) % PERIMETER
        }
      } else if (p.state === 'wait' && p.cross) {
        if (canWalk(p.cross.axis)) p.state = 'cross'
      } else if (p.state === 'cross' && p.cross) {
        p.cross.t += (p.speed * 1.1 * dt) / (ROAD.width + BLOCK_SIZE - SIDE)
        if (p.cross.t >= 1) {
          ;[p.bx, p.bz] = p.cross.toBlock
          p.u = p.cross.toCorner * SIDE
          p.dir = rand() < 0.5 ? 1 : -1
          if (p.dir === -1) p.u = (p.u - 0.001 + PERIMETER) % PERIMETER
          p.cross = undefined
          p.state = 'walk'
        }
      }

      // 위치·방향
      let x: number
      let z: number
      let yaw: number
      let y = SIDEWALK_HEIGHT
      let moving = true
      if (p.state === 'walk') {
        const [lx, lz, a] = perimeterPoint(p.u)
        x = p.bx + lx
        z = p.bz + lz
        yaw = p.dir === 1 ? a : a + Math.PI
      } else {
        const c = p.cross!
        const t = p.state === 'cross' ? c.t : 0
        x = c.from[0] + (c.to[0] - c.from[0]) * t
        z = c.from[1] + (c.to[1] - c.from[1]) * t
        yaw = Math.atan2(c.to[0] - c.from[0], c.to[1] - c.from[1]) - Math.PI / 2
        const edge = WALKWAY_INSET / (ROAD.width + BLOCK_SIZE - SIDE)
        if (t > edge && t < 1 - edge) y = 0 // 차도 위
        moving = p.state === 'cross'
      }

      const bob = moving ? Math.abs(Math.sin(p.phase)) * 0.05 : 0
      dummy.position.set(x, y + bob, z)
      dummy.rotation.set(0, yaw + Math.PI / 2, moving ? Math.sin(p.phase) * 0.06 : 0)
      dummy.scale.setScalar(SCALE)
      dummy.updateMatrix()
      body.setMatrixAt(p.slot, dummy.matrix)
      head.setMatrixAt(p.slot, dummy.matrix)
    }

    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (const slot of free.current) {
      body.setMatrixAt(slot, dummy.matrix)
      head.setMatrixAt(slot, dummy.matrix)
    }
    body.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometries.body, undefined, POOL]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[geometries.head, undefined, POOL]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  )
}
