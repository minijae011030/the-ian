import { useMemo } from 'react'
import { createRandom } from '../../lib/random'
import { Box, DARK_WOOD, FABRIC, METAL, WOOD } from '../parts'

/** 공통 가구: 옷장 · 책장 · 소파 · 냉장고 · TV · 커튼 · 쓰레기통 · 빨래 건조대 · 스탠드 조명 · 1인 소파 · 무드등 */

export function Wardrobe({ color = '#e8e2d6' }: { color?: string }) {
  return (
    <group>
      <Box size={[0.9, 1.5, 0.5]} position={[0, 0.75, 0]} color={color} />
      {/* 문 사이 틈 + 손잡이 */}
      <Box size={[0.01, 1.42, 0.01]} position={[0, 0.75, 0.255]} color="#9a9488" />
      {[-0.05, 0.05].map((x) => (
        <Box key={x} size={[0.015, 0.16, 0.02]} position={[x, 0.8, 0.265]} color={METAL} />
      ))}
      <Box size={[0.92, 0.04, 0.52]} position={[0, 1.52, 0]} color="#d8d1c3" />
    </group>
  )
}

export function Bookshelf({ seed = 3 }: { seed?: number }) {
  const books = useMemo(() => {
    const rand = createRandom(seed)
    const colors = ['#7a1f24', '#2c5e9e', '#c7b9a3', '#3b4458', '#e0a43a', '#6d7a8a', '#4f7a4a', '#d8d4cc']
    const out: { x: number; y: number; w: number; h: number; c: string }[] = []
    for (let shelf = 0; shelf < 4; shelf++) {
      let x = -0.36
      while (x < 0.3) {
        const w = 0.03 + rand() * 0.04
        const h = 0.18 + rand() * 0.1
        if (rand() > 0.12) out.push({ x: x + w / 2, y: 0.04 + shelf * 0.32, w, h, c: colors[Math.floor(rand() * colors.length)] })
        x += w + 0.005
      }
    }
    return out
  }, [seed])
  return (
    <group>
      {/* 뒤판·옆판·선반 */}
      <Box size={[0.8, 1.3, 0.02]} position={[0, 0.65, -0.14]} color={DARK_WOOD} />
      {[-0.39, 0.39].map((x) => (
        <Box key={x} size={[0.02, 1.3, 0.3]} position={[x, 0.65, 0]} color={WOOD} />
      ))}
      {[0, 0.32, 0.64, 0.96, 1.28].map((y) => (
        <Box key={y} size={[0.8, 0.025, 0.3]} position={[0, y + 0.012, 0]} color={WOOD} />
      ))}
      {books.map((b, i) => (
        <Box key={i} size={[b.w, b.h, 0.2]} position={[b.x, b.y + b.h / 2, 0.02]} color={b.c} />
      ))}
    </group>
  )
}

export function Sofa({ color = '#5d6472' }: { color?: string }) {
  return (
    <group>
      <Box size={[1.4, 0.22, 0.65]} position={[0, 0.11, 0]} color={color} />
      <Box size={[1.24, 0.1, 0.5]} position={[0, 0.27, 0.05]} color={color} />
      <Box size={[1.4, 0.4, 0.16]} position={[0, 0.4, -0.25]} color={color} />
      {[-0.63, 0.63].map((x) => (
        <Box key={x} size={[0.14, 0.32, 0.65]} position={[x, 0.3, 0]} color={color} />
      ))}
      <Box size={[0.3, 0.22, 0.08]} position={[-0.42, 0.42, -0.13]} color={FABRIC} />
    </group>
  )
}

export function Armchair({ color = '#7a5a4a' }: { color?: string }) {
  return (
    <group>
      <Box size={[0.72, 0.22, 0.68]} position={[0, 0.11, 0]} color={color} />
      <Box size={[0.52, 0.1, 0.52]} position={[0, 0.27, 0.06]} color={color} />
      <Box size={[0.72, 0.5, 0.15]} position={[0, 0.45, -0.27]} color={color} />
      {[-0.31, 0.31].map((x) => (
        <Box key={x} size={[0.1, 0.34, 0.68]} position={[x, 0.32, 0]} color={color} />
      ))}
    </group>
  )
}

