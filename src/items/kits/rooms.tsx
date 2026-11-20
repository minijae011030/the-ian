import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { type CanvasTexture, DoubleSide, type Group, RepeatWrapping } from 'three'
import { PAN_SCALE } from '../../scene/character/Pets'
import { RabbitBody, type RabbitFur } from '../../scene/character/RabbitBody'
import { canvasTexture } from '../../lib/canvasTexture'
import { Box, Chair, Desk, METAL, WOOD } from '../parts'

/**
 * 방별 가구: 러닝방 · 토끼방 · 달팽이 · 빵집방 · 개발방 · 자격증방 · 영어방
 */
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

/* ───── 러닝방 ───── */

/** 러닝머신. 계기판이 -z 쪽, 사람은 -z를 보고 뜀 */
export function Treadmill({ lit }: { lit: boolean }) {
  return (
    <group>
      <Box size={[0.6, 0.1, 1.4]} position={[0, 0.05, 0]} color="#2a2d33" />
      <Box size={[0.48, 0.02, 1.3]} position={[0, 0.11, 0.02]} color="#141518" />
      {[-0.27, 0.27].map((x) => (
        <Box key={x} size={[0.04, 0.95, 0.04]} position={[x, 0.55, -0.62]} color={METAL} />
      ))}
      <Box size={[0.6, 0.18, 0.12]} position={[0, 1.0, -0.6]} color="#2a2d33" />
      <mesh position={[0, 1.0, -0.538]}>
        <planeGeometry args={[0.3, 0.1]} />
        <meshBasicMaterial color={lit ? '#5ee08a' : '#1a1d22'} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function FoamRoller({ color = '#3d8bd9' }: { color?: string }) {
  return (
    <mesh position-y={0.08} rotation-z={Math.PI / 2}>
      <cylinderGeometry args={[0.08, 0.08, 0.45, 16]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  )
}

export function YogaMat({ color = '#6a5acd' }: { color?: string }) {
  return (
    <group>
      <Box size={[0.55, 0.012, 1.3]} position={[0, 0.006, 0]} color={color} />
      {/* 끝에 말린 부분 */}
      <mesh position={[0, 0.05, -0.62]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 14]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

/* ───── 토끼방 ───── */

/** 토끼. 가끔 귀를 쫑긋하고 코를 씰룩거림 */
export function Rabbit({ fur = 'mine' }: { fur?: RabbitFur }) {
  const head = useRef<Group>(null)
  const ears = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (head.current) head.current.rotation.x = Math.sin(t * 9) * 0.02 + (Math.sin(t * 0.4) > 0.8 ? -0.25 : 0)
    if (ears.current) ears.current.rotation.x = Math.max(0, Math.sin(t * 0.7)) * 0.3
  })
  return (
    <group scale={1.8}>
      <RabbitBody fur={fur} headRef={head} earsRef={ears} />
    </group>
  )
}

/** 건초 몇 가닥 (보기용, 위치는 고정) */
function Hay({ count, spread, y = 0, seed = 1 }: { count: number; spread: [number, number]; y?: number; seed?: number }) {
  const blades = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const k = i * 1.37 + seed * 7.1
        return {
          x: Math.sin(k * 3.1) * spread[0],
          z: Math.cos(k * 2.3) * spread[1],
          y: y + (i % 4) * 0.004,
          rot: k * 2.9,
          len: 0.1 + (i % 5) * 0.03,
          c: i % 3 === 0 ? '#a99f52' : i % 3 === 1 ? '#c2b56a' : '#8e9a5a',
        }
      }),
    [count, spread, y, seed],
  )
  return (
    <>
      {blades.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]} rotation-y={b.rot}>
          <Box size={[0.007, 0.005, b.len]} position={[0, 0, 0]} color={b.c} />
        </group>
      ))}
    </>
  )
}

/**
 * 배변판. 하얀 격자판에 밥그릇·물그릇이 같이 있음 (여기서 먹고 마시고 쌈).
 * 그릇은 뒤쪽(-z), 토끼는 앞(+z)에서 들어옴. 위치는 Pets의 PAN과 맞춤
 */
