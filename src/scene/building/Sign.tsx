import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { BUILDING, BUILDING_HEIGHT } from './config'

/** 옥상 크라운 정면의 THE IAN 간판. 폰트 다운로드 없이 캔버스로 그림 */
export function Sign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 160
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.font = '600 118px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = '24px'
    ctx.fillText('THE IAN', canvas.width / 2, canvas.height / 2 + 6)
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])

  const w = 6.4
  return (
    <mesh position={[0, BUILDING_HEIGHT + BUILDING.crownHeight / 2, BUILDING.depth / 2 + 0.02]}>
      <planeGeometry args={[w, w * (160 / 1024)]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}
