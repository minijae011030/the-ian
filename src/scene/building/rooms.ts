import { Vector3 } from 'three'
import { ROOMS, type Activity, type Room } from '../../data/rooms'
import { BUILDING, SLOT_BY_ID, slotNormal, slotWorldPosition, type WindowSlot } from './config'

/** 방이 차지하는 창 슬롯들 (왼쪽 칸부터) */
export function roomSlots(room: Room): WindowSlot[] {
  return Array.from({ length: room.bays }, (_, i) => {
    const id = `${room.face[0]}-${room.floor - 1}-${room.bay - 1 + i}`
    const slot = SLOT_BY_ID.get(id)
    if (!slot) throw new Error(`[rooms] ${room.name}: ${id} 칸이 건물에 없음`)
    return slot
  })
}

export const ROOM_BY_ID = new Map(ROOMS.map((r) => [r.id, r]))

/** 슬롯 id → 그 칸을 쓰는 방 */
export const ROOM_BY_SLOT = new Map<string, Room>()
for (const room of ROOMS) {
  for (const slot of roomSlots(room)) {
    const taken = ROOM_BY_SLOT.get(slot.id)
    if (taken) throw new Error(`[rooms] ${room.name}이(가) ${taken.name}이랑 칸이 겹침 (${slot.id})`)
    ROOM_BY_SLOT.set(slot.id, room)
  }
}

/** 방 가운데 창 기준 위치·방향·크기 */
export function roomGeometry(room: Room) {
  const slots = roomSlots(room)
  const first = slots[0]
  const center = new Vector3()
  slots.forEach((s) => center.add(new Vector3(...s.position)))
  center.divideScalar(slots.length)
  const bayWidth = BUILDING.width / BUILDING.frontBays
  const width = bayWidth * room.bays

  // 방 안쪽 공간은 건물 몸통(core) 안에 있어야 함.
  // 맨 끝 칸은 바깥 격자까지 포함하면 몸통보다 넓어서 옆벽이 몸통 벽 뒤로 숨어버림 → 잘라냄
  const coreHalf = (BUILDING.width - BUILDING.frameDepth * 2) / 2 - 0.01
  const left = Math.max(center.x - width / 2, -coreHalf)
  const right = Math.min(center.x + width / 2, coreHalf)
  const interiorCenter = center.clone().setX((left + right) / 2)

  return {
    slots,
    /** 건물 그룹 기준 창 중심 */
    localCenter: center,
    /** 월드 기준 방 정면 중심 (카메라가 여기를 바라봄) */
    worldCenter: slotWorldPosition({ ...first, position: interiorCenter.toArray() as [number, number, number] }),
    normal: slotNormal(first),
    rotationY: first.rotationY,
    width,
    /** 건물 그룹 기준 방 안쪽 공간 중심(창 높이·창 면 위치) — 몸통 안으로 잘린 값 */
    interiorCenter,
    interiorWidth: right - left,
  }
}

function toHour(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

function inRange(hour: number, a: Activity) {
  const from = toHour(a.from)
  const to = toHour(a.to)
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to
}

/** 지금 시각에 그 방에서 하고 있는 일 */
export function currentActivity(room: Room, hour: number): Activity {
  return room.schedule.find((a) => inRange(hour, a)) ?? { from: '', to: '', kind: 'rest', label: '쉬는 중' }
}

export function isLightOn(activity: Activity) {
  return activity.kind !== 'sleep' && activity.kind !== 'away'
}

/** 일과표 빈틈 검사. 개발 중에만 콘솔에 경고 */
if (import.meta.env.DEV) {
  for (const room of ROOMS) {
    for (let m = 0; m < 24 * 60; m += 15) {
      const hits = room.schedule.filter((a) => inRange(m / 60, a))
      if (hits.length !== 1) {
        console.warn(`[rooms] ${room.name} ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} 일과가 ${hits.length}개`)
        break
      }
    }
  }
}
