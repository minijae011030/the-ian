import { Plane, type Ray, Vector3 } from 'three'
import { CATALOG } from '../items/catalog'
import type { LayoutData, PlacedItem, RoomSize } from '../scene/rooms/types'

/**
 * 에디터에서 "마우스가 가리키는 곳에 아이템을 어떻게 놓을지" 계산.
 * - floor: 바닥 위
 * - surface: 밑에 책상·침대 같은 게 있으면 그 윗면, 없으면 바닥
 * - wall: 마우스가 닿은 벽(뒷벽·왼벽·오른벽)에 붙이고 그 벽을 바라보게 회전
 */
export const SNAP = 0.05
// toFixed: 0.05 단위로 맞추다 생기는 -0.30000004 같은 부동소수 찌꺼기 제거
export const snap = (v: number) => Number((Math.round(v / SNAP) * SNAP).toFixed(2))
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export type Placement = Pick<PlacedItem, 'x' | 'y' | 'z'> & { rot?: number }

/** 아이템 기준 사각형(cx, cz, w, d)을 회전 반영해서 방 좌표 사각형으로 */
function rectBox(placed: PlacedItem, rect: { x: number; z: number; w: number; d: number }) {
  const r = ((Math.round(placed.rot / 90) % 4) + 4) % 4
  const t = (r * Math.PI) / 2
  // three.js y축 회전: x' = x·cos + z·sin, z' = −x·sin + z·cos
  const cx = placed.x + rect.x * Math.cos(t) + rect.z * Math.sin(t)
  const cz = placed.z - rect.x * Math.sin(t) + rect.z * Math.cos(t)
  const [w, d] = r % 2 === 1 ? [rect.d, rect.w] : [rect.w, rect.d]
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }
}

/** 회전 반영한 바닥 사각형 */
export function footprintBox(placed: PlacedItem) {
  const [w, d] = CATALOG[placed.item]?.footprint ?? [0.3, 0.3]
  return rectBox(placed, { x: 0, z: 0, w, d })
}

/** 소품을 올릴 수 있는 윗면 사각형 */
function topBox(placed: PlacedItem) {
  const def = CATALOG[placed.item]
  return def?.topRect ? rectBox(placed, def.topRect) : footprintBox(placed)
}

function hitPlane(ray: Ray, plane: Plane) {
  const p = new Vector3()
  return ray.intersectPlane(plane, p) ? p : null
}

/** 마우스 광선이 처음 닿는 가구 윗면 */
function surfaceHit(ray: Ray, layout: LayoutData, excludeId?: string) {
  let best: { point: Vector3; dist: number } | null = null
  for (const placed of layout.items) {
    const top = CATALOG[placed.item]?.top
    if (top === undefined || placed.id === excludeId) continue
    const point = hitPlane(ray, new Plane(new Vector3(0, 1, 0), -(placed.y + top)))
    if (!point) continue
    const box = topBox(placed)
    if (point.x < box.minX || point.x > box.maxX || point.z < box.minZ || point.z > box.maxZ) continue
    const dist = point.distanceTo(ray.origin)
    if (!best || dist < best.dist) best = { point, dist }
  }
  return best?.point ?? null
}

/** 카메라 쪽을 보고 있는 벽 중 마우스가 닿은 곳 */
function wallHit(ray: Ray, size: RoomSize) {
  const walls = [
    { normal: new Vector3(0, 0, 1), constant: size.d / 2, rot: 0 }, // 뒷벽 (z = -d/2)
    { normal: new Vector3(1, 0, 0), constant: size.w / 2, rot: 90 }, // 왼벽 (x = -w/2)
    { normal: new Vector3(-1, 0, 0), constant: size.w / 2, rot: 270 }, // 오른벽 (x = +w/2)
  ]
  let best: { point: Vector3; rot: number; dist: number } | null = null
  for (const wall of walls) {
    if (wall.normal.dot(ray.direction) >= 0) continue // 등 돌린 벽 (카메라 쪽 벽)
    const point = hitPlane(ray, new Plane(wall.normal, wall.constant))
    if (!point) continue
    if (Math.abs(point.x) > size.w / 2 + 0.001 || Math.abs(point.z) > size.d / 2 + 0.001) continue
    if (point.y < 0 || point.y > size.h) continue
    const dist = point.distanceTo(ray.origin)
    if (!best || dist < best.dist) best = { point, rot: wall.rot, dist }
  }
  if (!best) return null
  // 벽에서 1cm 띄움
  return { point: best.point.clone().add(walls.find((w) => w.rot === best.rot)!.normal.clone().multiplyScalar(0.01)), rot: best.rot }
}