export function Fridge({ color = '#d9dbde' }: { color?: string }) {
  return (
    <group>
      <Box size={[0.52, 1.25, 0.52]} position={[0, 0.625, 0]} color={color} />
      <Box size={[0.5, 0.01, 0.01]} position={[0, 0.85, 0.262]} color="#9aa0a8" />
      {[1.05, 0.62].map((y) => (
        <Box key={y} size={[0.02, 0.18, 0.025]} position={[0.2, y, 0.27]} color={METAL} />
      ))}
      {/* 자석 메모 */}
      <Box size={[0.08, 0.1, 0.005]} position={[-0.1, 1.05, 0.263]} color="#fff3a8" />
    </group>
  )
}

export function Tv({ lit }: { lit: boolean }) {
  return (
    <group>
      <Box size={[0.9, 0.34, 0.36]} position={[0, 0.17, 0]} color={DARK_WOOD} />
      <Box size={[0.18, 0.03, 0.12]} position={[0, 0.355, 0]} color="#222" />
      <Box size={[0.04, 0.08, 0.04]} position={[0, 0.4, 0]} color="#222" />
      <Box size={[0.82, 0.48, 0.03]} position={[0, 0.68, 0]} color="#151515" />
      <mesh position={[0, 0.68, 0.017]}>
        <planeGeometry args={[0.78, 0.44]} />
        <meshBasicMaterial color={lit ? '#5a7fb0' : '#0c0d10'} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** 벽에 거는 커튼. 원점 = 벽면 가운데 */
export function Curtain({ color = '#b9a99a' }: { color?: string }) {
  const folds = [-0.42, -0.34, -0.26, 0.26, 0.34, 0.42]
  return (
    <group>
      <Box size={[1.1, 0.03, 0.03]} position={[0, 0.62, 0.05]} color={METAL} />
      {folds.map((x, i) => (
        <Box key={x} size={[0.085, 1.2, 0.04 + (i % 2) * 0.03]} position={[x, 0, 0.06]} color={color} />
      ))}
    </group>
  )
}

export function TrashCan() {
  return (
    <group>
      <mesh position-y={0.15}>
        <cylinderGeometry args={[0.12, 0.1, 0.3, 14, 1, true]} />
        <meshStandardMaterial color="#8a8f99" side={2} />
      </mesh>
      <mesh position-y={0.005}>
        <cylinderGeometry args={[0.1, 0.1, 0.01, 14]} />
        <meshStandardMaterial color="#6f747c" />
      </mesh>
      {/* 구겨진 종이 */}
      <mesh position={[0.02, 0.26, 0]} scale={0.05}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f2f0ea" flatShading />
      </mesh>
    </group>
  )
}

export function DryingRack() {
  const clothes = ['#e9e4da', '#3b4458', '#f4c7c3', '#ffffff', '#8b9bb4']
  return (
    <group>
      {[-0.55, 0.55].map((x) =>
        [-0.18, 0.18].map((z) => (
          <Box key={`${x}${z}`} size={[0.02, 0.8, 0.02]} position={[x, 0.4, z]} color="#c9ccd2" />
        )),
      )}
      {[-0.18, 0, 0.18].map((z) => (
        <Box key={z} size={[1.12, 0.015, 0.015]} position={[0, 0.8, z]} color="#c9ccd2" />
      ))}
      {clothes.map((c, i) => (
        <Box key={i} size={[0.16, 0.3, 0.01]} position={[-0.4 + i * 0.2, 0.65, (i % 3) * 0.18 - 0.18]} color={c} />
      ))}
    </group>
  )
}

export function FloorLamp({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position-y={0.01}>
        <cylinderGeometry args={[0.14, 0.14, 0.02, 16]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <Box size={[0.025, 1.3, 0.025]} position={[0, 0.65, 0]} color={METAL} />
      <mesh position-y={1.32}>
        <cylinderGeometry args={[0.1, 0.18, 0.2, 16, 1, true]} />
        <meshStandardMaterial color="#efe6d2" emissive={lit ? '#ffcf8a' : '#000'} emissiveIntensity={0.6} side={2} />
      </mesh>
      {lit && <pointLight position={[0, 1.25, 0]} intensity={1.2} distance={2.6} decay={1.5} color="#ffd59a" />}
    </group>
  )
}

export function MoodLamp({ lit, color = '#ffb36b' }: { lit: boolean; color?: string }) {
  return (
    <group>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[0.06, 0.07, 0.06, 14]} />
        <meshStandardMaterial color="#3b3530" />
      </mesh>
      <mesh position-y={0.12}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={lit ? color : '#4a443d'} toneMapped={false} />
      </mesh>
      {lit && <pointLight position={[0, 0.15, 0]} intensity={0.6} distance={1.4} decay={1.5} color={color} />}
    </group>
  )
}
