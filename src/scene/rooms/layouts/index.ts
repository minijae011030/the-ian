import type { RoomLayout } from '../types'
import { defaultLayout } from './default'
import { jobLayout } from './job'

/** 방 id → 꾸민 레이아웃. 없으면 기본 원룸 */
const LAYOUTS: Record<string, RoomLayout> = {
  job: jobLayout,
}

export function layoutFor(roomId: string) {
  return LAYOUTS[roomId] ?? defaultLayout
}
