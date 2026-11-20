import { useMemo } from 'react'
import { canvasTexture } from '../lib/canvasTexture'

/**
 * 아이템을 만드는 부품들 (도형 조합 가구). 전부 바닥(y=0) 기준, 기본 방향은 앞면이 +z.
 * 크기 단위는 대충 1 = 1.3m (천장이 1.78)
 */
export const WOOD = '#b98b5e'
export const DARK_WOOD = '#7a5a3f'
export const METAL = '#5b616b'
export const FABRIC = '#f4f1ea'

type P = { position?: [number, number, number]; rotationY?: number }

export function Box({
  size,
  position,
  color,
  emissive,
}: {
  size: [number, number, number]
  position: [number, number, number]
  color: string
  emissive?: string
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={emissive ?? '#000'} roughness={0.8} />
    </mesh>
  )
}

/** 싱글 침대. 길이 방향이 z, 베개가 -z 쪽 */
export function Bed({ position, rotationY = 0, blanket = '#9fb4d6' }: P & { blanket?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[0.95, 0.34, 2]} position={[0, 0.17, 0]} color={WOOD} />
      <Box size={[0.9, 0.14, 1.95]} position={[0, 0.41, 0]} color={FABRIC} />
      <Box size={[0.6, 0.1, 0.32]} position={[0, 0.53, -0.78]} color="#ffffff" />
      <Box size={[0.93, 0.07, 1.15]} position={[0, 0.51, 0.3]} color={blanket} />
      <Box size={[0.95, 0.5, 0.06]} position={[0, 0.42, -1.0]} color={DARK_WOOD} />
    </group>
  )
}

/** 책상. 앞면(+z)이 앉는 쪽이 아니라 반대: 앉는 사람은 -z 쪽에서 +z를 봄 */
export function Desk({ position, rotationY = 0, width = 1.2 }: P & { width?: number }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[width, 0.04, 0.55]} position={[0, 0.72, 0]} color={WOOD} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.04, 0.72, 0.5]} position={[(s * (width - 0.06)) / 2, 0.36, 0]} color={METAL} />
      ))}
      <Box size={[width - 0.1, 0.25, 0.03]} position={[0, 0.58, 0.24]} color={METAL} />
    </group>
  )
}

/** 의자. 등받이가 -z 쪽 → +z를 보고 앉음 */
export function Chair({ position, rotationY = 0, color = '#8c93a1' }: P & { color?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[0.42, 0.06, 0.42]} position={[0, 0.43, 0]} color={color} />
      <Box size={[0.42, 0.45, 0.05]} position={[0, 0.7, -0.2]} color={color} />
      <Box size={[0.05, 0.4, 0.05]} position={[0, 0.2, 0]} color={METAL} />
      <Box size={[0.4, 0.03, 0.4]} position={[0, 0.02, 0]} color={METAL} />
    </group>
  )
}

/** 노트북. 화면이 -z(앉은 사람)를 향함. 화면에 띄울 그림은 draw로 */
export function Laptop({
  position,
  rotationY = 0,
  draw,
  on = true,
}: P & { draw?: (ctx: CanvasRenderingContext2D) => void; on?: boolean }) {
  const screen = useMemo(
    () =>
      canvasTexture(256, 160, (ctx) => {
        ctx.fillStyle = '#f7f7f9'
        ctx.fillRect(0, 0, 256, 160)
        if (draw) draw(ctx)
      }),
    [draw],
  )
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[0.42, 0.02, 0.28]} position={[0, 0.01, 0]} color="#c9ccd2" />
      <group position={[0, 0.02, 0.13]} rotation-x={-0.25}>
        <Box size={[0.42, 0.27, 0.015]} position={[0, 0.135, 0]} color="#c9ccd2" />
        <mesh position={[0, 0.135, -0.009]} rotation-y={Math.PI}>
          <planeGeometry args={[0.39, 0.24]} />
          <meshBasicMaterial map={screen} toneMapped={false} color={on ? '#ffffff' : '#222'} />
        </mesh>
      </group>
    </group>
  )
}