export function LitterPan() {
  const grid = useMemo(() => {
    const tex = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#f1efea'
      ctx.fillRect(0, 0, 128, 128)
      ctx.fillStyle = '#c9c4ba'
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) ctx.fillRect(i * 16 + 4, j * 16 + 4, 9, 9)
    })
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(7, 5)
    return tex
  }, [])
  return (
    <group scale={PAN_SCALE}>
      {/* 판 */}
      <Box size={[1.2, 0.02, 0.85]} position={[0, 0.01, 0]} color="#e9e6e0" />
      <mesh position-y={0.032} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.16, 0.81]} />
        <meshStandardMaterial map={grid} roughness={0.9} />
      </mesh>
      {[-0.595, 0.595].map((x) => (
        <Box key={x} size={[0.012, 0.05, 0.85]} position={[x, 0.025, 0]} color="#e9e6e0" />
      ))}
      {[-0.42, 0.42].map((z) => (
        <Box key={z} size={[1.2, 0.05, 0.012]} position={[0, 0.025, z]} color="#e9e6e0" />
      ))}
      {/* 구석에 깔아둔 분홍 패드 */}
      <mesh position={[0.4, 0.034, 0.24]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.36, 0.32]} />
        <meshStandardMaterial color="#e9b9a8" roughness={1} />
      </mesh>
      {/* 밥그릇: 갈색 토기 + 건초·사료 */}
      <group position={[-0.28, 0.035, -0.16]}>
        <mesh position-y={0.045}>
          <cylinderGeometry args={[0.17, 0.15, 0.09, 20, 1, true]} />
          <meshStandardMaterial color="#b9773f" roughness={0.95} side={DoubleSide} />
        </mesh>
        <mesh position-y={0.005}>
          <cylinderGeometry args={[0.15, 0.15, 0.01, 20]} />
          <meshStandardMaterial color="#b9773f" />
        </mesh>
        <mesh position-y={0.04} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.155, 20]} />
          <meshStandardMaterial color="#7d6a3e" roughness={1} />
        </mesh>
        <Hay count={10} spread={[0.08, 0.08]} y={0.05} seed={3} />
      </group>
      {/* 물그릇: 하얀 도자기 */}
      <group position={[0.3, 0.035, -0.18]}>
        <mesh position-y={0.04}>
          <cylinderGeometry args={[0.13, 0.11, 0.08, 20, 1, true]} />
          <meshStandardMaterial color="#f4f2ee" roughness={0.3} side={DoubleSide} />
        </mesh>
        <mesh position-y={0.005}>
          <cylinderGeometry args={[0.11, 0.11, 0.01, 20]} />
          <meshStandardMaterial color="#f4f2ee" />
        </mesh>
        <mesh position-y={0.06} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.122, 20]} />
          <meshStandardMaterial color="#a9c6d2" roughness={0.05} transparent opacity={0.75} />
        </mesh>
      </group>
      {/* 여기저기 흩어진 건초 */}
      <Hay count={26} spread={[0.52, 0.36]} y={0.036} />
    </group>
  )
}

/** 꽃무늬 천 (회청색 바탕에 빨강·분홍·보라 잔꽃) */
function useFloral() {
  return useMemo(() => {
    const tex = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = '#6d7893'
      ctx.fillRect(0, 0, 256, 256)
      const colors = ['#c9425a', '#e88aa0', '#a982c9', '#d76b7d', '#7f9a78']
      for (let i = 0; i < 90; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453) % 1
        const y = (Math.sin(i * 78.233) * 12543.21) % 1
        ctx.fillStyle = colors[i % colors.length]
        ctx.beginPath()
        const cx = Math.abs(x) * 256
        const cy = Math.abs(y) * 256
        // 꽃잎 다섯 장 + 노란 가운데
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + i
          ctx.beginPath()
          ctx.arc(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#e9d27a'
        ctx.fillRect(cx - 1, cy - 1, 2, 2)
      }
    })
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(2, 2)
    return tex
  }, [])
}

