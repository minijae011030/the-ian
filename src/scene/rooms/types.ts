import type { ActivityKind } from '../../data/rooms'

/**
 * 방 안 좌표: 원점 = 바닥 한가운데, +x = 창에서 봤을 때 오른쪽, +z = 창 쪽, y = 위.
 * w(폭)·d(깊이)·h(천장 높이)는 방마다 다름
 */
export type RoomSize = { w: number; d: number; h: number }

export type Pose = 'stand' | 'sit' | 'lie'
export type Hands = 'down' | 'type' | 'write' | 'phone' | 'eat' | 'face' | 'read' | 'pet'
export type Prop = 'phone' | 'book' | null

/** 캐릭터가 그 일을 할 때 있을 자리 (방 좌표) */
export type Spot = {
  pose: Pose
  hands: Hands
  position: [number, number, number]
  /** 0이면 창(+z)을 바라봄 */
  rotationY: number
  /** sit일 때 엉덩이 높이 (의자 0.45, 침대 0.5) */
  seat?: number
  prop?: Prop
  /** 이 자리를 준 가구 (에디터에서 캐릭터를 잡으면 이 가구를 옮김) */
  source?: string
}

/**
 * 방 배치 데이터 = public/data/layouts/<방id>.json
 * 에디터가 이 파일을 GitHub에 커밋하고, 뷰어는 fetch해서 그림
 */
export type LayoutData = {
  version: 1
  /** 벽 색 */
  wall: string
  /** 바닥 종류 (items/surfaces.ts) */
  floor: string
  items: PlacedItem[]
}

export type PlacedItem = {
  /** 배치 안에서 고유한 이름 (에디터에서 고를 때 씀) */
  id: string
  /** 카탈로그 아이템 id (items/catalog.tsx) */
  item: string
  x: number
  y: number
  z: number
  /** 도 단위, 90 단위 권장 */
  rot: number
  variant?: string
  /** 이 일을 할 때만 보임 (예: 밥그릇은 eat일 때만) */
  when?: ActivityKind[]
}
