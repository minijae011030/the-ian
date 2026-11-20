import type { ActivityKind } from '../../data/rooms'

/**
 * 방 안 좌표: 원점 = 바닥 한가운데, +x = 창에서 봤을 때 오른쪽, +z = 창 쪽, y = 위.
 * w(폭)·d(깊이)·h(천장 높이)는 방마다 다름
 */
export type RoomSize = { w: number; d: number; h: number }

export type Pose = 'stand' | 'sit' | 'lie'
export type Hands = 'down' | 'type' | 'write' | 'phone' | 'eat' | 'face' | 'read' | 'pet'
export type Prop = 'bowl' | 'phone' | 'book' | null

/** 캐릭터가 그 일을 할 때 서 있을 자리 */
export type Spot = {
  pose: Pose
  hands: Hands
  position: [number, number, number]
  /** 0이면 창(+z)을 바라봄 */
  rotationY: number
  /** sit일 때 엉덩이 높이 (의자 0.45, 침대 0.5) */
  seat?: number
  prop?: Prop
}

export type RoomLayout = {
  Furniture: (props: { size: RoomSize; kind: ActivityKind }) => React.ReactNode
  /** 일 종류별 자리. null이면 캐릭터 없음 (외출) */
  spots: (size: RoomSize) => Partial<Record<ActivityKind, Spot | null>>
}
