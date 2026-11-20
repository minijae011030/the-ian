import { useMemo } from 'react'
import { DoubleSide, ExtrudeGeometry, Path, Shape } from 'three'
import { canvasTexture } from '../../lib/canvasTexture'

/**
 * 달팽이방 = 달팽이 사육통 속. 달팽이(껍데기 25cm)에 맞춘 크기라 1cm ≈ 0.1
 * 분홍 집 · 분홍 튜브 놀이터 · 꽃 모양 칼슘 그릇 · 애호박 · 조화 · 분홍 펠트
 */
const PINK = '#f3cbd5'
const PINK_DEEP = '#ee9fb6'

/* ───── 달팽이 집 ───── */

/** 분홍 집. 앞(+z) 박공에 문이 뚫려 있고 지붕은 비늘 기와. 폭 1.0 · 깊이 0.8 · 높이 0.95 */
export function SnailHouse() {
  const W = 1.0
  const D = 0.8
  const wallH = 0.55
  const peak = 0.92
  const body = useMemo(() => {
    const s = new Shape()
    s.moveTo(-W / 2, 0)
    s.lineTo(W / 2, 0)
    s.lineTo(W / 2, wallH)
    s.lineTo(0, peak)
    s.lineTo(-W / 2, wallH)
    s.closePath()
    const geo = new ExtrudeGeometry(s, { depth: D, bevelEnabled: false })
    geo.translate(0, 0, -D / 2)
    return geo
  }, [])
  // 지붕 비탈 길이·각도
  const slope = Math.hypot(W / 2, peak - wallH)
  const angle = Math.atan2(peak - wallH, W / 2)
  const rows = 4
  const cols = 6
  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial color={PINK} roughness={0.55} />
      </mesh>
      {/* 문: 아치형 어두운 구멍 */}
      <group position={[0, 0, D / 2 + 0.003]}>
        <mesh position={[0, 0.17, 0]}>
          <planeGeometry args={[0.32, 0.34]} />
          <meshStandardMaterial color="#2a1d16" />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <circleGeometry args={[0.16, 18, 0, Math.PI]} />
          <meshStandardMaterial color="#2a1d16" />
        </mesh>
      </group>
      {/* 지붕: 양쪽 비탈에 비늘 기와 */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[(sx * W) / 4, (wallH + peak) / 2, 0]} rotation-z={-sx * angle}>
          <mesh position-y={0.03}>
            <boxGeometry args={[slope + 0.08, 0.05, D + 0.1]} />
            <meshStandardMaterial color={PINK} roughness={0.5} />
          </mesh>
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (
              <mesh
                key={`${r}-${c}`}
                position={[sx * (-slope / 2 + 0.08 + r * (slope / rows)), 0.065, -D / 2 + 0.06 + c * ((D - 0.02) / (cols - 1)) + (r % 2) * 0.05]}
                scale={[0.6, 0.35, 1]}
              >
                <sphereGeometry args={[0.085, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={PINK} roughness={0.45} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {/* 용마루 + 앞쪽 굴뚝 꼭지 */}
      <mesh position={[0, peak + 0.04, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, D + 0.1, 10]} />
        <meshStandardMaterial color={PINK} roughness={0.45} />
      </mesh>
      <mesh position={[0, peak + 0.11, D / 2 - 0.08]}>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 14]} />
        <meshStandardMaterial color={PINK} roughness={0.45} />
      </mesh>
      {/* 옆벽 창문 무늬 */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (W / 2 + 0.004), 0.3, 0]} rotation-y={(sx * Math.PI) / 2}>
          <planeGeometry args={[0.2, 0.22]} />
          <meshStandardMaterial color="#efb8c6" />
        </mesh>
      ))}
    </group>
  )
}

/* ───── 튜브 놀이터 ───── */

