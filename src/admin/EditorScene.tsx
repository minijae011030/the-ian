import { Grid, OrbitControls, useHelper } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BoxHelper, type Group, Plane, Vector3 } from 'three'
import type { ActivityKind } from '../data/rooms'
import { CATALOG } from '../items/catalog'
import { Character } from '../scene/character/Character'
import { findSpot } from '../scene/rooms/layoutData'
import { PlacedItemMesh } from '../scene/rooms/PlacedItems'
import { RoomShell } from '../scene/rooms/RoomShell'
import type { LayoutData, PlacedItem, RoomSize } from '../scene/rooms/types'
import { ActionBar } from './ActionBar'
import { findOverlaps, type Placement, placeAt, ridersOf } from './placement'

type Props = {
  size: RoomSize
  layout: LayoutData
  selectedId: string | null
  previewKind: ActivityKind
  view: number
  /** 아이템 상자에서 고른, 아직 안 놓은 물건 */
  placing: { item: string; variant: string } | null
  onSelect: (id: string | null) => void
  onDragStart: () => void
  /** 끌기 중 이동. 가구 위 소품도 같이 옮겨서 여러 개가 한 번에 옴 */
  onMove: (moves: { id: string; patch: Partial<PlacedItem> }[]) => void
  /** keepPlacing: Shift 누르고 클릭 → 같은 아이템을 계속 놓음 */
  onPlace: (at: Placement, keepPlacing: boolean) => void
  onTurn: () => void
  onRemove: () => void
}

/**
 * 방꾸 에디터 화면. 직교 카메라로 방 하나를 비스듬히 내려다봄.
 * 벽·천장은 안쪽 면만 그려서 카메라 쪽 벽은 자동으로 안 보임 (방꾸 게임처럼 잘린 방)
 */
export function EditorScene(props: Props) {
  // 방금 놓은 클릭이 빈 곳 클릭(선택 해제)으로도 잡히지 않게
  const placedAt = useRef(0)
  return (
    <Canvas
      orthographic
      camera={{ zoom: 140, near: -100, far: 100 }}
      onPointerMissed={() => !props.placing && performance.now() - placedAt.current > 400 && props.onSelect(null)}
      style={{ cursor: props.placing ? 'copy' : 'default' }}
    >
      <color attach="background" args={['#0d1017']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} />
      <Scene {...props} placedAt={placedAt} />
    </Canvas>
  )
}