function Cloth({
  size,
  position,
  rotation = [0, 0, 0],
  map,
}: {
  size: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  map: CanvasTexture
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  )
}

/**
 * 숨숨집. 상자에 꽃무늬 천을 덮어씌운 것. 앞(+z)이 뚫려 있고
 * 바닥엔 줄무늬 수건이 깔려서 문 밖으로 살짝 나옴. 토끼가 안에 들어가서 숨음
 */
export function RabbitHouse() {
  const floral = useFloral()
  const towel = useMemo(
    () =>
      canvasTexture(128, 64, (ctx) => {
        ctx.fillStyle = '#efe6d4'
        ctx.fillRect(0, 0, 128, 64)
        const stripes: [number, string][] = [
          [14, '#a08a70'],
          [30, '#8a7c6c'],
          [46, '#c4a98a'],
          [62, '#c4554a'],
          [80, '#8a7c6c'],
          [100, '#b59a7c'],
        ]
        for (const [x, c] of stripes) {
          ctx.fillStyle = c
          ctx.fillRect(x, 0, x === 46 ? 10 : 3, 64)
        }
      }),
    [],
  )
  const W = 0.4
  const H = 0.3
  const D = 0.42
  return (
    <group>
      {/* 안쪽 상자 */}
      <Box size={[W, 0.02, D]} position={[0, 0.01, 0]} color="#d8cfbf" />
      <Box size={[0.02, H, D]} position={[-W / 2, H / 2, 0]} color="#d8cfbf" />
      <Box size={[0.02, H, D]} position={[W / 2, H / 2, 0]} color="#d8cfbf" />
      <Box size={[W, H, 0.02]} position={[0, H / 2, -D / 2]} color="#cfc5b3" />
      {/* 수건: 안에서 문 밖으로 살짝 */}
      <mesh position={[0, 0.026, 0.08]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W - 0.04, D + 0.06]} />
        <meshStandardMaterial map={towel} roughness={1} />
      </mesh>
      {/* 꽃무늬 천: 지붕은 살짝 처지고, 옆·뒤는 바닥까지 늘어져서 끝이 퍼짐 */}
      <Cloth map={floral} size={[W + 0.06, 0.02, D + 0.05]} position={[0, H + 0.02, 0]} />
      <Cloth map={floral} size={[W + 0.04, 0.03, D * 0.6]} position={[0, H - 0.01, 0]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Cloth
            map={floral}
            size={[0.02, H + 0.02, D + 0.05]}
            position={[sx * (W / 2 + 0.03), H / 2, 0]}
            rotation={[0, 0, sx * 0.04]}
          />
          {/* 앞 모서리에서 바닥까지 흘러내린 자락 */}
          <Cloth
            map={floral}
            size={[0.12, H, 0.015]}
            position={[sx * (W / 2 + 0.02), H / 2 - 0.01, D / 2 + 0.04]}
            rotation={[0.08, sx * -0.5, 0]}
          />
          <Cloth map={floral} size={[0.14, 0.012, 0.14]} position={[sx * (W / 2 + 0.06), 0.008, D / 2 + 0.04]} />
        </group>
      ))}
      <Cloth map={floral} size={[W + 0.06, H + 0.02, 0.015]} position={[0, H / 2, -D / 2 - 0.03]} />
      {/* 문 위로 접혀 내려온 천 */}
      <Cloth map={floral} size={[W + 0.06, 0.09, 0.015]} position={[0, H - 0.035, D / 2 + 0.03]} rotation={[0.12, 0, 0]} />
    </group>
  )
}

/** 체크무늬 놀이 매트. 토끼 미끄러지지 말라고 까는 회색 깅엄 */
export function CheckMat({ size = [1.6, 1.2] as [number, number] }: { size?: [number, number] }) {
  const texture = useMemo(() => {
    const tex = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#eceae6'
      ctx.fillRect(0, 0, 128, 128)
      ctx.fillStyle = 'rgba(120,124,130,0.45)'
      for (let i = 0; i < 8; i += 2) {
        ctx.fillRect(i * 16, 0, 16, 128)
        ctx.fillRect(0, i * 16, 128, 16)
      }
    })
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(size[0] * 2.5, size[1] * 2.5)
    return tex
  }, [size])
  return (
    <mesh position-y={0.007} rotation-x={-Math.PI / 2}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  )
}

