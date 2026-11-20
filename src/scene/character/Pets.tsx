import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { type Group, InstancedMesh, Object3D, type Points, Vector3 } from 'three'
import type { ActivityKind } from '../../data/rooms'
import type { RoomSize } from '../rooms/types'
import { RabbitBody, type RabbitFur } from './RabbitBody'

/**
 * 방에 사는 토끼·달팽이 캐릭터. 원점 = 방 바닥 한가운데 (RoomView와 같은 좌표).
 * 사람처럼 가구 자리를 찾지 않고 방 안을 알아서 돌아다님
 */

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** 바닥에서 막힌 사각형 (가구). 토끼가 가구 속으로 들어가지 않게 */
export type Obstacle = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}
const inside = (obs: Obstacle[], x: number, z: number, pad = 0.18) =>
  obs.some((o) => x > o.minX - pad && x < o.maxX + pad && z > o.minZ - pad && z < o.maxZ + pad)

/* ───────── 토끼 ───────── */

type RabbitMode = 'hop' | 'loaf' | 'flop' | 'binky' | 'nibble' | 'drink' | 'sniff' | 'potty' | 'hide'

/** 방에 놓인 토끼 살림. x, z = 바닥 위치, rot = 도 (아이템 rot 그대로) */
export type RabbitPlace = { x: number; z: number; rot: number }
export type RabbitPlaces = {
  /** 배변판: 밥그릇·물그릇까지 같이 있는 판. 여기서 먹고 마시고 쌈 */
  pan?: RabbitPlace
  /** 숨숨집: 앞(+z)이 열려 있어서 들어가서 숨음 */
  house?: RabbitPlace & { rect: Obstacle }
}

/** 아이템 기준 좌표 → 방 좌표 */
function toRoom(p: RabbitPlace, lx: number, lz: number) {
  const r = (p.rot * Math.PI) / 180
  return new Vector3(p.x + lx * Math.cos(r) + lz * Math.sin(r), 0, p.z - lx * Math.sin(r) + lz * Math.cos(r))
}

/** 지금 하는 일에 따라 다음 행동 고르기 */
function nextRabbitMode(kind: ActivityKind, places: RabbitPlaces): RabbitMode {
  const r = Math.random()
  const q = Math.random()
  // 살림이 있으면 가끔 찾아감: 배변판에서 볼일·물, 숨숨집에 쏙
  if (places.pan && q < (kind === 'sleep' ? 0.05 : 0.1)) return 'potty'
  if (places.pan && q < (kind === 'sleep' ? 0.08 : 0.17)) return 'drink'
  if (places.house && q < (kind === 'sleep' ? 0.6 : 0.27)) return 'hide'
  if (kind === 'sleep') return r < 0.55 ? 'loaf' : 'flop'
  if (kind === 'eat') return r < 0.7 ? 'nibble' : 'hop'
  if (kind === 'exercise') return r < 0.5 ? 'binky' : 'hop'
  // 평소: 깡총깡총 돌아다니다가, 웅크리거나, 갑자기 옆으로 휙 눕거나, 가끔 빙키
  if (r < 0.38) return 'hop'
  if (r < 0.55) return 'sniff'
  if (r < 0.7) return 'loaf'
  if (r < 0.85) return 'flop'
  return 'binky'
}

const MODE_TIME: Record<RabbitMode, [number, number]> = {
  hop: [2, 5],
  loaf: [6, 14],
  flop: [6, 16],
  binky: [1.1, 1.1],
  nibble: [5, 10],
  drink: [3, 6],
  sniff: [2, 4],
  potty: [8, 15],
  hide: [15, 40],
}

/** 배변판 위 자리 (판 기준). 그릇은 판 뒤쪽(-z), 토끼는 그 앞에서 뒤를 보고 먹음 */
export const PAN_SCALE = 0.48
export const PAN = { food: [-0.28 * PAN_SCALE, -0.16 * PAN_SCALE], water: [0.3 * PAN_SCALE, -0.18 * PAN_SCALE] } as const

const MAX_POOP = 60
/** 토끼 크기 (모델 기준 배율) */
const SCALE = 1.4

