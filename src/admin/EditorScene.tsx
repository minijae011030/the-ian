import { Grid, OrbitControls, useHelper } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { BoxHelper, type Group, Plane, Vector3 } from 'three'
import type { ActivityKind } from '../data/rooms'
import { CATALOG } from '../items/catalog'
import { Character } from '../scene/character/Character'
import { findSpot } from '../scene/rooms/layoutData'
import { PlacedItemMesh } from '../scene/rooms/PlacedItems'
import { RoomShell } from '../scene/rooms/RoomShell'
import type { LayoutData, PlacedItem, RoomSize } from '../scene/rooms/types'

export const SNAP = 0.05
// toFixed: 0.05 단위로 맞추다 생기는 -0.30000004 같은 부동소수 찌꺼기 제거
const snap = (v: number) => Number((Math.round(v / SNAP) * SNAP).toFixed(2))

type Props = {
  size: RoomSize
  layout: LayoutData
  selectedId: string | null
  previewKind: ActivityKind
  view: number
  onSelect: (id: string | null) => void
  onDragStart: () => void
  onMove: (id: string, patch: Partial<PlacedItem>) => void
}

/**
 * 방꾸 에디터 화면. 직교 카메라로 방 하나를 비스듬히 내려다봄.
 * 벽·천장은 안쪽 면만 그려서 카메라 쪽 벽은 자동으로 안 보임 (방꾸 게임처럼 잘린 방)
 */
export function EditorScene(props: Props) {
  return (
    <Canvas orthographic camera={{ zoom: 140, near: -100, far: 100 }} onPointerMissed={() => props.onSelect(null)}>
      <color attach="background" args={['#0d1017']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} />
      <Scene {...props} />
    </Canvas>
  )
}

function Scene({ size, layout, selectedId, previewKind, view, onSelect, onDragStart, onMove }: Props) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera)
  const raycaster = useThree((s) => s.raycaster)
  const pointer = useThree((s) => s.pointer)
  const drag = useRef<{ item: PlacedItem; plane: Plane; offset: Vector3; axis: 'xz' | 'xy' | 'zy' } | null>(null)

  // 시점: 45도씩 돌린 4방향 중 하나
  useEffect(() => {
    const angle = Math.PI / 4 + (view * Math.PI) / 2
    const target = new Vector3(0, size.h * 0.35, 0)
    camera.position.set(Math.sin(angle) * 10, 8, Math.cos(angle) * 10).add(target)
    camera.lookAt(target)
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [view, camera, size.h])

  // 드래그 끝
  useEffect(() => {
    const up = () => {
      drag.current = null
      if (controls.current) controls.current.enabled = true
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  // 드래그 중: 마우스 광선이 이동 평면과 만나는 점으로 아이템을 옮김
  useFrame(() => {
    const d = drag.current
    if (!d) return
    raycaster.setFromCamera(pointer, camera)
    const hit = new Vector3()
    if (!raycaster.ray.intersectPlane(d.plane, hit)) return
    hit.sub(d.offset)
    const clampX = (v: number) => Math.max(-size.w / 2, Math.min(size.w / 2, snap(v)))
    const clampZ = (v: number) => Math.max(-size.d / 2, Math.min(size.d / 2, snap(v)))
    const clampY = (v: number) => Math.max(0, Math.min(size.h, snap(v)))
    const patch: Partial<PlacedItem> =
      d.axis === 'xz'
        ? { x: clampX(hit.x), z: clampZ(hit.z) }
        : d.axis === 'xy'
          ? { x: clampX(hit.x), y: clampY(hit.y) }
          : { z: clampZ(hit.z), y: clampY(hit.y) }
    onMove(d.item.id, patch)
  })

  const startDrag = (item: PlacedItem) => {
    const place = CATALOG[item.item]?.place
    // 벽 아이템은 벽면을 따라, 나머지는 바닥과 평행하게 움직임
    let axis: 'xz' | 'xy' | 'zy' = 'xz'
    let plane = new Plane(new Vector3(0, 1, 0), -item.y)
    if (place === 'wall') {
      const r = ((item.rot % 360) + 360) % 360
      if (r === 90 || r === 270) {
        axis = 'zy'
        plane = new Plane(new Vector3(1, 0, 0), -item.x)
      } else {
        axis = 'xy'
        plane = new Plane(new Vector3(0, 0, 1), -item.z)
      }
    }
    const onPlane = new Vector3()
    raycaster.ray.intersectPlane(plane, onPlane)
    drag.current = { item, plane, axis, offset: onPlane.sub(new Vector3(item.x, item.y, item.z)) }
    if (controls.current) controls.current.enabled = false
    onDragStart()
  }

  const spot = findSpot(layout, previewKind)

  return (
    <>
      <OrbitControls ref={controls} enableRotate={false} enableDamping={false} screenSpacePanning minZoom={60} maxZoom={400} />
      <RoomShell size={size} lightOn={previewKind !== 'sleep' && previewKind !== 'away'} wall={layout.wall} />
      <Grid
        args={[size.w, size.d]}
        position-y={0.003}
        cellSize={0.1}
        sectionSize={0.5}
        cellColor="#6b6152"
        sectionColor="#8f8371"
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={100}
      />

      {layout.items.map((placed) => {
        const hidden = placed.when && !placed.when.includes(previewKind)
        return (
          <Selectable
            key={placed.id}
            selected={placed.id === selectedId}
            dimmed={!!hidden}
            onPointerDown={() => {
              onSelect(placed.id)
              startDrag(placed)
            }}
          >
            <PlacedItemMesh placed={placed} lit={previewKind !== 'sleep'} />
          </Selectable>
        )
      })}

      {spot && (
        <group position={spot.position} rotation-y={spot.rotationY}>
          <Character pose={spot.pose} hands={spot.hands} prop={spot.prop} seat={spot.seat} />
        </group>
      )}
    </>
  )
}

function Selectable({
  selected,
  dimmed,
  onPointerDown,
  children,
}: {
  selected: boolean
  dimmed: boolean
  onPointerDown: () => void
  children: React.ReactNode
}) {
  const ref = useRef<Group>(null)
  useHelper(selected ? (ref as React.RefObject<Group>) : null, BoxHelper, '#e0a43a')

  useEffect(() => {
    // when 조건에 안 맞는 아이템(예: 밥그릇)은 반투명하게
    ref.current?.traverse((o) => {
      const m = (o as { material?: { transparent: boolean; opacity: number } }).material
      if (!m) return
      m.transparent = dimmed
      m.opacity = dimmed ? 0.3 : 1
    })
  }, [dimmed])

  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        onPointerDown()
      }}
    >
      {children}
    </group>
  )
}
