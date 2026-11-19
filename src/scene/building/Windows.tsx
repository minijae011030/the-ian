import { useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, InstancedMesh, Object3D, SRGBColorSpace } from 'three'
import { createRandom } from '../../lib/random'
import { createWindowSlots, placeholderLit } from './config'

const LIT = ['#ffe7bf', '#fff1d8', '#ffdca3', '#fff6e6']
const SHOP = '#dfe8ff'
const DARK = '#1b2433'

/**
 * 창 한 칸 텍스처. 위쪽(천장 조명)이 더 밝은 그라데이션 + 창틀·세로 멀리언·난간 줄.
 * 흰색 기준이라 인스턴스 색이랑 곱해져서 켜진 방·꺼진 방 모두에 씀
 */
function createPaneTexture() {
  const w = 64
  const h = 64
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#b9b9b9')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#3c3f47'
  ctx.fillRect(0, 0, w, 2) // 위 창틀
  ctx.fillRect(0, h - 2, w, 2) // 아래 창틀
  ctx.fillRect(0, 0, 2, h)
  ctx.fillRect(w - 2, 0, 2, h)
  ctx.fillRect(Math.round(w * 0.68), 0, 2, h) // 세로 멀리언
  ctx.fillRect(0, Math.round(h * 0.74), w, 1) // 난간

  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  return t
}

/** 칸마다 들어간 유리창. 켜진 방은 따뜻한 빛, 꺼진 방은 어두운 유리 */
export function Windows() {
  const ref = useRef<InstancedMesh>(null)
  const slots = useMemo(createWindowSlots, [])
  const lit = useMemo(() => placeholderLit(slots), [slots])
  const pane = useMemo(createPaneTexture, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = createRandom(7)
    const dummy = new Object3D()
    const color = new Color()
    slots.forEach((s, i) => {
      dummy.position.set(...s.position)
      dummy.rotation.set(0, s.rotationY, 0)
      dummy.scale.set(s.size[0], s.size[1], 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      if (s.floor === 0) color.set(SHOP)
      else if (lit.get(s.id)) color.set(LIT[Math.floor(rand() * LIT.length)])
      else color.set(DARK)
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [slots, lit])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, slots.length]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={pane} toneMapped={false} />
    </instancedMesh>
  )
}
