import type { ActivityKind } from '../data/rooms'
import type { Spot } from '../scene/rooms/types'
import { drawCalendar, drawCoverLetter, drawPostIts } from './drawings'
import {
  Bed,
  BookStack,
  Bowl,
  Chair,
  ClothesRack,
  Desk,
  DeskLamp,
  Laptop,
  Plant,
  Rug,
  Vanity,
  WallPicture,
} from './parts'

/** 아이템이 캐릭터에게 주는 자리. at·facing은 아이템 기준 (facing은 도) */
export type ItemUse = Omit<Spot, 'position' | 'rotationY'> & {
  at: [number, number, number]
  facing: number
  /** 같은 일을 할 수 있는 아이템이 여러 개면 높은 쪽으로 감 (기본 1) */
  priority?: number
}

export type ItemDef = {
  name: string
  category: 'furniture' | 'decor' | 'wall' | 'small'
  /** 바닥 / 벽 / 다른 가구 위 — 에디터가 어디에 붙일지 정할 때 씀 */
  place: 'floor' | 'wall' | 'surface'
  /** 바닥에서 차지하는 크기 [폭, 깊이] (회전 0 기준) */
  footprint: [number, number]
  /** 위에 소품을 올릴 수 있으면 그 윗면 높이 (책상 0.74 등) */
  top?: number
  /** 바닥에 깔리는 납작한 것 (러그). 다른 가구랑 겹쳐도 괜찮음 */
  flat?: boolean
  /** 첫 번째가 기본값 */
  variants: string[]
  render: (p: { variant: string; lit: boolean }) => React.ReactNode
  uses?: Partial<Record<ActivityKind, ItemUse>>
}

const BLANKETS: Record<string, string> = { blue: '#9fb4d6', lilac: '#d7c4e8', gray: '#9a9ca3', red: '#8e3b3b' }
const CHAIRS: Record<string, string> = { gray: '#8c93a1', charcoal: '#3f4655' }
const RUGS: Record<string, string> = { beige: '#c9b7a2', sand: '#d9cbb8', wine: '#6b2f35' }
const BOOKS: Record<string, string[]> = {
  job: ['#2c5e9e', '#e0a43a', '#2c5e9e', '#7f8c8d', '#c0392b'],
  plain: ['#8a8f99', '#c7b9a3', '#6d7a8a'],
}
const CLOTHES: Record<string, string[]> = {
  suits: ['#1f2633', '#1f2633', '#f5f5f5', '#8b9bb4'],
  casual: ['#c9b7a2', '#3b4458', '#e9e4da', '#7a1f24'],
}
const SCREENS: Record<string, ((ctx: CanvasRenderingContext2D) => void) | undefined> = {
  blank: undefined,
  'cover-letter': drawCoverLetter,
}

export const CATALOG: Record<string, ItemDef> = {
  bed: {
    name: '싱글 침대',
    category: 'furniture',
    place: 'floor',
    footprint: [0.95, 2.05],
    top: 0.55,
    variants: Object.keys(BLANKETS),
    render: ({ variant }) => <Bed blanket={BLANKETS[variant]} />,
    uses: {
      sleep: { pose: 'lie', hands: 'down', at: [0, 0.5, 0.95], facing: 0 },
      rest: { pose: 'sit', hands: 'phone', prop: 'phone', seat: 0.5, at: [0.3, 0, 0.5], facing: 90 },
    },
  },
  desk: {
    name: '책상',
    category: 'furniture',
    place: 'floor',
    footprint: [1.2, 0.55],
    top: 0.74,
    variants: ['short', 'long'],
    render: ({ variant }) => <Desk width={variant === 'long' ? 1.3 : 1.1} />,
  },
  chair: {
    name: '의자',
    category: 'furniture',
    place: 'floor',
    footprint: [0.45, 0.45],
    variants: Object.keys(CHAIRS),
    render: ({ variant }) => <Chair color={CHAIRS[variant]} />,
    uses: {
      work: { pose: 'sit', hands: 'type', at: [0, 0, -0.02], facing: 0 },
      study: { pose: 'sit', hands: 'write', at: [0, 0, -0.02], facing: 0 },
      eat: { pose: 'sit', hands: 'eat', at: [0, 0, -0.02], facing: 0 },
      // 화장대가 없는 방에선 책상 앞에서 스킨케어
      skincare: { pose: 'sit', hands: 'face', at: [0, 0, -0.02], facing: 0, priority: 0 },
    },
  },
  vanity: {
    name: '화장대',
    category: 'furniture',
    place: 'floor',
    footprint: [0.7, 0.36],
    top: 0.64,
    variants: ['white'],
    render: () => <Vanity />,
    uses: { skincare: { pose: 'stand', hands: 'face', at: [0, 0, 0.52], facing: 180 } },
  },
  'clothes-rack': {
    name: '행거',
    category: 'furniture',
    place: 'floor',
    footprint: [0.85, 0.4],
    variants: Object.keys(CLOTHES),
    render: ({ variant }) => <ClothesRack clothes={CLOTHES[variant]} />,
  },
  rug: {
    name: '러그',
    category: 'decor',
    place: 'floor',
    footprint: [1.1, 1.0],
    flat: true,
    variants: Object.keys(RUGS),
    render: ({ variant }) => <Rug size={[1.1, 1.0]} color={RUGS[variant]} />,
    uses: { exercise: { pose: 'stand', hands: 'down', at: [0, 0, 0], facing: 0 } },
  },
  plant: {
    name: '화분',
    category: 'decor',
    place: 'floor',
    footprint: [0.25, 0.25],
    variants: ['green'],
    render: () => <Plant />,
  },
  laptop: {
    name: '노트북',
    category: 'small',
    place: 'surface',
    footprint: [0.42, 0.3],
    variants: Object.keys(SCREENS),
    render: ({ variant, lit }) => <Laptop draw={SCREENS[variant]} on={lit} />,
  },
  'desk-lamp': {
    name: '스탠드',
    category: 'small',
    place: 'surface',
    footprint: [0.15, 0.15],
    variants: ['default'],
    render: ({ lit }) => <DeskLamp on={lit} />,
  },
  books: {
    name: '책 더미',
    category: 'small',
    place: 'surface',
    footprint: [0.25, 0.18],
    variants: Object.keys(BOOKS),
    render: ({ variant }) => <BookStack colors={BOOKS[variant]} />,
  },
  bowl: {
    name: '밥그릇',
    category: 'small',
    place: 'surface',
    footprint: [0.16, 0.16],
    variants: ['rice'],
    render: () => <Bowl />,
  },
  calendar: {
    name: '달력',
    category: 'wall',
    place: 'wall',
    footprint: [0.42, 0.02],
    variants: ['november'],
    render: () => <WallPicture size={[0.42, 0.5]} draw={drawCalendar} />,
  },
  'postit-board': {
    name: '포스트잇 보드',
    category: 'wall',
    place: 'wall',
    footprint: [0.75, 0.02],
    variants: ['job'],
    render: () => <WallPicture size={[0.75, 0.4]} draw={drawPostIts} />,
  },
}
