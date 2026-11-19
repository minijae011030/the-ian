import { useMemo } from 'react'
import { canvasTexture } from '../../lib/canvasTexture'
import { SIDEWALK_HEIGHT } from '../surroundings/layout'
import { ROAD_SIGN } from './layout'

const W = 512
const H = 256

/** 사진 속 파란 도로 표지판. 잠실 버전 */
function drawSign(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1f4fa8'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, W - 20, H - 20)

  const font = (size: number, weight = 700) =>
    `${weight} ${size}px "Apple SD Gothic Neo", "Noto Sans KR", "Noto Sans CJK KR", sans-serif`
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'

  // 위: 직진 올림픽로
  ctx.textAlign = 'center'
  ctx.font = font(30)
  ctx.fillText('↑', W / 2, 46)
  ctx.font = font(44)
  ctx.fillText('올림픽로', W / 2, 92)
  ctx.font = font(20, 500)
  ctx.fillText('Olympic-ro', W / 2, 128)

  // 아래 좌우
  ctx.font = font(32)
  ctx.textAlign = 'left'
  ctx.fillText('← 석촌호수', 32, 196)
  ctx.textAlign = 'right'
  ctx.fillText('잠실역 →', W - 32, 196)
}

export function RoadSign() {
  const [x, z] = ROAD_SIGN
  const texture = useMemo(() => canvasTexture(W, H, drawSign), [])
  const poleH = 6.4
  const arm = 4.2

  return (
    <group position={[x, SIDEWALK_HEIGHT, z]}>
      <mesh position-y={poleH / 2}>
        <cylinderGeometry args={[0.14, 0.18, poleH, 8]} />
        <meshStandardMaterial color="#6f747c" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* 도로 쪽(-x)으로 뻗은 팔 */}
      <mesh position={[-arm / 2, poleH - 0.3, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, arm, 8]} />
        <meshStandardMaterial color="#6f747c" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-arm + 0.6, poleH - 1.2, 0.06]}>
        <planeGeometry args={[3, 1.5]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-arm + 0.6, poleH - 1.2, 0]}>
        <boxGeometry args={[3.04, 1.54, 0.08]} />
        <meshStandardMaterial color="#5d636c" />
      </mesh>
    </group>
  )
}