export function DeskLamp({ position, on = true }: P & { on?: boolean }) {
  return (
    <group position={position}>
      <Box size={[0.12, 0.02, 0.12]} position={[0, 0.01, 0]} color={METAL} />
      <Box size={[0.02, 0.32, 0.02]} position={[0, 0.17, 0]} color={METAL} />
      <mesh position={[0, 0.33, 0.04]}>
        <cylinderGeometry args={[0.05, 0.09, 0.08, 12]} />
        <meshBasicMaterial color={on ? '#fff1cc' : '#8a8578'} toneMapped={false} />
      </mesh>
      {on && <pointLight position={[0, 0.25, 0.05]} intensity={0.8} distance={1.6} decay={1.5} color="#ffd9a0" />}
    </group>
  )
}

/** 책 더미. 색 배열 순서대로 쌓음 */
export function BookStack({ position, colors, rotationY = 0 }: P & { colors: string[] }) {
  return (
    <group position={position} rotation-y={rotationY}>
      {colors.map((c, i) => (
        <Box key={i} size={[0.24 - (i % 2) * 0.02, 0.045, 0.17]} position={[(i % 3) * 0.01, 0.023 + i * 0.046, 0]} color={c} />
      ))}
    </group>
  )
}

/** 벽에 붙이는 그림/달력/메모. 벽 앞면 기준 +z를 바라봄 */
export function WallPicture({
  position,
  rotationY = 0,
  size,
  draw,
}: P & { size: [number, number]; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }) {
  const W = Math.round(size[0] * 400)
  const H = Math.round(size[1] * 400)
  const texture = useMemo(() => canvasTexture(W, H, (ctx) => draw(ctx, W, H)), [W, H, draw])
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  )
}

/** 화장대: 낮은 서랍장 + 벽거울. 앞면 +z */
export function Vanity({ position, rotationY = 0 }: P) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[0.7, 0.62, 0.36]} position={[0, 0.31, 0]} color="#f2ede6" />
      <Box size={[0.7, 0.02, 0.36]} position={[0, 0.63, 0]} color={WOOD} />
      <mesh position={[0, 1.05, -0.17]}>
        <planeGeometry args={[0.5, 0.62]} />
        <meshStandardMaterial color="#cfe0ee" metalness={0.9} roughness={0.08} />
      </mesh>
      {/* 스킨케어 병들 */}
      {['#ffffff', '#f4c7c3', '#c8e6d3', '#f7e3b0'].map((c, i) => (
        <mesh key={c} position={[-0.22 + i * 0.12, 0.7, 0.02]}>
          <cylinderGeometry args={[0.025, 0.03, 0.12 - (i % 2) * 0.04, 10]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}

/** 행거. 옷 색들을 걸어둠 */
export function ClothesRack({ position, rotationY = 0, clothes }: P & { clothes: string[] }) {
  return (
    <group position={position} rotation-y={rotationY}>
      {[-0.4, 0.4].map((x) => (
        <Box key={x} size={[0.03, 1.3, 0.03]} position={[x, 0.65, 0]} color={METAL} />
      ))}
      <Box size={[0.83, 0.03, 0.03]} position={[0, 1.28, 0]} color={METAL} />
      {clothes.map((c, i) => (
        <group key={i} position={[-0.28 + i * 0.18, 0.98, 0]}>
          <Box size={[0.05, 0.5, 0.36]} position={[0, 0, 0]} color={c} />
        </group>
      ))}
    </group>
  )
}

export function Rug({ position, size, color }: P & { size: [number, number]; color: string }) {
  return (
    <mesh position={[position?.[0] ?? 0, 0.006, position?.[2] ?? 0]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

export function Plant({ position }: P) {
  return (
    <group position={position}>
      <mesh position-y={0.12}>
        <cylinderGeometry args={[0.1, 0.08, 0.24, 12]} />
        <meshStandardMaterial color="#d9cbb8" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2.1) * 0.06, 0.38 + i * 0.07, Math.cos(i * 2.1) * 0.06]} scale={[0.14, 0.18, 0.14]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4f8a4a" flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** 손에 드는 소품들 */
export function Bowl({ position }: P) {
  return (
    <group position={position}>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.08, 0.05, 0.07, 14]} />
        <meshStandardMaterial color="#f5f2ec" />
      </mesh>
      <mesh position-y={0.075}>
        <cylinderGeometry args={[0.07, 0.07, 0.01, 14]} />
        <meshStandardMaterial color="#e9d6a8" />
      </mesh>
    </group>
  )
}
