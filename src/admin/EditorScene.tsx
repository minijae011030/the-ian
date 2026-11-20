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
import { findOverlaps, type Placement, placeAt } from './placement'

type Props = {
  size: RoomSize
  layout: LayoutData
  selectedId: string | null
  previewKind: ActivityKind
  view: number
  /** 팔레트에서 고른, 아직 안 놓은 아이템 */
  placing: string | null
  onSelect: (id: string | null) => void
  onDragStart: () => void
  onMove: (id: string, patch: Partial<PlacedItem>) => void
  /** keepPlacing: Shift 누르고 클릭 → 같은 아이템을 계속 놓음 */
  onPlace: (itemId: string, at: Placement, keepPlacing: boolean) => void
}

/**
 * 방꾸 에디터 화면. 직교 카메라로 방 하나를 비스듬히 내려다봄.
 * 벽·천장은 안쪽 면만 그려서 카메라 쪽 벽은 자동으로 안 보임 (방꾸 게임처럼 잘린 방)
 */
export function EditorScene(props: Props) {
  return (
    <Canvas
      orthographic
      camera={{ zoom: 140, near: -100, far: 100 }}
      onPointerMissed={() => !props.placing && props.onSelect(null)}
      style={{ cursor: props.placing ? 'copy' : 'default' }}
    >
      <color attach="background" args={['#0d1017']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} />
      <Scene {...props} />
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
}: Props) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera)
  const raycaster = useThree((s) => s.raycaster)
  const pointer = useThree((s) => s.pointer)
  const gl = useThree((s) => s.gl)
  const drag = useRef<{ item: PlacedItem; offset?: Vector3 } | null>(null)
  const [ghost, setGhost] = useState<Placement | null>(null)
  const ghostRef = useRef<Placement | null>(null)
  const overlaps = useMemo(() => findOverlaps(layout), [layout])

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
      onPlace(placing, ghostRef.current, e.shiftKey)
    }
    gl.domElement.addEventListener('pointerdown', down)
    return () => gl.domElement.removeEventListener('pointerdown', down)
  }, [placing, gl, onPlace])

  useFrame(() => {
    if (!drag.current && !placing) return
    raycaster.setFromCamera(pointer, camera)

    if (placing) {
      const at = placeAt(placing, raycaster.ray, layout, size)
      const changed = JSON.stringify(at) !== JSON.stringify(ghostRef.current)
      ghostRef.current = at
      if (changed) setGhost(at)
      return
    }

    const d = drag.current!
    const at = placeAt(d.item.item, raycaster.ray, layout, size, { excludeId: d.item.id, offset: d.offset })
    if (at) onMove(d.item.id, at)
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
    drag.current = { item, offset }
    if (controls.current) controls.current.enabled = false
    onDragStart()
  }

  const spot = findSpot(layout, previewKind)
  const lit = previewKind !== 'sleep' && previewKind !== 'away'

  return (
    <>
      <OrbitControls ref={controls} enableRotate={false} enableDamping={false} screenSpacePanning minZoom={60} maxZoom={400} />
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
            placed={{ id: '__ghost', item: placing, rot: 0, ...ghost, variant: CATALOG[placing]?.variants[0] }}
            lit={lit}
          />
        </Selectable>
      )}

      {spot && (
        <group position={spot.position} rotation-y={spot.rotationY}>
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