function Scene({
  size,
  layout,
  selectedId,
  previewKind,
  view,
  placing,
  onSelect,
  onDragStart,
  onMove,
  onPlace,
  onTurn,
  onRemove,
  placedAt,
}: Props & { placedAt: React.RefObject<number> }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera)
  const raycaster = useThree((s) => s.raycaster)
  const pointer = useThree((s) => s.pointer)
  const gl = useThree((s) => s.gl)
  const drag = useRef<{
    item: PlacedItem
    offset?: Vector3
    riders: { id: string; dx: number; dz: number }[]
  } | null>(null)
  const [ghost, setGhost] = useState<Placement | null>(null)
  const ghostRef = useRef<Placement | null>(null)
  const overlaps = useMemo(() => findOverlaps(layout), [layout])

  // 화면 크기에 맞춰 방이 꽉 차게 확대 (창을 줄이면 방도 같이 작아짐)
  const viewport = useThree((s) => s.size)
  useEffect(() => {
    const spread = Math.SQRT1_2 * (size.w + size.d) // 비스듬히 봤을 때 방 가로폭
    const tall = size.h * 0.87 + spread * 0.5
    camera.zoom = Math.max(40, Math.min((viewport.width * 0.85) / spread, (viewport.height * 0.78) / tall))
    camera.updateProjectionMatrix()
  }, [camera, viewport.width, viewport.height, size.w, size.d, size.h])

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

  // 놓기 모드: 캔버스 클릭 = 미리보기 자리에 놓기
  useEffect(() => {
    if (!placing) {
      setGhost(null)
      ghostRef.current = null
      return
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !ghostRef.current) return
      placedAt.current = performance.now()
      onPlace(ghostRef.current, e.shiftKey)
    }
    gl.domElement.addEventListener('pointerdown', down)
    return () => gl.domElement.removeEventListener('pointerdown', down)
  }, [placing, gl, onPlace, placedAt])

  useFrame(() => {
    if (!drag.current && !placing) return
    raycaster.setFromCamera(pointer, camera)

    if (placing) {
      const at = placeAt(placing.item, raycaster.ray, layout, size)
      const changed = JSON.stringify(at) !== JSON.stringify(ghostRef.current)
      ghostRef.current = at
      if (changed) setGhost(at)
      return
    }

    const d = drag.current!
    const at = placeAt(d.item.item, raycaster.ray, layout, size, { excludeId: d.item.id, offset: d.offset })
    if (!at) return
    onMove([
      { id: d.item.id, patch: at },
      ...d.riders.map((r) => ({ id: r.id, patch: { x: Number((at.x + r.dx).toFixed(2)), z: Number((at.z + r.dz).toFixed(2)) } })),
    ])
  })

  const startDrag = (item: PlacedItem) => {
    // 바닥 가구는 잡은 지점과 중심 사이 간격을 유지 (안 그러면 잡는 순간 중심이 마우스로 튐)
    let offset: Vector3 | undefined
    if (CATALOG[item.item]?.place === 'floor') {
      const hit = new Vector3()
      if (raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), hit)) {
        offset = hit.sub(new Vector3(item.x, 0, item.z))
      }
    }
    const riders = ridersOf(layout, item).map((r) => ({ id: r.id, dx: r.x - item.x, dz: r.z - item.z }))
    drag.current = { item, offset, riders }
    if (controls.current) controls.current.enabled = false
    onDragStart()
  }

  const spot = findSpot(layout, previewKind)
  const lit = previewKind !== 'sleep' && previewKind !== 'away'

  return (
    <>
      <OrbitControls ref={controls} enableRotate={false} enableZoom={false} enableDamping={false} screenSpacePanning />
      <RoomShell size={size} lightOn={lit} wall={layout.wall} floor={layout.floor} />
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
            outline={placed.id === selectedId ? '#e0a43a' : overlaps.has(placed.id) ? '#ff4d4d' : null}
            opacity={hidden ? 0.3 : 1}
            onPointerDown={() => {
              if (placing) return
              onSelect(placed.id)
              startDrag(placed)
            }}
          >
            <PlacedItemMesh placed={placed} lit={lit} />
          </Selectable>
        )
      })}

      {placing && ghost && (
        <Selectable outline="#8ab4ff" opacity={0.55} onPointerDown={() => {}}>
          <PlacedItemMesh
            placed={{ id: '__ghost', item: placing.item, variant: placing.variant, rot: 0, ...ghost }}
            lit={lit}
          />
        </Selectable>
      )}

      {selectedId && !placing && (() => {
        const item = layout.items.find((it) => it.id === selectedId)
        return item ? (
          <ActionBar item={item} onTurn={onTurn} onRemove={onRemove} />
        ) : null
      })()}

      {spot && (
        <group
          position={spot.position}
          rotation-y={spot.rotationY}
          onPointerDown={(e) => {
            // 캐릭터를 잡으면 캐릭터가 쓰는 가구(의자·침대…)를 잡은 걸로
            const source = layout.items.find((it) => it.id === spot.source)
            if (e.button !== 0 || placing || !source) return
            e.stopPropagation()
            onSelect(source.id)
            startDrag(source)
          }}
        >
          <Character pose={spot.pose} hands={spot.hands} prop={spot.prop} seat={spot.seat} />
        </group>
      )}
    </>
  )
}

function Selectable({
  outline,
  opacity,
  onPointerDown,
  children,
}: {
  outline: string | null
  opacity: number
  onPointerDown: () => void
  children: React.ReactNode
}) {
  const ref = useRef<Group>(null)
  useHelper(outline ? (ref as React.RefObject<Group>) : null, BoxHelper, outline ?? undefined)

  useEffect(() => {
    // when 조건에 안 맞는 아이템(예: 밥그릇)이나 놓기 전 미리보기는 반투명하게
    ref.current?.traverse((o) => {
      const m = (o as { material?: { transparent: boolean; opacity: number; depthWrite: boolean } }).material
      if (!m) return
      m.transparent = opacity < 1
      m.opacity = opacity
      m.depthWrite = opacity >= 1
    })
  })

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
