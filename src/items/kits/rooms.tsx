import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
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

export function RabbitCage() {
  const bars = useMemo(() => Array.from({ length: 11 }, (_, i) => -0.5 + i * 0.1), [])
  return (
    <group>
      <Box size={[1.05, 0.1, 0.6]} position={[0, 0.05, 0]} color="#d8d4cc" />
      <Box size={[1.0, 0.02, 0.55]} position={[0, 0.11, 0]} color="#d9c27a" />
      {/* 철망: 앞뒤 세로살 + 옆면 + 지붕 */}
      {bars.map((x) =>
        [-0.29, 0.29].map((z) => <Box key={`${x}${z}`} size={[0.01, 0.5, 0.01]} position={[x, 0.35, z]} color="#c9ccd2" />),
      )}
      {[-0.52, 0.52].map((x) =>
        [-0.2, -0.1, 0, 0.1, 0.2].map((z) => <Box key={`${x}${z}`} size={[0.01, 0.5, 0.01]} position={[x, 0.35, z]} color="#c9ccd2" />),
      )}
      {/* 위아래 테두리 + 지붕 철망 (판으로 막으면 안이 안 보임) */}
      {[0.1, 0.6].map((y) =>
        [-0.29, 0.29].map((z) => <Box key={`${y}${z}`} size={[1.05, 0.012, 0.012]} position={[0, y, z]} color="#c9ccd2" />),
      )}
      {bars.map((x) => (
        <Box key={x} size={[0.01, 0.01, 0.58]} position={[x, 0.6, 0]} color="#c9ccd2" />
      ))}
      {/* 숨숨집 */}
      <Box size={[0.3, 0.2, 0.3]} position={[0.3, 0.22, 0]} color={WOOD} />
      <Box size={[0.12, 0.12, 0.01]} position={[0.3, 0.18, 0.15]} color="#3a2d22" />
    </group>
  )
}

export function HayBowl() {
  return (
    <group>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.1, 0.08, 0.08, 14]} />
        <meshStandardMaterial color="#d9cbb8" />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} size={[0.01, 0.01, 0.16]} position={[Math.sin(i) * 0.04, 0.09, Math.cos(i * 2) * 0.03]} color="#c9b25a" />
      ))}
    </group>
  )
}

/** 토끼. 가끔 귀를 쫑긋하고 코를 씰룩거림 */
export function Rabbit({ color = '#f2efe9' }: { color?: string }) {
  const head = useRef<Group>(null)
  const ears = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (head.current) head.current.rotation.x = Math.sin(t * 9) * 0.02 + (Math.sin(t * 0.4) > 0.8 ? -0.25 : 0)
    if (ears.current) ears.current.rotation.x = Math.max(0, Math.sin(t * 0.7)) * 0.3
  })
  return (
    <group scale={0.9}>
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
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.03, 0.01, 0.05]}>
            <sphereGeometry args={[0.008, 6, 4]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        ))}
        <group ref={ears} position={[0, 0.04, -0.01]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.025, 0.06, 0]} rotation-z={s * -0.15} scale={[0.018, 0.07, 0.01]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/* ───── 달팽이 ───── */

/**
 * 달팽이 사육통: 투명 플라스틱 통 + 흙 + 놀이목 + 상추 + 명주달팽이.
 * 명주달팽이: 작고 얇은 연갈색 반투명 껍데기. 놀이목 위를 아주 천천히 오르내림
 */
export function SnailCage() {
  const snail = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!snail.current) return
    const t = (Math.sin(clock.elapsedTime * 0.08) + 1) / 2 // 0..1 아주 느리게
    snail.current.position.set(-0.08 + t * 0.12, 0.075 + t * 0.07, 0.01)
  })
  return (
    <group>
      {/* 흙 */}
      <Box size={[0.34, 0.06, 0.2]} position={[0, 0.03, 0]} color="#4a3524" />
      {/* 놀이목: 비스듬히 누운 나뭇가지 */}
      <mesh position={[-0.02, 0.1, 0]} rotation-z={0.55}>
        <cylinderGeometry args={[0.014, 0.018, 0.26, 7]} />
        <meshStandardMaterial color="#8a6a4a" roughness={1} />
      </mesh>
      {/* 상추 */}
      <mesh position={[0.11, 0.065, 0.03]} rotation={[-1.4, 0, 0.3]} scale={[0.06, 0.045, 1]}>
        <circleGeometry args={[1, 10]} />
        <meshStandardMaterial color="#7fbf5a" side={2} />
      </mesh>
      {/* 명주달팽이 */}
      <group ref={snail} rotation-z={0.55}>
        <mesh position={[0, 0.006, 0]} scale={[0.028, 0.008, 0.01]}>
          <sphereGeometry args={[1, 10, 6]} />
          <meshStandardMaterial color="#c9bba3" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.028, 0.016, s * 0.004]} rotation-z={-0.6}>
            <cylinderGeometry args={[0.0015, 0.0015, 0.014, 4]} />
            <meshStandardMaterial color="#b5a68e" />
          </mesh>
        ))}
        <mesh position={[-0.004, 0.02, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.011, 0.007, 8, 16]} />
          <meshPhysicalMaterial color="#d8b77a" transmission={0.35} roughness={0.35} thickness={0.01} />
        </mesh>
      </group>
      {/* 투명 플라스틱 통 + 숨구멍 뚫린 뚜껑 */}
      <mesh position-y={0.11}>
        <boxGeometry args={[0.36, 0.22, 0.22]} />
        <meshPhysicalMaterial color="#e8f2ff" transparent opacity={0.18} roughness={0.1} depthWrite={false} />
      </mesh>
      <Box size={[0.37, 0.02, 0.23]} position={[0, 0.23, 0]} color="#f2f2f2" />
      {[-0.1, -0.04, 0.02, 0.08].map((x) => (
        <Box key={x} size={[0.015, 0.003, 0.015]} position={[x, 0.241, 0]} color="#9aa0a8" />
      ))}
    </group>
  )
}

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