export function RabbitCharacter({
  kind,
  size,
  fur = 'mine',
  obstacles = [],
  places = {},
}: {
  kind: ActivityKind
  size: RoomSize
  fur?: RabbitFur
  /** 피해 다닐 가구 (숨숨집 빼고) */
  obstacles?: Obstacle[]
  places?: RabbitPlaces
}) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const ears = useRef<Group>(null)
  const poopRef = useRef<InstancedMesh>(null)

  const house = places.house
  /** 숨숨집도 평소엔 가구 */
  const blocked = (x: number, z: number, hiding = false) =>
    inside(obstacles, x, z) || (!!house && !hiding && inside([house.rect], x, z))

  const bounds = { x: size.w / 2 - 0.4, z: size.d / 2 - 0.4 }
  /** 가구 없는 빈 바닥 한 점 */
  const freeSpot = () => {
    for (let i = 0; i < 30; i++) {
      const p = new Vector3(rand(-bounds.x, bounds.x), 0, rand(-bounds.z, bounds.z))
      if (!blocked(p.x, p.z)) return p
    }
    return new Vector3(0, 0, bounds.z * 0.8)
  }
  const state = useRef({
    mode: 'loaf' as RabbitMode,
    until: 0,
    pos: freeSpot(),
    target: new Vector3(),
    /** 찾아가는 길 (차례대로). 비면 도착 */
    path: [] as Vector3[],
    /** 도착하면 볼 방향 */
    face: null as number | null,
    yaw: rand(0, Math.PI * 2),
    modeStart: 0,
    flopSide: 1,
    nextPoop: 3,
    poops: [] as Vector3[],
  })

  // 처음부터 바닥에 똥이 좀 굴러다님 ㅋㅋ
  useMemo(() => {
    for (let i = 0; i < 18; i++) state.current.poops.push(freeSpot())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dummy = useMemo(() => new Object3D(), [])
  const drawPoops = () => {
    const mesh = poopRef.current
    if (!mesh) return
    state.current.poops.forEach((p, i) => {
      dummy.position.set(p.x, p.y + 0.026, p.z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = state.current.poops.length
    mesh.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(drawPoops)

  /** 배변판 위에 있나 (판 높이만큼 올라섬) */
  const onPan = (x: number, z: number) => {
    const pan = places.pan
    if (!pan) return false
    const r = (pan.rot * Math.PI) / 180
    const dx = x - pan.x
    const dz = z - pan.z
    const lx = dx * Math.cos(r) - dz * Math.sin(r)
    const lz = dx * Math.sin(r) + dz * Math.cos(r)
    return Math.abs(lx) < 0.6 * PAN_SCALE && Math.abs(lz) < 0.42 * PAN_SCALE
  }

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const s = state.current
    const dt = Math.min(delta, 0.1)

    if (t > s.until) {
      s.mode = nextRabbitMode(kind, places)
      const [a, b] = MODE_TIME[s.mode]
      s.modeStart = t
      s.until = t + rand(a, b) * (kind === 'sleep' ? 3 : 1)
      s.flopSide = Math.random() < 0.5 ? -1 : 1
      s.path = []
      s.face = null
      if (s.mode === 'hop') s.target.copy(freeSpot())
      // 풀어 키우는 토끼: 밥·물·볼일은 배변판까지, 숨을 땐 숨숨집 안까지 깡총깡총 가서
      const pan = places.pan
      const turn = (p: RabbitPlace, local: number) => ((p.rot + local) * Math.PI) / 180
      if (pan && (s.mode === 'nibble' || s.mode === 'drink')) {
        const [bx] = s.mode === 'nibble' ? PAN.food : PAN.water
        s.path = [toRoom(pan, bx, 0.14)]
        s.face = turn(pan, 180)
      } else if (pan && s.mode === 'potty') {
        s.path = [toRoom(pan, rand(-0.08, 0.08), 0.03)]
        s.face = turn(pan, rand(-60, 60))
      } else if (house && s.mode === 'hide') {
        // 문 앞까지 갔다가 안으로. 안에서는 문 쪽(밖)을 보고 웅크림
        s.path = [toRoom(house, 0, 0.45), toRoom(house, 0, 0.04)]
        s.face = turn(house, 0)
      }
      // 숨숨집 안에 있었으면 일단 문으로 나옴
      if (house && s.mode !== 'hide' && inside([house.rect], s.pos.x, s.pos.z)) s.path.unshift(toRoom(house, 0, 0.45))
      if (s.path.length) s.until = t + 20 // 못 가면 포기
    }
    const local = t - s.modeStart
    const arrived = s.path.length === 0

    // 똥: 자는 동안엔 뜸하게. 엉덩이 뒤쪽에 떨굼. 배변판에선 연달아
    if (t > s.nextPoop) {
      const sitting = s.mode === 'potty' && arrived
      s.nextPoop = t + (sitting ? rand(1.5, 3) : kind === 'sleep' ? rand(15, 30) : rand(4, 10))
      const back = new Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw)).multiplyScalar(0.14 * SCALE)
      const at = s.pos
        .clone()
        .add(back)
        .add(new Vector3(rand(-0.03, 0.03), 0, rand(-0.03, 0.03)))
      at.y = onPan(at.x, at.z) ? 0.035 * PAN_SCALE : 0
      s.poops.push(at)
      if (s.poops.length > MAX_POOP) s.poops.shift()
      drawPoops()
    }

    let y = 0
    let tilt = 0
    let roll = 0
    let squash = 1
    let headDip = 0
    let earDrop = 0

    /** 목표까지 깡총깡총. 도착하면 true. free=목표가 빈 바닥이라 막히면 다른 데로 */
    const walk = (to3: Vector3, free: boolean) => {
      const to = to3.clone().sub(s.pos)
      const dist = to.length()
      if (dist <= 0.03) {
        if (free) s.until = Math.min(s.until, t + 0.3)
        return true
      }
      s.yaw = Math.atan2(to.x, to.z)
      const next = s.pos.clone().addScaledVector(to.normalize(), Math.min(dist, dt * 0.7))
      const hiding = s.mode === 'hide'
      // 가구에 막히면: 그냥 돌아다니던 거면 다른 데로, 찾아가던 거면 옆으로 비켜서 계속
      // 숨숨집 안으로 들어가는 중이거나 안에서 나오는 중이면 집 벽은 무시
      const throughDoor = (hiding && s.path.length === 1) || (!!house && inside([house.rect], s.pos.x, s.pos.z))
      if (!throughDoor && blocked(next.x, next.z, hiding)) {
        if (free) s.until = Math.min(s.until, t)
        else {
          const side = new Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw)).multiplyScalar(dt * 0.7)
          const alt = s.pos.clone().add(side)
          if (!blocked(alt.x, alt.z, hiding)) s.pos.copy(alt)
          else s.until = Math.min(s.until, t)
        }
      } else s.pos.copy(next)
      const phase = (t * 3.2) % 1
      y = Math.sin(phase * Math.PI) * 0.1
      tilt = Math.sin(phase * Math.PI * 2) * 0.15
      return false
    }

    if (!arrived) {
      if (walk(s.path[0], false)) {
        s.path.shift()
        if (s.path.length === 0) {
          // 도착한 다음부터 시간 잼
          const [a, b] = MODE_TIME[s.mode]
          s.modeStart = t
          s.until = t + rand(a, b) * (kind === 'sleep' && s.mode === 'hide' ? 3 : 1)
          if (s.face !== null) s.yaw = s.face
        }
      }
    } else {
      switch (s.mode) {
        case 'hop':
          walk(s.target, true)
          break
        case 'binky': {
          // 점프하면서 공중에서 몸을 비틀기
          const p = Math.min(1, local / 1.1)
          y = Math.sin(p * Math.PI) * 0.35
          roll = Math.sin(p * Math.PI * 2) * 0.9
          tilt = -0.3 * Math.sin(p * Math.PI)
          break
        }
        case 'loaf':
        case 'potty':
          squash = 0.82
          earDrop = 0.9
          headDip = 0.15
          break
        case 'hide':
          // 집 안에선 귀 착 붙이고 납작 (얼굴은 문 밖으로 빼꼼)
          squash = 0.7
          earDrop = 1.35
          headDip = 0.1
          break
        case 'flop': {
          // 갑자기 옆으로 휙
          const p = Math.min(1, local / 0.35)
          roll = s.flopSide * (Math.PI / 2) * p
          earDrop = 1.2
          break
        }
        case 'nibble':
          headDip = 0.35 + Math.sin(t * 14) * 0.05
          break
        case 'drink':
          // 할짝할짝
          headDip = 0.45 + Math.sin(t * 18) * 0.03
          break
        case 'sniff':
          headDip = -0.1 + Math.sin(t * 9) * 0.03
          break
      }
    }
    // 배변판 위면 판 두께만큼 올라섬
    if (onPan(s.pos.x, s.pos.z)) y += 0.035 * PAN_SCALE

    if (root.current) {
      root.current.position.set(s.pos.x, y, s.pos.z)
      root.current.rotation.set(0, s.yaw, 0)
    }
    if (body.current) {
      body.current.rotation.set(tilt, 0, roll)
      body.current.scale.set(SCALE / Math.sqrt(squash), SCALE * squash, SCALE)
      // 옆으로 돌면 몸통 중심이 바닥 밑으로 들어가니까 그만큼 띄움
      body.current.position.y = Math.abs(Math.sin(roll)) * 0.073 * SCALE
    }
    if (head.current) head.current.rotation.x = headDip + Math.sin(t * 11) * 0.015
    if (ears.current) ears.current.rotation.x = earDrop + (s.mode === 'sniff' ? Math.sin(t * 2) * 0.2 : 0)
  })

  return (
    <>
      <group ref={root}>
        <group ref={body} scale={SCALE}>
          <RabbitBody fur={fur} headRef={head} earsRef={ears} />
        </group>
      </group>
      <instancedMesh ref={poopRef} args={[undefined, undefined, MAX_POOP + 20]} frustumCulled={false}>
        <sphereGeometry args={[0.026, 8, 6]} />
        <meshStandardMaterial color="#4a3426" roughness={1} />
      </instancedMesh>
    </>
  )
}