export function placeAt(
  itemId: string,
  ray: Ray,
  layout: LayoutData,
  size: RoomSize,
  options: { excludeId?: string; offset?: Vector3; rot?: number } = {},
): Placement | null {
  const def = CATALOG[itemId]
  if (!def) return null

  // 중심이 아니라 물건 전체가 벽 안에 들어오게: 반쪽 크기만큼 안쪽으로 막음
  const [fw, fd] = def.footprint
  const quarter = ((Math.round((options.rot ?? 0) / 90) % 4) + 4) % 4
  const [halfX, halfZ] = quarter % 2 === 1 ? [fd / 2, fw / 2] : [fw / 2, fd / 2]
  const keepIn = (v: number, half: number, room: number) => {
    const limit = Math.max(0, room / 2 - half)
    // 스냅하면 0.05 단위로 벽을 살짝 넘을 수 있어서, 막는 건 스냅 뒤에
    return Number(clamp(snap(v), -limit, limit).toFixed(2))
  }
  const inX = (v: number, half = halfX) => keepIn(v, half, size.w)
  const inZ = (v: number, half = halfZ) => keepIn(v, half, size.d)

  if (def.place === 'wall') {
    const hit = wallHit(ray, size)
    if (!hit) return null
    const y = clamp(snap(hit.point.y), 0.1, size.h - 0.1)
    // 벽에 붙는 축은 스냅하지 않고 벽 위치 그대로
    // 벽 물건은 폭(fw)이 벽을 따라 놓임
    return hit.rot === 0
      ? { x: inX(hit.point.x, fw / 2), y, z: hit.point.z, rot: 0 }
      : { x: hit.point.x, y, z: inZ(hit.point.z, fw / 2), rot: hit.rot }
  }

  if (def.place === 'surface') {
    const top = surfaceHit(ray, layout, options.excludeId)
    if (top) return { x: inX(top.x), y: Number(top.y.toFixed(2)), z: inZ(top.z) }
  }

  const floor = hitPlane(ray, new Plane(new Vector3(0, 1, 0), 0))
  if (!floor) return null
  if (options.offset) floor.sub(options.offset)
  return { x: inX(floor.x), y: 0, z: inZ(floor.z) }
}

/** 서로 겹친 바닥 가구들 (러그 같은 납작한 건 빼고) */
export function findOverlaps(layout: LayoutData) {
  const solid = layout.items.filter((it) => {
    const def = CATALOG[it.item]
    return def?.place === 'floor' && !def.flat
  })
  const overlapped = new Set<string>()
  const EPS = 0.02
  for (let i = 0; i < solid.length; i++) {
    const a = footprintBox(solid[i])
    for (let j = i + 1; j < solid.length; j++) {
      const b = footprintBox(solid[j])
      const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
      const oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ)
      if (ox > EPS && oz > EPS) {
        overlapped.add(solid[i].id)
        overlapped.add(solid[j].id)
      }
    }
  }
  return overlapped
}

/** 가구 위에 얹힌 소품들 (책상 위 노트북·스탠드 등). 가구를 옮기거나 돌리면 같이 따라감 */
export function ridersOf(layout: LayoutData, base: PlacedItem) {
  const top = CATALOG[base.item]?.top
  if (top === undefined) return []
  const box = topBox(base)
  return layout.items.filter((it) => {
    if (it.id === base.id || CATALOG[it.item]?.place !== 'surface') return false
    if (Math.abs(it.y - (base.y + top)) > 0.03) return false
    return it.x >= box.minX && it.x <= box.maxX && it.z >= box.minZ && it.z <= box.maxZ
  })
}

/** 바닥 가구 중심을 방 안으로 밀어넣은 위치 (돌렸더니 벽을 뚫을 때) */
export function keepInside(placed: PlacedItem, size: RoomSize) {
  const def = CATALOG[placed.item]
  if (!def || def.place !== 'floor') return { x: placed.x, z: placed.z }
  const box = footprintBox(placed)
  const halfX = (box.maxX - box.minX) / 2
  const halfZ = (box.maxZ - box.minZ) / 2
  const fit = (v: number, half: number, room: number) => {
    const limit = Math.max(0, room / 2 - half)
    return Number(clamp(v, -limit, limit).toFixed(2))
  }
  return { x: fit(placed.x, halfX, size.w), z: fit(placed.z, halfZ, size.d) }
}

const isSolid = (placed: PlacedItem) => {
  const def = CATALOG[placed.item]
  return def?.place === 'floor' && !def.flat
}

/** 이 자리에 두면 다른 바닥 가구랑 겹치는지 (러그 같은 납작한 건 상관없음) */
export function isBlocked(layout: LayoutData, moving: PlacedItem, ignore: Set<string> = new Set()) {
  if (!isSolid(moving)) return false
  const a = footprintBox(moving)
  const EPS = 0.02
  return layout.items.some((other) => {
    if (other.id === moving.id || ignore.has(other.id) || !isSolid(other)) return false
    const b = footprintBox(other)
    const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
    const oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ)
    return ox > EPS && oz > EPS
  })
}

/**
 * 지금 자리에서 목표 자리까지 조금씩 옮기면서, 다른 가구에 막히면 거기서 멈춤.
 * x·z를 따로 시도해서 막힌 쪽만 멈추고 나머지 방향으론 벽 타듯 미끄러짐.
 * 한 번에 건너뛰지 않으니까 가구를 뚫고 반대편으로 순간이동하지 않음
 */
export function slideTo(
  layout: LayoutData,
  current: PlacedItem,
  target: { x: number; z: number },
  ignore: Set<string> = new Set(),
) {
  let { x, z } = current
  const steps = Math.ceil(Math.max(Math.abs(target.x - x), Math.abs(target.z - z)) / SNAP)
  if (steps === 0) return target
  const sx = (target.x - x) / steps
  const sz = (target.z - z) / steps
  for (let i = 0; i < steps; i++) {
    const nx = x + sx
    if (!isBlocked(layout, { ...current, x: nx, z }, ignore)) x = nx
    const nz = z + sz
    if (!isBlocked(layout, { ...current, x, z: nz }, ignore)) z = nz
  }
  return { x: Number(snap(x).toFixed(2)), z: Number(snap(z).toFixed(2)) }
}

/** 이 가구랑 이미 겹쳐 있는 가구들 (끌기 시작할 때 이미 겹친 건 막지 않아야 빼낼 수 있음) */
export function overlappingWith(layout: LayoutData, item: PlacedItem) {
  return new Set(
    layout.items.filter((other) => other.id !== item.id && isBlocked({ ...layout, items: [other] }, item)).map((o) => o.id),
  )
}