/** 분홍 고무 튜브 아치 세 줄 + 바닥 받침, 이음새는 까만 마디. 폭 0.9 · 깊이 0.45 · 높이 0.7 */
export function TubeArch() {
  const R = 0.36
  const tube = 0.05
  return (
    <group>
      {[-0.13, 0, 0.13].map((z) => (
        <group key={z} position={[0, 0.3, z]}>
          {/* 아치 */}
          <mesh>
            <torusGeometry args={[R, tube, 10, 28, Math.PI]} />
            <meshStandardMaterial color={PINK_DEEP} roughness={0.45} />
          </mesh>
          {/* 아치 다리 */}
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * R, -0.15, 0]}>
              <cylinderGeometry args={[tube, tube, 0.3, 10]} />
              <meshStandardMaterial color={PINK_DEEP} roughness={0.45} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 바닥 가로 튜브 + 까만 마디 */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * R, 0.05, 0]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[tube, tube, 0.45, 10]} />
            <meshStandardMaterial color={PINK_DEEP} roughness={0.45} />
          </mesh>
          {[-0.13, 0, 0.13].map((z) => (
            <mesh key={z} position={[sx * -0.08, 0.04, z]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.035, 0.035, 0.16, 8]} />
              <meshStandardMaterial color="#1e1d22" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ───── 칼슘 그릇 ───── */

/** 꽃 모양 외곽선 */
function flowerPath<T extends Shape | Path>(p: T, r: number, petals = 6) {
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2
    const rr = r * (1 + 0.1 * Math.cos(a * petals))
    const x = Math.cos(a) * rr
    const y = Math.sin(a) * rr
    if (i === 0) p.moveTo(x, y)
    else p.lineTo(x, y)
  }
  return p
}

/** 분홍 꽃 모양 그릇에 하얀 칼슘 덩어리(갑오징어뼈·산호사). 지름 0.8 · 높이 0.35 */
export function CalciumBowl() {
  const wall = useMemo(() => {
    const shape = flowerPath(new Shape(), 0.38)
    shape.holes.push(flowerPath(new Path(), 0.33))
    const geo = new ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 })
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])
  const floor = useMemo(() => {
    const geo = new ExtrudeGeometry(flowerPath(new Shape(), 0.36), { depth: 0.04, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])
  const stones = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = i * 2.4
        const r = 0.07 + (i % 4) * 0.055
        return {
          p: [Math.cos(a) * r, 0.12 + (i % 3) * 0.05, Math.sin(a) * r] as [number, number, number],
          s: [0.11 + (i % 3) * 0.02, 0.07, 0.07 + (i % 2) * 0.03] as [number, number, number],
          rot: i * 1.3,
        }
      }),
    [],
  )
  return (
    <group>
      <mesh geometry={wall}>
        <meshStandardMaterial color={PINK} roughness={0.4} side={DoubleSide} />
      </mesh>
      <mesh geometry={floor}>
        <meshStandardMaterial color={PINK} roughness={0.4} />
      </mesh>
      {stones.map((st, i) => (
        <mesh key={i} position={st.p} rotation={[st.rot, st.rot * 0.7, 0]} scale={st.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 ? '#ddd5bf' : '#c9c2a8'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* ───── 애호박 ───── */

/** 분홍 접시에 동그랗게 썬 애호박 한 조각. 지름 0.72 */
export function ZucchiniSlice() {
  const top = useMemo(
    () =>
      canvasTexture(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
        g.addColorStop(0, '#f2dc8c')
        g.addColorStop(0.7, '#efe2a6')
        g.addColorStop(0.86, '#d7e7a2')
        g.addColorStop(1, '#8fbf5a')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 128, 128)
        // 씨: 꽃잎처럼 둥글게
        ctx.fillStyle = 'rgba(255,250,225,0.8)'
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          ctx.beginPath()
          ctx.ellipse(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20, 7, 4, a, 0, Math.PI * 2)
          ctx.fill()
        }
      }),
    [],
  )
  return (
    <group>
      <mesh position-y={0.015}>
        <cylinderGeometry args={[0.36, 0.33, 0.03, 28]} />
        <meshStandardMaterial color={PINK} roughness={0.4} />
      </mesh>
      <mesh position-y={0.07}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 28, 1, true]} />
        <meshStandardMaterial color="#8cc05a" roughness={0.5} />
      </mesh>
      <mesh position-y={0.111} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.3, 28]} />
        <meshStandardMaterial map={top} roughness={0.6} />
      </mesh>
    </group>
  )
}

/* ───── 조화 ───── */

/** 연두색 조화. 줄기 몇 개에 둥근 잎. 높이 1.1쯤 */
export function FakePlant() {
  const leaves = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const stem = i % 3
        const y = 0.25 + (i / 16) * 0.8
        const a = i * 2.2
        return { stem, y, a, s: 0.12 + (i % 3) * 0.03 }
      }),
    [],
  )
  const stems = [
    [-0.06, 0.15],
    [0.08, -0.12],
    [0.12, 0.2],
  ]
  return (
    <group>
      {stems.map(([lean, turn], i) => (
        <mesh key={i} position={[lean * 2, 0.5, turn]} rotation={[turn, 0, -lean * 2]}>
          <cylinderGeometry args={[0.015, 0.02, 1.0, 5]} />
          <meshStandardMaterial color="#6fae4a" />
        </mesh>
      ))}
      {leaves.map((l, i) => {
        const [lean, turn] = stems[l.stem]
        return (
          <group key={i} position={[lean * 2 + lean * 2 * (l.y - 0.5) * 2, l.y, turn + turn * (l.y - 0.5)]} rotation-y={l.a}>
            <mesh position-x={l.s * 0.9} rotation={[-1.1, 0, 0.3]} scale={[l.s, l.s * 0.65, 1]}>
              <circleGeometry args={[1, 12]} />
              <meshStandardMaterial color={i % 2 ? '#86d06a' : '#9be07c'} roughness={0.5} side={DoubleSide} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ───── 분홍 펠트 ───── */

/** 바닥에 깐 분홍 펠트(키친타월). 가장자리가 살짝 구겨짐 */
export function PinkFelt() {
  return (
    <group>
      <mesh position-y={0.006} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.3, 1.0]} />
        <meshStandardMaterial color="#efa9bf" roughness={1} />
      </mesh>
      {[
        [0.5, 0.42, 0.4],
        [-0.55, -0.4, -0.6],
        [0.6, -0.35, 1.1],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.02, z]} rotation={[-Math.PI / 2 + 0.25, 0, r]}>
          <planeGeometry args={[0.3, 0.16]} />
          <meshStandardMaterial color="#e99ab3" roughness={1} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
