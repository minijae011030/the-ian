import { useEffect, useState } from 'react'
import { MathUtils, Vector3 } from 'three'
import type { ActivityKind, Room } from '../../data/rooms'
import { CATALOG } from '../../items/catalog'
import { BUILDING, ROOM_DEPTH } from '../building/config'
import { roomGeometry } from '../building/rooms'
import type { LayoutData, PlacedItem, RoomSize, Spot } from './types'

/**
 * 방 배치 데이터 불러오기.
 * public/data/layouts/<방id>.json 이 있으면 그걸 쓰고, 없으면 기본 원룸을 만들어서 씀.
 * 방 하나 들어갈 때 그 방 파일만 받음 (한 번 받은 건 기억)
 */
const cache = new Map<string, LayoutData | null>()

export async function fetchLayout(roomId: string): Promise<LayoutData | null> {
  if (cache.has(roomId)) return cache.get(roomId)!
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/layouts/${roomId}.json`, { cache: 'no-cache' })
    const data = res.ok ? ((await res.json()) as LayoutData) : null
    cache.set(roomId, data)
    return data
  } catch {
    cache.set(roomId, null)
    return null
  }
}

/** 방 안쪽 크기. 위아래 슬래브 두께만큼 빼고, 바닥·천장을 슬래브 면에서 살짝 띄움 (z-fighting 방지) */
export function roomSize(room: Room): RoomSize {
  return {
    w: roomGeometry(room).interiorWidth,
    d: ROOM_DEPTH,
    h: BUILDING.floorHeight - 0.22 - 0.024,
  }
}

export function useLayout(roomId: string, size: RoomSize) {
  const [loaded, setLoaded] = useState<{ id: string; data: LayoutData | null } | null>(null)

  useEffect(() => {
    let alive = true
    fetchLayout(roomId).then((data) => alive && setLoaded({ id: roomId, data }))
    return () => {
      alive = false
    }
  }, [roomId])

  if (!loaded || loaded.id !== roomId) return null
  return loaded.data ?? defaultLayout(size)
}

/**
 * 아직 안 꾸민 방의 기본 원룸.
 * 창(카메라)에서 봤을 때 캐릭터 옆모습이 보이게: 침대 왼쪽 안, 책상 오른쪽 벽, 화장대 왼쪽 창가
 */
export function defaultLayout({ w, d }: RoomSize): LayoutData {
  const wide = w > 2
  const deskZ = wide ? 0.15 : d / 2 - 0.7
  const deskX = w / 2 - 0.3
  const items: PlacedItem[] = [
    { id: 'bed', item: 'bed', x: -w / 2 + 0.55, y: 0, z: -d / 2 + 1.05, rot: 0 },
    // 세트 중심 = 책상 판보다 0.3 의자 쪽 (rot 90이면 아이템의 +z가 방의 +x)
    { id: 'desk-set', item: 'desk-set', x: deskX - 0.3, y: 0, z: deskZ, rot: 90 },
    { id: 'laptop', item: 'laptop', x: deskX - 0.02, y: 0.74, z: deskZ + 0.05, rot: 90 },
    { id: 'lamp', item: 'desk-lamp', x: deskX + 0.12, y: 0.74, z: deskZ - 0.4, rot: 0 },
    { id: 'rug', item: 'rug', x: 0, y: 0, z: 0.3, rot: 0 },
  ]
  if (wide) items.push({ id: 'vanity', item: 'vanity', x: -w / 2 + 0.2, y: 0, z: d / 2 - 0.55, rot: 90 })
  return { version: 1, wall: '#efe9df', floor: 'wood', items }
}

export function isVisible(item: PlacedItem, kind: ActivityKind) {
  return !item.when || item.when.includes(kind)
}

/**
 * 지금 하는 일을 할 자리 찾기: 그 일을 "할 수 있는" 가구 중 우선순위 높은 것.
 * 예) sleep → 침대, work → 의자, skincare → 화장대 (없으면 의자)
 * 침대를 옮기면 자는 자리도 따라 옮겨짐
 */
export function findSpot(layout: LayoutData, kind: ActivityKind): Spot | null {
  if (kind === 'away') return null
  let best: { placed: PlacedItem; use: NonNullable<(typeof CATALOG)[string]['uses']>[ActivityKind] } | null = null
  for (const placed of layout.items) {
    const use = CATALOG[placed.item]?.uses?.[kind]
    if (!use || !isVisible(placed, kind)) continue
    if (!best || (use.priority ?? 1) > (best.use!.priority ?? 1)) best = { placed, use }
  }
  if (!best || !best.use) return null

  const { placed, use } = best
  const rot = MathUtils.degToRad(placed.rot)
  const offset = new Vector3(...use.at).applyAxisAngle(new Vector3(0, 1, 0), rot)
  return {
    pose: use.pose,
    hands: use.hands,
    prop: use.prop,
    seat: use.seat,
    position: [placed.x + offset.x, placed.y + offset.y, placed.z + offset.z],
    source: placed.id,
    rotationY: rot + MathUtils.degToRad(use.facing),
  }
}
