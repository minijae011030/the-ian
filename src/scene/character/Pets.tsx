import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { type Group, InstancedMesh, Object3D, type Points, Vector3 } from 'three'
import type { ActivityKind } from '../../data/rooms'
import type { RoomSize } from '../rooms/types'

/**
 * 방에 사는 토끼·달팽이 캐릭터. 원점 = 방 바닥 한가운데 (RoomView와 같은 좌표).
 * 사람처럼 가구 자리를 찾지 않고 방 안을 알아서 돌아다님
 */

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** 바닥에서 막힌 사각형 (가구). 토끼가 가구 속으로 들어가지 않게 */
export type Obstacle = { minX: number; maxX: number; minZ: number; maxZ: number }
const inside = (obs: Obstacle[], x: number, z: number, pad = 0.08) =>
  obs.some((o) => x > o.minX - pad && x < o.maxX + pad && z > o.minZ - pad && z < o.maxZ + pad)

/* ───────── 토끼 ───────── */

type RabbitMode = 'hop' | 'loaf' | 'flop' | 'binky' | 'nibble' | 'sniff'

/** 지금 하는 일에 따라 다음 행동 고르기 */
function nextRabbitMode(kind: ActivityKind): RabbitMode {
  const r = Math.random()
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
  nibble: [4, 9],
  sniff: [2, 4],
}

const MAX_POOP = 60
const SCALE = 1.5

export function RabbitCharacter({
  kind,
  size,
  fur = 'white',
  obstacles = [],
}: {
  kind: ActivityKind
  size: RoomSize
  fur?: 'white' | 'brown'
  obstacles?: Obstacle[]
}) {
  const color = fur === 'brown' ? '#9a7458' : '#f2efe9'
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const ears = useRef<Group>(null)
  const poopRef = useRef<InstancedMesh>(null)

  const bounds = { x: size.w / 2 - 0.25, z: size.d / 2 - 0.25 }
  /** 가구 없는 빈 바닥 한 점 */
  const freeSpot = () => {
    for (let i = 0; i < 30; i++) {
      const p = new Vector3(rand(-bounds.x, bounds.x), 0, rand(-bounds.z, bounds.z))
      if (!inside(obstacles, p.x, p.z)) return p
    }
    return new Vector3(0, 0, bounds.z * 0.8)
  }
  const state = useRef({
    mode: 'loaf' as RabbitMode,
    until: 0,
    pos: freeSpot(),
    target: new Vector3(),
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
      dummy.position.set(p.x, 0.018, p.z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = state.current.poops.length
    mesh.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(drawPoops)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const s = state.current
    const dt = Math.min(delta, 0.1)

    if (t > s.until) {
      s.mode = nextRabbitMode(kind)
      const [a, b] = MODE_TIME[s.mode]
      s.modeStart = t
      s.until = t + rand(a, b) * (kind === 'sleep' ? 3 : 1)
      s.flopSide = Math.random() < 0.5 ? -1 : 1
      if (s.mode === 'hop') s.target.copy(freeSpot())
    }
    const local = t - s.modeStart

    // 똥: 자는 동안엔 뜸하게. 엉덩이 뒤쪽에 떨굼
    if (t > s.nextPoop) {
      s.nextPoop = t + (kind === 'sleep' ? rand(15, 30) : rand(4, 10))
      const back = new Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw)).multiplyScalar(0.14 * SCALE)
      s.poops.push(s.pos.clone().add(back).add(new Vector3(rand(-0.03, 0.03), 0, rand(-0.03, 0.03))))
      if (s.poops.length > MAX_POOP) s.poops.shift()
      drawPoops()
    }

    let y = 0
    let tilt = 0
    let roll = 0
    let squash = 1
    let headDip = 0
    let earDrop = 0

    switch (s.mode) {
      case 'hop': {
        const to = s.target.clone().sub(s.pos)
        const dist = to.length()
        if (dist > 0.03) {
          s.yaw = Math.atan2(to.x, to.z)
          const next = s.pos.clone().addScaledVector(to.normalize(), Math.min(dist, dt * 0.45))
          // 가구에 막히면 그 자리에서 멈추고 다른 데로
          if (inside(obstacles, next.x, next.z)) s.until = Math.min(s.until, t)
          else s.pos.copy(next)
          const phase = (t * 3.2) % 1
          y = Math.sin(phase * Math.PI) * 0.06
          tilt = Math.sin(phase * Math.PI * 2) * 0.15
        } else s.until = Math.min(s.until, t + 0.3)
        break
      }
      case 'binky': {
        // 점프하면서 공중에서 몸을 비틀기
        const p = Math.min(1, local / 1.1)
        y = Math.sin(p * Math.PI) * 0.22
        roll = Math.sin(p * Math.PI * 2) * 0.9
        tilt = -0.3 * Math.sin(p * Math.PI)
        break
      }
      case 'loaf':
        squash = 0.82
        earDrop = 0.9
        headDip = 0.15
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
      case 'sniff':
        headDip = -0.1 + Math.sin(t * 9) * 0.03
        break
    }

    if (root.current) {
      root.current.position.set(s.pos.x, y, s.pos.z)
      root.current.rotation.set(0, s.yaw, 0)
    }
    if (body.current) {
      body.current.rotation.set(tilt, 0, roll)
      body.current.scale.set(1 / Math.sqrt(squash), squash, 1)
      // 옆으로 돌면 몸통 중심이 바닥 밑으로 들어가니까 그만큼 띄움
      body.current.position.y = Math.abs(Math.sin(roll)) * 0.11
    }
    if (head.current) head.current.rotation.x = headDip + Math.sin(t * 11) * 0.015
    if (ears.current) ears.current.rotation.x = earDrop + (s.mode === 'sniff' ? Math.sin(t * 2) * 0.2 : 0)
  })

  return (
    <>
      <group ref={root}>
        <group ref={body} scale={SCALE}>
          <mesh position={[0, 0.09, -0.02]} scale={[0.09, 0.08, 0.12]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.07, -0.13]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <group ref={head} position={[0, 0.15, 0.08]}>
            <mesh scale={[0.06, 0.055, 0.065]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={sx} position={[sx * 0.03, 0.01, 0.05]}>
                <sphereGeometry args={[0.008, 6, 4]} />
                <meshBasicMaterial color="#1a1a1a" />
              </mesh>
            ))}
            <mesh position={[0, -0.01, 0.064]}>
              <sphereGeometry args={[0.006, 6, 4]} />
              <meshStandardMaterial color="#e8a0a0" />
            </mesh>
            <group ref={ears} position={[0, 0.04, -0.01]}>
              {[-1, 1].map((sx) => (
                <mesh key={sx} position={[sx * 0.025, 0.06, 0]} rotation-z={sx * -0.15} scale={[0.018, 0.07, 0.01]}>
                  <sphereGeometry args={[1, 8, 6]} />
                  <meshStandardMaterial color={color} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      </group>
      <instancedMesh ref={poopRef} args={[undefined, undefined, MAX_POOP + 20]} frustumCulled={false}>
        <sphereGeometry args={[0.018, 8, 6]} />
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
export function SnailCharacter({ kind, size, onCeiling = true }: { kind: ActivityKind; size: RoomSize; onCeiling?: boolean }) {
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
    <group position-y={onCeiling ? size.h - 0.005 : 0} rotation-x={onCeiling ? Math.PI : 0} scale={[1, 1, onCeiling ? -1 : 1]}>
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
