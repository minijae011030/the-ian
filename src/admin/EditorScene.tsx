import { Grid, OrbitControls, useHelper } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BoxHelper, type Group, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { ActivityKind } from '../data/rooms'
import { CATALOG } from '../items/catalog'
import { RoomCharacter } from '../scene/character/RoomCharacter'
import { findSpot } from '../scene/rooms/layoutData'
import { PlacedItemMesh } from '../scene/rooms/PlacedItems'
import { RoomShell } from '../scene/rooms/RoomShell'
import type { LayoutData, PlacedItem, RoomSize } from '../scene/rooms/types'
import { ActionBar } from './ActionBar'
import { findOverlaps, isBlocked, overlappingWith, type Placement, placeAt, ridersOf, slideTo } from './placement'

/** 내려다보는 각도 (카메라 높이 8, 수평거리 10) */
const POLAR = Math.atan2(10, 8)

type Props = {
  size: RoomSize
  layout: LayoutData
  selectedId: string | null
  previewKind: ActivityKind
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
  // 마우스 위치는 직접 계산 (R3F pointer는 마우스가 방향/빼기 바 같은 HTML 위에 올라가면
  // 그 요소 기준 좌표로 바뀌어서 화면 구석으로 튐 → 물건이 순간이동하던 원인)
  const pointer = useRef(new Vector2())
  const [dragging, setDragging] = useState(false)
  const gl = useThree((s) => s.gl)
  const drag = useRef<{
    item: PlacedItem
    offset?: Vector3
    riders: { id: string; dx: number; dz: number }[]
    /** 마지막으로 옮긴 자리. 화면 갱신(React 렌더)이 한 박자 늦어도 이 값 기준으로 이어서 움직임 */
    pos: { x: number; y: number; z: number }
    /** 끌기 시작할 때 이미 겹쳐 있던 가구 → 막지 않음 */
    ignore: Set<string>
  } | null>(null)
  // useFrame 안에서 항상 최신 배치를 보게 (안 그러면 지난 화면의 배치로 계산해서 왔다갔다 함)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
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

  // 처음 시점: 방을 비스듬히 내려다봄. 그다음은 빈 곳을 끌어서 빙글 돌림
  useEffect(() => {
    const target = new Vector3(0, size.h * 0.35, 0)
    camera.position.set(Math.sin(Math.PI / 4) * 10, 8, Math.cos(Math.PI / 4) * 10).add(target)
    camera.lookAt(target)
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [camera, size.h])

  // 물건 위에서 누르면 방 돌리기를 "먼저" 꺼야 함. 방 돌리기(OrbitControls)가 R3F보다 먼저
  // 누르기를 받아서, 물건을 끄는 동안 방까지 같이 돌아가던 게 왔다갔다 튀던 진짜 원인
  const grabbable = useRef<Group>(null)
  useEffect(() => {
    const picker = new Raycaster()
    const capture = (e: PointerEvent) => {
      if (e.button !== 0 || e.target !== gl.domElement || !grabbable.current || !controls.current) return
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      picker.setFromCamera(ndc, camera)
      if (picker.intersectObject(grabbable.current, true).length > 0) controls.current.enabled = false
    }
    window.addEventListener('pointerdown', capture, { capture: true })
    return () => window.removeEventListener('pointerdown', capture, { capture: true })
  }, [gl, camera])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    }
    // 드래그 끝
    const up = () => {
      drag.current = null
      setDragging(false)
      if (controls.current) controls.current.enabled = true
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  // 놓기 모드: 캔버스 클릭 = 미리보기 자리에 놓기
  useEffect(() => {
    if (!placing) {
      setGhost(null)
      ghostRef.current = null
      return
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !ghostRef.current) return
      const { blocked, ...at } = ghostRef.current as Placement & { blocked?: boolean }
      if (blocked) return
      placedAt.current = performance.now()
      onPlace(at, e.shiftKey)
    }
    gl.domElement.addEventListener('pointerdown', down)
    return () => gl.domElement.removeEventListener('pointerdown', down)
  }, [placing, gl, onPlace, placedAt])

  useFrame(() => {
    if (!drag.current && !placing) return
    raycaster.setFromCamera(pointer.current, camera)

    if (placing) {
      let at = placeAt(placing.item, raycaster.ray, layout, size)
      // 다른 가구랑 겹치는 자리엔 못 놓음 (미리보기는 빨갛게)
      const blocked = !!at && isBlocked(layout, { id: '__ghost', item: placing.item, rot: 0, ...at })
      if (at) at = { ...at, blocked } as Placement & { blocked: boolean }
      const changed = JSON.stringify(at) !== JSON.stringify(ghostRef.current)
      ghostRef.current = at
      if (changed) setGhost(at)
      return
    }

    const d = drag.current!
    const latest = layoutRef.current
    const at = placeAt(d.item.item, raycaster.ray, latest, size, {
      excludeId: d.item.id,
      offset: d.offset,
      rot: d.item.rot,
    })
    if (!at) return
    // 다른 가구에 막히면 거기서 멈추고 옆으로 미끄러짐
    const { x, z } = slideTo(latest, { ...d.item, ...d.pos }, at, d.ignore)
    if (x === d.pos.x && z === d.pos.z && at.y === d.pos.y) return
    d.pos = { x, y: at.y, z }
    onMove([
      { id: d.item.id, patch: { ...at, x, z } },
      ...d.riders.map((r) => ({ id: r.id, patch: { x: Number((x + r.dx).toFixed(2)), z: Number((z + r.dz).toFixed(2)) } })),
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
    drag.current = { item, offset, riders, pos: { x: item.x, y: item.y, z: item.z }, ignore: overlappingWith(layout, item) }
    setDragging(true)
    if (controls.current) controls.current.enabled = false
    onDragStart()
  }

  const spot = findSpot(layout, previewKind)
  const lit = previewKind !== 'sleep' && previewKind !== 'away'

  return (
    <>
      {/* 빈 곳 끌기 = 옆으로 돌리기 (위아래 각도는 고정), 오른쪽 끌기 = 화면 이동 */}
      <OrbitControls
        ref={controls}
        enableZoom={false}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.6}
        minPolarAngle={POLAR}
        maxPolarAngle={POLAR}
        screenSpacePanning
      />
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

      <group ref={grabbable}>
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
        <Selectable
          outline={(ghost as Placement & { blocked?: boolean }).blocked ? '#ff4d4d' : '#8ab4ff'}
          opacity={0.55}
          onPointerDown={() => {}}
        >
          <PlacedItemMesh
            placed={{ id: '__ghost', item: placing.item, variant: placing.variant, rot: 0, x: ghost.x, y: ghost.y, z: ghost.z }}
            lit={lit}
          />
        </Selectable>
      )}

      {selectedId && !placing && !dragging && (() => {
        const item = layout.items.find((it) => it.id === selectedId)
        return item ? (
          <ActionBar item={item} onTurn={onTurn} onRemove={onRemove} />
        ) : null
      })()}

      <RoomCharacter
        config={layout.character}
        kind={previewKind}
        size={size}
        spot={spot}
        items={layout.items}
        onHumanPointerDown={(e) => {
          // 캐릭터를 잡으면 캐릭터가 쓰는 가구(의자·침대…)를 잡은 걸로
          const source = layout.items.find((it) => it.id === spot?.source)
          if (e.button !== 0 || placing || !source) return
          e.stopPropagation()
          onSelect(source.id)
          startDrag(source)
        }}
      />
      </group>
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
    // 원래 투명한 재질(달팽이 통 플라스틱 등)은 원래 값을 기억해뒀다가 곱해서 씀
    ref.current?.traverse((o) => {
      const m = (o as { material?: { transparent: boolean; opacity: number; depthWrite: boolean; userData: Record<string, unknown> } })
        .material
      if (!m) return
      const base = (m.userData.base ??= { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite }) as {
        transparent: boolean
        opacity: number
        depthWrite: boolean
      }
      m.transparent = base.transparent || opacity < 1
      m.opacity = base.opacity * opacity
      m.depthWrite = base.depthWrite && opacity >= 1
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