/* ───── 달팽이 ───── */

/* ───── 빵집방 ───── */

export function Oven({ lit }: { lit: boolean }) {
  return (
    <group>
      <Box size={[0.6, 0.6, 0.55]} position={[0, 0.3, 0]} color="#3b3f47" />
      <mesh position={[0, 0.3, 0.276]}>
        <planeGeometry args={[0.44, 0.3]} />
        <meshBasicMaterial color={lit ? '#e8862e' : '#14161a'} toneMapped={false} />
      </mesh>
      <Box size={[0.4, 0.025, 0.04]} position={[0, 0.5, 0.29]} color={METAL} />
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.55, 0.278]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.01, 10]} />
          <meshStandardMaterial color="#c9ccd2" />
        </mesh>
      ))}
    </group>
  )
}

function Bread({ position, kind }: { position: [number, number, number]; kind: number }) {
  const shape: [number, number, number][] = [
    [0.07, 0.035, 0.04],
    [0.05, 0.04, 0.05],
    [0.09, 0.03, 0.035],
  ]
  return (
    <mesh position={position} scale={shape[kind % 3]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color={['#c98a4a', '#e0b070', '#a9663a'][kind % 3]} roughness={0.8} />
    </mesh>
  )
}

export function BreadDisplay() {
  const breads = useMemo(() => {
    const out: { p: [number, number, number]; k: number }[] = []
    ;[0.32, 0.64].forEach((y, row) => {
      for (let i = 0; i < 5; i++) out.push({ p: [-0.32 + i * 0.16, y + 0.04, 0.02 * ((i + row) % 2)], k: i + row })
    })
    return out
  }, [])
  return (
    <group>
      <Box size={[0.9, 0.3, 0.42]} position={[0, 0.15, 0]} color={WOOD} />
      {[0.32, 0.64].map((y) => (
        <Box key={y} size={[0.9, 0.02, 0.42]} position={[0, y, 0]} color="#e9e4da" />
      ))}
      {[-0.44, 0.44].map((x) => (
        <Box key={x} size={[0.02, 0.45, 0.42]} position={[x, 0.53, 0]} color={WOOD} />
      ))}
      <Box size={[0.9, 0.02, 0.42]} position={[0, 0.76, 0]} color={WOOD} />
      {breads.map((b, i) => (
        <Bread key={i} position={b.p} kind={b.k} />
      ))}
    </group>
  )
}

/** 벽에 거는 앞치마. 원점 = 벽면 */
export function ApronHook() {
  return (
    <group>
      <Box size={[0.3, 0.04, 0.03]} position={[0, 0.2, 0.02]} color={WOOD} />
      <Box size={[0.02, 0.05, 0.04]} position={[0, 0.17, 0.04]} color={METAL} />
      <Box size={[0.22, 0.42, 0.015]} position={[0, -0.04, 0.05]} color="#e9e4da" />
      <Box size={[0.12, 0.08, 0.005]} position={[0, -0.08, 0.06]} color="#c9b7a2" />
    </group>
  )
}

/* ───── 개발방 ───── */

function Monitor({ position, rotationY = 0, lit, draw }: { position: [number, number, number]; rotationY?: number; lit: boolean; draw: (c: CanvasRenderingContext2D) => void }) {
  const tex = useMemo(() => canvasTexture(240, 140, draw), [draw])
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[0.14, 0.01, 0.1]} position={[0, 0.005, 0]} color="#222" />
      <Box size={[0.03, 0.18, 0.03]} position={[0, 0.09, -0.02]} color="#222" />
      <Box size={[0.52, 0.31, 0.025]} position={[0, 0.3, 0]} color="#151515" />
      <mesh position={[0, 0.3, 0.014]}>
        <planeGeometry args={[0.49, 0.28]} />
        <meshBasicMaterial map={tex} color={lit ? '#ffffff' : '#1a1a1a'} toneMapped={false} />
      </mesh>
    </group>
  )
}