/* ───────── 달팽이 ───────── */

const TRAIL = 80

/**
 * 명주달팽이. 천장에 거꾸로 붙어서 아주 천천히 기어다님 (가끔 벽 위쪽).
 * 지나간 자리엔 반짝이는 점액 자국. 잘 때는 껍데기 속으로 쏙
 */
export function SnailCharacter({
  kind,
  size,
  onCeiling = true,
}: {
  kind: ActivityKind
  size: RoomSize
  onCeiling?: boolean
}) {
  const root = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const trailRef = useRef<Points>(null)
  const bounds = { x: size.w / 2 - 0.2, z: size.d / 2 - 0.2 }
  const state = useRef({
    pos: new Vector3(rand(-bounds.x, bounds.x) * 0.5, 0, rand(-bounds.z, bounds.z) * 0.5),
    target: new Vector3(),
    yaw: 0,
    retarget: 0,
    lastTrail: 0,
    trail: [] as Vector3[],
  })
  const trailPositions = useMemo(() => new Float32Array(TRAIL * 3), [])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const s = state.current
    const sleeping = kind === 'sleep'
    const dt = Math.min(delta, 0.1)

    if (t > s.retarget) {
      s.retarget = t + rand(20, 45)
      s.target.set(rand(-bounds.x, bounds.x), 0, rand(-bounds.z, bounds.z))
    }
    if (!sleeping) {
      const to = s.target.clone().sub(s.pos)
      if (to.length() > 0.02) {
        // 방향을 아주 천천히 틂
        const want = Math.atan2(to.x, to.z)
        let diff = want - s.yaw
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        s.yaw += diff * dt * 0.4
        s.pos.x += Math.sin(s.yaw) * dt * 0.018
        s.pos.z += Math.cos(s.yaw) * dt * 0.018
      }
      if (t - s.lastTrail > 1.2) {
        s.lastTrail = t
        s.trail.push(s.pos.clone())
        if (s.trail.length > TRAIL) s.trail.shift()
        s.trail.forEach((p, i) => trailPositions.set([p.x, 0, p.z], i * 3))
        const geo = trailRef.current?.geometry
        if (geo) {
          geo.attributes.position.needsUpdate = true
          geo.setDrawRange(0, s.trail.length)
        }
      }
    }

    root.current?.position.set(s.pos.x, 0, s.pos.z)
    root.current?.rotation.set(0, s.yaw, 0)
    if (bodyRef.current) {
      // 자면 몸을 껍데기 속으로 집어넣음, 깨어 있으면 꿈틀꿈틀
      const out = sleeping ? 0.05 : 1
      const cur = bodyRef.current.scale.x
      const next = cur + (out - cur) * Math.min(1, dt * 1.5)
      bodyRef.current.scale.set(next, next, next * (1 + Math.sin(t * 1.3) * 0.04))
    }
  })

  // 천장이면 거꾸로 매달림 (y = 천장 높이, 위아래 뒤집기)
  return (
    <group
      position-y={onCeiling ? size.h - 0.005 : 0}
      rotation-x={onCeiling ? Math.PI : 0}
      scale={[1, 1, onCeiling ? -1 : 1]}
    >
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#cfe6ff" size={0.02} transparent opacity={0.45} depthWrite={false} />
      </points>
      <group ref={root}>
        <group scale={3.6}>
          <group ref={bodyRef}>
            <mesh position={[0, 0.008, 0.008]} scale={[0.014, 0.008, 0.034]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#c9bba3" roughness={0.4} />
            </mesh>
            {[-1, 1].map((sx) => (
              <group key={sx} position={[sx * 0.004, 0.012, 0.038]} rotation={[0.7, 0, sx * 0.3]}>
                <mesh position-y={0.008}>
                  <cylinderGeometry args={[0.0012, 0.0015, 0.016, 5]} />
                  <meshStandardMaterial color="#b5a68e" />
                </mesh>
                <mesh position-y={0.016}>
                  <sphereGeometry args={[0.002, 6, 4]} />
                  <meshStandardMaterial color="#3a3226" />
                </mesh>
              </group>
            ))}
          </group>
          {/* 연갈색 반투명 껍데기 */}
          <mesh position={[0, 0.02, -0.004]} rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.011, 0.008, 10, 20]} />
            <meshPhysicalMaterial color="#d8b77a" transmission={0.3} roughness={0.3} thickness={0.01} />
          </mesh>
          <mesh position={[0, 0.021, -0.004]}>
            <sphereGeometry args={[0.009, 10, 8]} />
            <meshPhysicalMaterial color="#c9a465" roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
