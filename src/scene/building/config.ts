import { createRandom } from '../../lib/random'

/**
 * THE IAN 건물 치수.
 * 사진처럼 하얀 격자 프레임(층 슬래브 + 기둥)이 튀어나와 있고
 * 그 안에 창이 쑥 들어가 있는 구조. 칸 하나 = 방 하나(슬롯)
 */
export const BUILDING = {
  floors: 14, // 1층 상가 + 2~14층 방
  floorHeight: 2,
  width: 12, // 정면 칸 7개
  depth: 8, // 옆면 칸 4개
  frontBays: 7,
  frameDepth: 0.55, // 격자가 유리면보다 튀어나온 깊이
  slabThickness: 0.22,
  columnWidth: 0.24,
  crownHeight: 2.6, // 옥상 위로 열린 격자 + 간판
} as const

export const BUILDING_HEIGHT = BUILDING.floors * BUILDING.floorHeight

export type Face = 'front' | 'back'

export type WindowSlot = {
  id: string // 예: "f-5-2" (정면 5층 2번째 칸)
  face: Face
  floor: number // 1층이 0
  bay: number
  position: [number, number, number]
  rotationY: number
  size: [number, number]
}

/**
 * 창(방) 슬롯 목록. 동·서 옆면은 막힌 벽이라 정면(남)·뒷면(북)에만 슬롯이 있음.
 * 나중에 방 데이터는 이 id를 보고 자리를 잡음
 */
export function createWindowSlots(): WindowSlot[] {
  const { width, depth, floorHeight, frontBays, frameDepth, floors } = BUILDING
  const coreD = depth - frameDepth * 2
  const slots: WindowSlot[] = []

  const faces: { face: Face; bays: number; span: number; rotationY: number }[] = [
    { face: 'front', bays: frontBays, span: width, rotationY: 0 },
    { face: 'back', bays: frontBays, span: width, rotationY: Math.PI },
  ]

  for (const { face, bays, span, rotationY } of faces) {
    const bayW = span / bays
    for (let floor = 0; floor < floors; floor++) {
      for (let bay = 0; bay < bays; bay++) {
        const t = -span / 2 + bayW * (bay + 0.5)
        const y = floor * floorHeight + floorHeight / 2
        const position: [number, number, number] =
          face === 'front' ? [t, y, coreD / 2 + 0.01] : [-t, y, -coreD / 2 - 0.01]
        slots.push({
          id: `${face[0]}-${floor}-${bay}`,
          face,
          floor,
          bay,
          position,
          rotationY,
          size: [bayW - 0.12, floorHeight - 0.14],
        })
      }
    }
  }
  return slots
}

/** 방 데이터 붙기 전까지 임시로 쓰는 불 켜짐 상태. 사진처럼 대부분 켜져 있게 */
export function placeholderLit(slots: WindowSlot[]) {
  const rand = createRandom(1030)
  return new Map(slots.map((s) => [s.id, s.floor === 0 || rand() < 0.72]))
}