function drawCode(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#16181d'
  ctx.fillRect(0, 0, 240, 140)
  const cols = ['#c678dd', '#61afef', '#98c379', '#e5c07b', '#abb2bf']
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = cols[i % cols.length]
    ctx.fillRect(10 + (i % 4) * 10, 8 + i * 11, 40 + ((i * 53) % 120), 5)
  }
}

function drawPreview(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 140)
  g.addColorStop(0, '#123a8c')
  g.addColorStop(1, '#6d93d6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 240, 140)
  ctx.fillStyle = '#eef0f4'
  ctx.fillRect(95, 30, 50, 100)
  ctx.fillStyle = '#ffe2b3'
  for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) if ((r * 3 + c) % 4) ctx.fillRect(99 + c * 15, 35 + r * 13, 12, 9)
}

/** 듀얼 모니터 책상 세트. 책상 세트와 같은 배치(의자 -z, 책상 +z) */
export function DevDeskSet({ lit, chair = '#2f3440' }: { lit: boolean; chair?: string }) {
  return (
    <group>
      <Desk position={[0, 0, 0.3]} width={1.4} />
      <Chair position={[0, 0, -0.28]} color={chair} />
      <Monitor position={[-0.28, 0.74, 0.42]} rotationY={Math.PI + 0.25} lit={lit} draw={drawCode} />
      <Monitor position={[0.28, 0.74, 0.42]} rotationY={Math.PI - 0.25} lit={lit} draw={drawPreview} />
      <Box size={[0.42, 0.02, 0.13]} position={[0, 0.75, 0.16]} color="#2a2d33" />
      <Box size={[0.07, 0.02, 0.1]} position={[0.3, 0.75, 0.16]} color="#2a2d33" />
    </group>
  )
}

export function Keyboard({ color = '#2a2d33' }: { color?: string }) {
  return (
    <group>
      <Box size={[0.42, 0.02, 0.13]} position={[0, 0.01, 0]} color={color} />
      {Array.from({ length: 4 }, (_, r) => (
        <Box key={r} size={[0.38, 0.006, 0.02]} position={[0, 0.023, -0.045 + r * 0.03]} color="#4a4f57" />
      ))}
    </group>
  )
}

/* ───── 자격증방 ───── */

const CERTS: Record<string, { title: string; sub: string }> = {
  sqld: { title: 'SQLD', sub: 'SQL 개발자' },
  adsp: { title: 'ADsP', sub: '데이터분석 준전문가' },
  jeongcheogi: { title: '정보처리기사', sub: 'Engineer Information Processing' },
}

/** 벽에 거는 자격증 액자. 원점 = 벽면 */
export function CertificateFrame({ kind }: { kind: string }) {
  const cert = CERTS[kind] ?? CERTS.sqld
  const tex = useMemo(
    () =>
      canvasTexture(240, 320, (ctx) => {
        ctx.fillStyle = '#fbf8f0'
        ctx.fillRect(0, 0, 240, 320)
        ctx.strokeStyle = '#b89a5a'
        ctx.lineWidth = 6
        ctx.strokeRect(14, 14, 212, 292)
        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.font = `700 15px ${FONT}`
        ctx.fillText('자 격 증', 120, 62)
        ctx.font = `800 ${cert.title.length > 5 ? 26 : 34}px ${FONT}`
        ctx.fillText(cert.title, 120, 140)
        ctx.font = `500 12px ${FONT}`
        ctx.fillText(cert.sub, 120, 170)
        ctx.fillStyle = '#9aa0aa'
        for (let i = 0; i < 4; i++) ctx.fillRect(50, 205 + i * 14, 140, 4)
        ctx.fillStyle = '#c0392b'
        ctx.beginPath()
        ctx.arc(170, 275, 16, 0, Math.PI * 2)
        ctx.fill()
      }),
    [cert],
  )
  return (
    <group>
      <Box size={[0.32, 0.42, 0.025]} position={[0, 0, 0.012]} color="#2b211c" />
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[0.27, 0.36]} />
        <meshStandardMaterial map={tex} />
      </mesh>
    </group>
  )
}

