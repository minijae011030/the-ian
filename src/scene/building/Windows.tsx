import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, InstancedMesh, MeshBasicMaterial, Object3D, SRGBColorSpace } from 'three'
import { setFocused, useFocused } from '../../state/focus'
import { environment } from '../environment'
import { SLOTS } from './config'
import { currentActivity, isLightOn, ROOM_BY_SLOT } from './rooms'

const LIT = '#ffe2b3'
const SHOP = '#dfe8ff'
const DARK = '#1b2433' // 불 꺼진 방
const VACANT = '#141b27' // 아직 안 열린 방

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

/**
 * 칸마다 들어간 유리창.
 * - 방 데이터가 있는 칸: 그 방 일과에 따라 불이 켜지고 꺼짐 (자거나 외출하면 꺼짐)
 * - 방 데이터가 없는 칸: 아직 안 열린 방이라 어두움
 * - 1층: 상가
 */
export function Windows() {
  const ref = useRef<InstancedMesh>(null)
  const focused = useFocused()
  const pane = useMemo(createPaneTexture, [])
  const lastMinute = useRef(-1)

  // 위치: 들여다보는 방은 유리를 치워서 안이 보이게
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    SLOTS.forEach((s, i) => {
      const hidden = focused !== null && ROOM_BY_SLOT.get(s.id)?.id === focused
      dummy.position.set(...s.position)
      dummy.rotation.set(0, s.rotationY, 0)
      dummy.scale.set(hidden ? 0 : s.size[0], hidden ? 0 : s.size[1], 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [focused])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return

    // 낮에는 실내 불빛이 바깥 햇빛에 묻혀서 덜 밝아 보이게
    ;(mesh.material as MeshBasicMaterial).color.setScalar(0.55 + 0.45 * environment.darkness)

    // 불 켜짐은 1분에 한 번만 다시 계산
    const minute = Math.floor(environment.hour * 60)
    if (minute === lastMinute.current) return
    lastMinute.current = minute

    const color = new Color()
    SLOTS.forEach((s, i) => {
      const room = ROOM_BY_SLOT.get(s.id)
      if (s.floor === 0) color.set(SHOP)
      else if (!room) color.set(VACANT)
      else color.set(isLightOn(currentActivity(room, environment.hour)) ? LIT : DARK)
      mesh.setColorAt(i, color)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  const roomAt = (instanceId: number | undefined) =>
    instanceId === undefined ? undefined : ROOM_BY_SLOT.get(SLOTS[instanceId].id)

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, SLOTS.length]}
      onClick={(e) => {
        // 드래그로 돌리다 손 뗀 건 클릭으로 치지 않음
        if (e.delta > 4) return
        const room = roomAt(e.instanceId)
        if (!room) return
        e.stopPropagation()
        setFocused(room.id)
      }}
      onPointerMove={(e) => {
        document.body.style.cursor = roomAt(e.instanceId) ? 'pointer' : ''
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={pane} toneMapped={false} />
    </instancedMesh>
  )
}
