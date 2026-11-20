import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { type Group, Matrix4, type Points, Quaternion, RepeatWrapping, Vector3 } from 'three'
import type { ActivityKind } from '../../data/rooms'
import { canvasTexture } from '../../lib/canvasTexture'
import type { RoomSize } from '../rooms/types'

/**
 * 명주달팽이. 모델은 1 = 1cm (껍데기 지름 2.5, 몸 길이 6쯤), 방에선 SNAIL_SCALE배.
 * 평소엔 천장에 거꾸로 붙어 다니고, 밥 땐 애호박까지, 잘 땐 달팽이 집 문간까지
 * 벽을 타고 내려옴. 지나간 자리엔 반짝이는 점액 자국
 */
export const SNAIL_SCALE = 0.1

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/* ───────── 모델 ───────── */

/** 노란 바탕에 흑갈색 얼룩 띠 + 가는 나선 줄 */
function useShellTexture() {
  return useMemo(() => {
    const tex = canvasTexture(256, 128, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 128)
      g.addColorStop(0, '#b98f4a')
      g.addColorStop(0.5, '#d6b263')
      g.addColorStop(1, '#a8803f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 128)
      // 가는 성장선
      ctx.strokeStyle = 'rgba(90,60,25,0.14)'
      ctx.lineWidth = 1
      for (let x = 0; x < 256; x += 7) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 6, 128)
        ctx.stroke()
      }
      // 흑갈색 얼룩 띠 (껍데기 위쪽)
      for (let i = 0; i < 70; i++) {
        const x = (i * 37) % 256
        const y = 30 + Math.sin(i * 1.7) * 14
        ctx.fillStyle = i % 3 ? 'rgba(58,38,22,0.85)' : 'rgba(80,55,30,0.7)'
        ctx.beginPath()
        ctx.ellipse(x, y, 6 + (i % 4) * 2, 5 + (i % 3) * 3, 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    tex.wrapS = tex.wrapT = RepeatWrapping
    return tex
  }, [])
}

/** 껍데기 옆면 소용돌이 */
function useWhorlTexture() {
  return useMemo(
    () =>
      canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = '#c9a258'
        ctx.beginPath()
        ctx.arc(64, 64, 64, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#6b4a24'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let a = 0; a < Math.PI * 7; a += 0.1) {
          const r = 4 + a * 2.7
          ctx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r)
        }
        ctx.stroke()
      }),
    [],
  )
}

const BODY = '#d9c08a'

/** 달팽이 모델. 원점 = 배 밑, 머리 = +z. body = 껍데기 속으로 들어가는 부분 */
export function SnailModel({ bodyRef, headRef }: { bodyRef?: React.Ref<Group>; headRef?: React.Ref<Group> }) {
  const shell = useShellTexture()
  const whorl = useWhorlTexture()
  return (
    <group>
      <group ref={bodyRef}>
        {/* 배발: 길쭉하고 꼬리 쪽이 뾰족 */}
        <mesh position={[0, 0.32, 0.4]} scale={[0.62, 0.36, 2.9]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={BODY} roughness={0.35} />
        </mesh>
        {/* 머리·목: 앞으로 쳐들고 */}
        <group ref={headRef} position={[0, 0.45, 2.5]}>
          <mesh position={[0, 0.3, 0.25]} rotation-x={-0.5} scale={[0.5, 0.5, 0.85]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={BODY} roughness={0.35} />
          </mesh>
          {/* 큰 더듬이 (끝에 눈) */}
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * 0.18, 0.6, 0.6]} rotation={[0.65, 0, sx * -0.35]}>
              <mesh position-y={0.8}>
                <cylinderGeometry args={[0.05, 0.09, 1.6, 6]} />
                <meshStandardMaterial color="#b79f6c" roughness={0.4} />
              </mesh>
              <mesh position-y={1.62}>
                <sphereGeometry args={[0.1, 8, 6]} />
                <meshStandardMaterial color="#3b2f22" />
              </mesh>
            </group>
          ))}
          {/* 작은 더듬이 */}
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.22, 0.15, 0.95]} rotation={[1.2, 0, sx * -0.4]}>
              <cylinderGeometry args={[0.04, 0.06, 0.45, 5]} />
              <meshStandardMaterial color="#b79f6c" />
            </mesh>
          ))}
        </group>
      </group>
      {/* 껍데기: 옆으로 납작한 공 + 양옆 소용돌이 */}
      <group position={[0, 1.45, -0.35]} rotation-z={0.1}>
        <mesh scale={[0.85, 1, 1.05]}>
          <sphereGeometry args={[1.25, 24, 16]} />
          <meshStandardMaterial map={shell} roughness={0.25} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 1.04, -0.05, -0.05]} rotation-y={(sx * Math.PI) / 2}>
            <circleGeometry args={[0.72, 24]} />
            <meshStandardMaterial map={whorl} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ───────── 움직임 ───────── */

