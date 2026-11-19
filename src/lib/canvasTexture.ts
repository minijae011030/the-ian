import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** 캔버스에 그려서 텍스처 만들기. 폰트·이미지 다운로드 없이 간판·바닥 무늬 만들 때 씀 */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function repeating(texture: CanvasTexture, x: number, y: number) {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(x, y)
  return texture
}
