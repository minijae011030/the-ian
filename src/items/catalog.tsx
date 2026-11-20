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
import * as Home from './kits/home'
import * as Kit from './kits/rooms'

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
  /** 윗면이 바닥 크기 일부일 때 그 범위 (아이템 기준, 회전 0) */
  topRect?: { x: number; z: number; w: number; d: number }
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

/** 에디터에 보여줄 종류 이름과 색 견본 */
export const VARIANT_INFO: Record<string, { name: string; color?: string }> = {
  blue: { name: '파랑', color: BLANKETS.blue },
  lilac: { name: '연보라', color: BLANKETS.lilac },
  gray: { name: '회색', color: '#8c93a1' },
  red: { name: '빨강', color: BLANKETS.red },
  charcoal: { name: '검정', color: CHAIRS.charcoal },
  beige: { name: '베이지', color: RUGS.beige },
  sand: { name: '모래색', color: RUGS.sand },
  wine: { name: '와인', color: RUGS.wine },
  suits: { name: '정장' },
  casual: { name: '평상복' },
  job: { name: '취준' },
  plain: { name: '평범한' },
  blank: { name: '꺼진' },
  'cover-letter': { name: '자소서 띄운' },
  white: { name: '흰색', color: '#e8e2d6' },
  wood: { name: '나무', color: '#b98b5e' },
  slate: { name: '회색', color: '#5d6472' },
  olive: { name: '올리브', color: '#6b6b45' },
  brown: { name: '갈색', color: '#7a5a4a' },
  silver: { name: '실버', color: '#d9dbde' },
  black: { name: '검정', color: '#2a2d33' },
  linen: { name: '리넨', color: '#b9a99a' },
  orange: { name: '주황', color: '#ffb36b' },
  purple: { name: '보라', color: '#6a5acd' },
  sqld: { name: 'SQLD' },
  adsp: { name: 'ADsP' },
  jeongcheogi: { name: '정보처리기사' },
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
  /** 책상+의자 세트. 의자는 책상 앞(-z)에, 앉으면 책상(+z)을 봄 */
  'desk-set': {
    name: '책상 세트',
    category: 'furniture',
    place: 'floor',
    footprint: [1.3, 1.15],
    top: 0.74,
    // 소품 올라가는 건 책상 판 부분만 (의자 위엔 안 올라감)
    topRect: { x: 0, z: 0.3, w: 1.3, d: 0.55 },
    variants: Object.keys(CHAIRS),
    render: ({ variant }) => (
      <>
        <Desk position={[0, 0, 0.3]} width={1.3} />
        <Chair position={[0, 0, -0.28]} color={CHAIRS[variant]} />
      </>
    ),
    uses: {
      work: { pose: 'sit', hands: 'type', at: [0, 0, -0.3], facing: 0 },
      study: { pose: 'sit', hands: 'write', at: [0, 0, -0.3], facing: 0 },
      eat: { pose: 'sit', hands: 'eat', at: [0, 0, -0.3], facing: 0 },
      // 화장대가 없는 방에선 책상 앞에서 스킨케어
      skincare: { pose: 'sit', hands: 'face', at: [0, 0, -0.3], facing: 0, priority: 0 },
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
  /* ───── 공통 가구 ───── */
  wardrobe: {
    name: '옷장',
    category: 'furniture',
    place: 'floor',
    footprint: [0.9, 0.5],
    variants: ['white', 'wood'],
    render: ({ variant }) => <Home.Wardrobe color={variant === 'wood' ? '#b98b5e' : '#e8e2d6'} />,
  },
  bookshelf: {
    name: '책장',
    category: 'furniture',
    place: 'floor',
    footprint: [0.8, 0.3],
    variants: ['default'],
    render: () => <Home.Bookshelf />,
  },
  sofa: {
    name: '소파',
    category: 'furniture',
    place: 'floor',
    footprint: [1.4, 0.65],
    variants: ['slate', 'olive'],
    render: ({ variant }) => <Home.Sofa color={VARIANT_INFO[variant]?.color} />,
    uses: { rest: { pose: 'sit', hands: 'phone', prop: 'phone', seat: 0.32, at: [0.25, 0, 0.05], facing: 0, priority: 2 } },
  },
  armchair: {
    name: '1인 소파',
    category: 'furniture',
    place: 'floor',
    footprint: [0.72, 0.68],
    variants: ['brown', 'olive'],
    render: ({ variant }) => <Home.Armchair color={VARIANT_INFO[variant]?.color} />,
    uses: {
      study: { pose: 'sit', hands: 'read', prop: 'book', seat: 0.32, at: [0, 0, 0.06], facing: 0, priority: 2 },
      rest: { pose: 'sit', hands: 'phone', prop: 'phone', seat: 0.32, at: [0, 0, 0.06], facing: 0, priority: 1.5 },
    },
  },
  fridge: {
    name: '냉장고',
    category: 'furniture',
    place: 'floor',
    footprint: [0.52, 0.52],
    top: 1.25,
    variants: ['silver', 'white'],
    render: ({ variant }) => <Home.Fridge color={VARIANT_INFO[variant]?.color} />,
  },
  tv: {
    name: 'TV',
    category: 'furniture',
    place: 'floor',
    footprint: [0.9, 0.36],
    variants: ['default'],
    render: ({ lit }) => <Home.Tv lit={lit} />,
  },
  'drying-rack': {
    name: '빨래 건조대',
    category: 'furniture',
    place: 'floor',
    footprint: [1.15, 0.4],
    variants: ['default'],
    render: () => <Home.DryingRack />,
  },
  'floor-lamp': {
    name: '스탠드 조명',
    category: 'decor',
    place: 'floor',
    footprint: [0.28, 0.28],
    variants: ['default'],
    render: ({ lit }) => <Home.FloorLamp lit={lit} />,
  },
  'trash-can': {
    name: '쓰레기통',
    category: 'decor',
    place: 'floor',
    footprint: [0.24, 0.24],
    variants: ['default'],
    render: () => <Home.TrashCan />,
  },
  'mood-lamp': {
    name: '무드등',
    category: 'small',
    place: 'surface',
    footprint: [0.15, 0.15],
    variants: ['orange', 'purple'],
    render: ({ variant, lit }) => <Home.MoodLamp lit={lit} color={VARIANT_INFO[variant]?.color} />,
  },
  curtain: {
    name: '커튼',
    category: 'wall',
    place: 'wall',
    footprint: [1.1, 0.02],
    variants: ['linen', 'wine'],
    render: ({ variant }) => <Home.Curtain color={variant === 'wine' ? '#6b2f35' : '#b9a99a'} />,
  },

  /* ───── 러닝방 ───── */
  treadmill: {
    name: '러닝머신',
    category: 'furniture',
    place: 'floor',
    footprint: [0.6, 1.4],
    variants: ['default'],
    render: ({ lit }) => <Kit.Treadmill lit={lit} />,
    uses: { exercise: { pose: 'stand', hands: 'down', at: [0, 0.12, 0.15], facing: 180, priority: 3 } },
  },
  'yoga-mat': {
    name: '요가매트',
    category: 'decor',
    place: 'floor',
    footprint: [0.55, 1.3],
    flat: true,
    variants: ['purple', 'slate'],
    render: ({ variant }) => <Kit.YogaMat color={VARIANT_INFO[variant]?.color} />,
    uses: { exercise: { pose: 'stand', hands: 'down', at: [0, 0, 0], facing: 0, priority: 2 } },
  },
  'foam-roller': {
    name: '폼롤러',
    category: 'decor',
    place: 'floor',
    footprint: [0.45, 0.16],
    flat: true,
    variants: ['default'],
    render: () => <Kit.FoamRoller />,
  },

  /* ───── 토끼방 ───── */
  'rabbit-cage': {
    name: '토끼 케이지',
    category: 'furniture',
    place: 'floor',
    footprint: [1.05, 0.6],
    variants: ['default'],
    render: () => <Kit.RabbitCage />,
  },
  rabbit: {
    name: '토끼',
    category: 'decor',
    place: 'floor',
    footprint: [0.2, 0.3],
    flat: true, // 케이지 안에도 넣을 수 있게
    variants: ['white', 'brown'],
    render: ({ variant }) => <Kit.Rabbit color={variant === 'brown' ? '#9a7458' : '#f2efe9'} />,
  },
  'hay-bowl': {
    name: '건초 그릇',
    category: 'decor',
    place: 'floor',
    footprint: [0.2, 0.2],
    flat: true,
    variants: ['default'],
    render: () => <Kit.HayBowl />,
  },
  'snail-cage': {
    name: '달팽이 사육통',
    category: 'small',
    place: 'surface',
    footprint: [0.37, 0.23],
    variants: ['default'],
    render: () => <Kit.SnailCage />,
  },

  /* ───── 빵집방 ───── */
  oven: {
    name: '오븐',
    category: 'furniture',
    place: 'floor',
    footprint: [0.6, 0.55],
    top: 0.6,
    variants: ['default'],
    render: ({ lit }) => <Kit.Oven lit={lit} />,
  },
  'bread-display': {
    name: '빵 진열대',
    category: 'furniture',
    place: 'floor',
    footprint: [0.9, 0.42],
    top: 0.77,
    variants: ['default'],
    render: () => <Kit.BreadDisplay />,
  },
  apron: {
    name: '앞치마 걸이',
    category: 'wall',
    place: 'wall',
    footprint: [0.3, 0.02],
    variants: ['default'],
    render: () => <Kit.ApronHook />,
  },

  /* ───── 개발방 ───── */
  'dev-desk-set': {
    name: '듀얼모니터 책상',
    category: 'furniture',
    place: 'floor',
    footprint: [1.4, 1.15],
    top: 0.74,
    topRect: { x: 0, z: 0.3, w: 1.4, d: 0.55 },
    variants: ['default'],
    render: ({ lit }) => <Kit.DevDeskSet lit={lit} />,
    uses: {
      work: { pose: 'sit', hands: 'type', at: [0, 0, -0.3], facing: 0 },
      study: { pose: 'sit', hands: 'write', at: [0, 0, -0.3], facing: 0 },
      eat: { pose: 'sit', hands: 'eat', at: [0, 0, -0.3], facing: 0 },
      skincare: { pose: 'sit', hands: 'face', at: [0, 0, -0.3], facing: 0, priority: 0 },
    },
  },
  keyboard: {
    name: '키보드',
    category: 'small',
    place: 'surface',
    footprint: [0.42, 0.13],
    variants: ['black', 'white'],
    render: ({ variant }) => <Kit.Keyboard color={variant === 'white' ? '#e9e7e2' : '#2a2d33'} />,
  },

  /* ───── 자격증방 ───── */
  certificate: {
    name: '자격증 액자',
    category: 'wall',
    place: 'wall',
    footprint: [0.32, 0.02],
    variants: ['jeongcheogi', 'sqld', 'adsp'],
    render: ({ variant }) => <Kit.CertificateFrame kind={variant} />,
  },
  'sealed-book': {
    name: '안 뜯은 정보보안기사 책',
    category: 'small',
    place: 'surface',
    footprint: [0.2, 0.27],
    variants: ['default'],
    render: () => <Kit.SealedBook />,
  },

  /* ───── 영어방 ───── */
  'toeic-books': {
    name: '토익·토스 문제집',
    category: 'small',
    place: 'surface',
    footprint: [0.22, 0.3],
    variants: ['default'],
    render: () => <Kit.ToeicBooks />,
  },
  headset: {
    name: '스피킹 헤드셋',
    category: 'small',
    place: 'surface',
    footprint: [0.2, 0.15],
    variants: ['black'],
    render: () => <Kit.Headset />,
  },
  'english-board': {
    name: '영어 단어 보드',
    category: 'wall',
    place: 'wall',
    footprint: [0.8, 0.02],
    variants: ['default'],
    render: () => <Kit.EnglishBoard />,
  },
}