type Surface = 'floor' | 'wall' | 'ceil'
/** 기어오를 벽: 왼쪽(-x)·오른쪽(+x)·뒤(-z). 앞은 창문 */
type Wall = { axis: 'x' | 'z'; at: number; inward: Vector3 }

/** 방에 놓인 달팽이 살림 */
export type SnailPlaces = {
  house?: { x: number; z: number; rot: number }
  food?: { x: number; z: number }
}

/** 방 바닥 위 한 점과 그 점에 도착했을 때 볼 방향(yaw) */
type Goal = { surf: 'floor' | 'ceil'; x: number; z: number; face?: number }

const TRAIL = 120
const SPEED = 0.045 // m/s. 진짜보단 빠르지만 그래도 느릿느릿

export function SnailCharacter({
  kind,
  size,
  places = {},
  preview = false,
}: {
  kind: ActivityKind
  size: RoomSize
  places?: SnailPlaces
  /** 썸네일용: 바닥에 가만히 */
  preview?: boolean
}) {
  const root = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const trailRef = useRef<Points>(null)
  const { w, d, h } = size
  const half = { x: w / 2 - 0.12, z: d / 2 - 0.12 }

  const walls: Wall[] = useMemo(
    () => [
      { axis: 'x', at: -w / 2, inward: new Vector3(1, 0, 0) },
      { axis: 'x', at: w / 2, inward: new Vector3(-1, 0, 0) },
      { axis: 'z', at: -d / 2, inward: new Vector3(0, 0, 1) },
    ],
    [w, d],
  )

  const state = useRef({
    surf: (preview ? 'floor' : 'ceil') as Surface,
    pos: new Vector3(rand(-half.x, half.x) * 0.6, preview ? 0 : h, rand(-half.z, half.z) * 0.6),
    yaw: rand(0, Math.PI * 2),
    wall: null as Wall | null,
    /** 벽에 붙을 지점 (바닥·천장에서 벽까지 가는 중) */
    toWall: null as Wall | null,
    wander: new Vector3(),
    retarget: 0,
    arrived: false,
    lastTrail: 0,
    trail: [] as Vector3[],
  })
  const trailPositions = useMemo(() => new Float32Array(TRAIL * 3), [])
  const basis = useMemo(() => ({ m: new Matrix4(), q: new Quaternion() }), [])

  /** 지금 가야 할 곳 */
  const goal = (): Goal => {
    const s = state.current
    if (kind === 'sleep' && places.house) {
      // 문간에 껍데기만 빼꼼: 집 앞(+z)에서 안쪽을 보고
      const { x, z, rot } = places.house
      const r = (rot * Math.PI) / 180
      return { surf: 'floor', x: x + Math.sin(r) * 0.42, z: z + Math.cos(r) * 0.42, face: r + Math.PI }
    }
    if (kind === 'eat' && places.food) {
      // 호박 가장자리, 방 가운데 쪽에서 호박을 보고
      const { x, z } = places.food
      const away = new Vector3(-x, 0, -z)
      if (away.lengthSq() < 1e-4) away.set(0, 0, 1)
      away.normalize()
      return { surf: 'floor', x: x + away.x * 0.5, z: z + away.z * 0.5, face: Math.atan2(-away.x, -away.z) }
    }
    if (kind === 'sleep' || kind === 'eat') return { surf: s.surf === 'wall' ? 'ceil' : s.surf, x: s.pos.x, z: s.pos.z }
    return { surf: 'ceil', x: s.wander.x, z: s.wander.z }
  }

  useFrame(({ clock }, delta) => {
    if (preview) return
    const t = clock.elapsedTime
    const s = state.current
    const dt = Math.min(delta, 0.1)
    const step = SPEED * dt

    if (t > s.retarget) {
      s.retarget = t + rand(25, 50)
      s.wander.set(rand(-half.x, half.x), 0, rand(-half.z, half.z))
    }
    const g = goal()
    const surfY = (surf: 'floor' | 'ceil') => (surf === 'floor' ? 0 : h)

    /** 바닥·천장 위에서 (x,z)로 천천히 방향 틀며 기어감. 도착하면 true */
    const crawl = (x: number, z: number) => {
      const dx = x - s.pos.x
      const dz = z - s.pos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.02) return true
      const want = Math.atan2(dx, dz)
      let diff = want - s.yaw
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      s.yaw += diff * Math.min(1, dt * 0.8)
      const go = Math.min(step, dist) * Math.max(0.2, Math.cos(diff))
      s.pos.x += Math.sin(s.yaw) * go
      s.pos.z += Math.cos(s.yaw) * go
      return false
    }

    let moving = true
    if (s.surf === 'wall' && s.wall) {
      // 벽 타는 중: 목표 면 높이까지 위로/아래로
      const ty = surfY(g.surf)
      const dy = ty - s.pos.y
      if (Math.abs(dy) < 0.01) {
        s.surf = g.surf
        s.pos.y = ty
        s.pos.addScaledVector(s.wall.inward, 0.15)
        s.yaw = Math.atan2(s.wall.inward.x, s.wall.inward.z)
        s.wall = null
      } else s.pos.y += Math.sign(dy) * Math.min(step, Math.abs(dy))
    } else if (s.surf !== g.surf) {
      // 다른 면으로 가야 함 → 제일 가까운 벽까지 간 다음 벽 타기
      if (!s.toWall) {
        s.toWall = walls.reduce((best, wl) =>
          Math.abs((wl.axis === 'x' ? s.pos.x : s.pos.z) - wl.at) < Math.abs((best.axis === 'x' ? s.pos.x : s.pos.z) - best.at)
            ? wl
            : best,
        )
      }
      const wl = s.toWall
      const tx = wl.axis === 'x' ? wl.at + wl.inward.x * 0.05 : s.pos.x
      const tz = wl.axis === 'z' ? wl.at + wl.inward.z * 0.05 : s.pos.z
      if (crawl(tx, tz)) {
        s.surf = 'wall'
        s.wall = wl
        s.toWall = null
        if (wl.axis === 'x') s.pos.x = wl.at
        else s.pos.z = wl.at
      }
    } else {
      s.toWall = null
      const done = crawl(g.x, g.z)
      if (done && g.face !== undefined) {
        let diff = g.face - s.yaw
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        s.yaw += diff * Math.min(1, dt * 0.8)
      }
      moving = !done
      s.arrived = done
    }
    if (s.surf !== 'wall') s.pos.y = surfY(s.surf === 'floor' ? 'floor' : 'ceil')

    // 자세: 붙은 면의 안쪽 방향이 "위", 가는 방향이 "앞"
    const up =
      s.surf === 'floor' ? new Vector3(0, 1, 0) : s.surf === 'ceil' ? new Vector3(0, -1, 0) : s.wall!.inward.clone()
    const fwd =
      s.surf === 'wall'
        ? new Vector3(0, Math.sign(surfY(g.surf) - s.pos.y) || 1, 0)
        : new Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw))
    const right = new Vector3().crossVectors(up, fwd).normalize()
    basis.m.makeBasis(right, up, new Vector3().crossVectors(right, up))
    basis.q.setFromRotationMatrix(basis.m)
    if (root.current) {
      root.current.position.copy(s.pos)
      root.current.quaternion.copy(basis.q)
    }

    // 점액 자국
    if (moving && t - s.lastTrail > 1.2) {
      s.lastTrail = t
      s.trail.push(s.pos.clone().addScaledVector(up, 0.004))
      if (s.trail.length > TRAIL) s.trail.shift()
      s.trail.forEach((p, i) => trailPositions.set([p.x, p.y, p.z], i * 3))
      const geo = trailRef.current?.geometry
      if (geo) {
        geo.attributes.position.needsUpdate = true
        geo.setDrawRange(0, s.trail.length)
      }
    }

    // 자는 중 + 도착했으면 몸을 껍데기 속으로. 밥 먹을 땐 머리 오물오물
    const tuck = kind === 'sleep' && (s.arrived || !places.house) ? 0.05 : 1
    if (bodyRef.current) {
      const cur = bodyRef.current.scale.x
      const next = cur + (tuck - cur) * Math.min(1, dt * 1.2)
      bodyRef.current.scale.set(next, next, next * (1 + Math.sin(t * 1.3) * 0.04))
    }
    if (headRef.current) headRef.current.rotation.x = kind === 'eat' && s.arrived ? 0.35 + Math.sin(t * 2.2) * 0.12 : 0
  })

  return (
    <>
      {!preview && (
        <points ref={trailRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#d8ecff" size={0.03} transparent opacity={0.5} depthWrite={false} />
        </points>
      )}
      <group ref={root}>
        <group scale={SNAIL_SCALE}>
          <SnailModel bodyRef={bodyRef} headRef={headRef} />
        </group>
      </group>
    </>
  )
}

