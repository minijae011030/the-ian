import { useMemo } from 'react'
import { canvasTexture, repeating } from '../../lib/canvasTexture'
import { BLOCK_SIZE, SIDEWALK_HEIGHT } from '../surroundings/layout'

/** 블록 바닥 보도블록 */
export function Paving() {
  const texture = useMemo(
    () =>
      repeating(
        canvasTexture(64, 64, (ctx) => {
          ctx.fillStyle = '#a3a39d'
          ctx.fillRect(0, 0, 64, 64)
          ctx.fillStyle = '#8f8e88'
          ctx.fillRect(0, 0, 32, 32)
          ctx.fillRect(32, 32, 32, 32)
          ctx.strokeStyle = '#5f5f5b'
          ctx.lineWidth = 2
          ctx.strokeRect(0, 0, 64, 64)
          ctx.beginPath()
          ctx.moveTo(32, 0)
          ctx.lineTo(32, 64)
          ctx.moveTo(0, 32)
          ctx.lineTo(64, 32)
          ctx.stroke()
        }),
        BLOCK_SIZE / 2,
        BLOCK_SIZE / 2,
      ),
    [],
  )

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={SIDEWALK_HEIGHT + 0.005}>
      <planeGeometry args={[BLOCK_SIZE, BLOCK_SIZE]} />
      <meshStandardMaterial map={texture} roughness={0.95} />
    </mesh>
  )
}