/** 포장도 안 뜯은 정보보안기사 책 (비닐 포장 반짝) */
export function SealedBook() {
  const cover = useMemo(
    () =>
      canvasTexture(160, 220, (ctx) => {
        ctx.fillStyle = '#1d3f95'
        ctx.fillRect(0, 0, 160, 220)
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.font = `800 20px ${FONT}`
        ctx.fillText('정보보안기사', 80, 80)
        ctx.font = `600 13px ${FONT}`
        ctx.fillText('필기 + 실기', 80, 110)
        ctx.fillStyle = '#e0a43a'
        ctx.fillRect(20, 170, 120, 8)
      }),
    [],
  )
  return (
    <group>
      <Box size={[0.2, 0.06, 0.27]} position={[0, 0.03, 0]} color="#f4f1ea" />
      <mesh position={[0, 0.061, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.2, 0.27]} />
        <meshStandardMaterial map={cover} />
      </mesh>
      <mesh position-y={0.031}>
        <boxGeometry args={[0.205, 0.066, 0.275]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.15} roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ───── 영어방 ───── */

/** 토익 · 토스 문제집 더미 */
export function ToeicBooks() {
  const books: [string, string][] = [
    ['#e8e4dc', '#2c5e9e'],
    ['#ffd23f', '#222'],
    ['#2c5e9e', '#fff'],
    ['#e85d3a', '#fff'],
  ]
  return (
    <group>
      {books.map(([c], i) => (
        <Box key={i} size={[0.22 - (i % 2) * 0.02, 0.045, 0.3]} position={[(i % 2) * 0.01, 0.023 + i * 0.046, 0]} color={c} />
      ))}
    </group>
  )
}

/** 토익스피킹 연습용 헤드셋 (마이크 달린) */
export function Headset({ color = '#2a2d33' }: { color?: string }) {
  return (
    <group position-y={0.02}>
      <mesh position-y={0.06} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.08, 0.008, 6, 20, Math.PI]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.06, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.035, 0.035, 0.025, 14]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[-0.06, 0.06, 0.05]} rotation-y={0.5}>
        <boxGeometry args={[0.006, 0.006, 0.09]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.04, 0.06, 0.09]}>
        <sphereGeometry args={[0.01, 8, 6]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
    </group>
  )
}

/** 벽 단어장·점수판. 원점 = 벽면 */
export function EnglishBoard() {
  const tex = useMemo(
    () =>
      canvasTexture(400, 260, (ctx) => {
        ctx.fillStyle = '#2f3a33'
        ctx.fillRect(0, 0, 400, 260)
        ctx.strokeStyle = '#8a6a4a'
        ctx.lineWidth = 12
        ctx.strokeRect(0, 0, 400, 260)
        ctx.fillStyle = '#eef0e8'
        ctx.font = `700 22px ${FONT}`
        ctx.fillText('TOEIC  775 → 850', 26, 48)
        ctx.fillText('SPEAKING  AL ✓', 26, 84)
        const notes: [string, string][] = [
          ['#fff3a8', 'resilient'],
          ['#ffc9de', 'commute'],
          ['#bfe8ff', 'reimburse'],
          ['#c9f2c0', 'tentative'],
        ]
        ctx.font = `700 16px ${FONT}`
        notes.forEach(([c, w], i) => {
          const x = 26 + i * 90
          ctx.fillStyle = c
          ctx.fillRect(x, 120, 80, 70)
          ctx.fillStyle = '#333'
          ctx.fillText(w, x + 6, 160)
        })
      }),
    [],
  )
  return (
    <group>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.8, 0.52]} />
        <meshStandardMaterial map={tex} />
      </mesh>
    </group>
  )
}
