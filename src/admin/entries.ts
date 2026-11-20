import { CATALOG, type ItemDef, VARIANT_INFO } from '../items/catalog'
import { FLOORS } from '../items/floors'
import { HAIR_COLORS, OUTFITS } from '../scene/character/Character'
import type { CharacterConfig } from '../scene/rooms/types'

/**
 * 아이템 상자에 보이는 칸들. 색·종류가 다른 건 각각 별개 아이템 (파니룸처럼 고르기만 하면 끝)
 * - 물건: 카탈로그 아이템 × variant
 * - 배경: 벽지 색 · 바닥
 */
export type Tab = 'all' | 'furniture' | 'small' | 'wall' | 'background' | 'character'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'furniture', label: '가구' },
  { id: 'small', label: '소품' },
  { id: 'wall', label: '벽걸이' },
  { id: 'background', label: '배경' },
  { id: 'character', label: '캐릭터' },
]

export type ObjectEntry = { kind: 'object'; key: string; item: string; variant: string; name: string; tab: Tab }
export type BackgroundEntry =
  | { kind: 'wall'; key: string; color: string; name: string; tab: 'background' }
  | { kind: 'floor'; key: string; floor: string; name: string; tab: 'background' }
/** 캐릭터 칸: 누르면 그 방 캐릭터에 patch를 덮어씀 (옷·소품은 사람으로 바꾸면서) */
export type CharacterEntry = { kind: 'character'; key: string; name: string; patch: Partial<CharacterConfig>; tab: 'character' }
export type Entry = ObjectEntry | BackgroundEntry | CharacterEntry

const CHARACTER_ENTRIES: CharacterEntry[] = (
  [
  { patch: { kind: 'human' }, name: '나' },
  { patch: { kind: 'rabbit', fur: 'white' }, name: '흰 토끼' },
  { patch: { kind: 'rabbit', fur: 'brown' }, name: '갈색 토끼' },
  { patch: { kind: 'snail' }, name: '명주달팽이' },
  ...Object.entries(OUTFITS).map(([outfit, o]) => ({ patch: { kind: 'human' as const, outfit }, name: o.name })),
  ...Object.entries(HAIR_COLORS).map(([hairColor, h]) => ({ patch: { kind: 'human' as const, hairColor }, name: h.name })),
  { patch: { kind: 'human', accessory: 'none' }, name: '소품 없음' },
  { patch: { kind: 'human', accessory: 'glasses' }, name: '안경' },
  { patch: { kind: 'human', accessory: 'headset' }, name: '헤드셋' },
  { patch: { kind: 'human', accessory: 'apron' }, name: '앞치마' },
  ] as { patch: Partial<CharacterConfig>; name: string }[]
).map((e): CharacterEntry => ({ ...e, kind: 'character', key: `char:${JSON.stringify(e.patch)}`, tab: 'character' }))

const TAB_OF: Record<ItemDef['category'], Tab> = {
  furniture: 'furniture',
  decor: 'furniture',
  small: 'small',
  wall: 'wall',
}

export const WALLS: { color: string; name: string }[] = [
  { color: '#efe9df', name: '크림 벽지' },
  { color: '#c9c7c1', name: '회색 벽지' },
  { color: '#9fa88f', name: '바랜 초록 벽지' },
  { color: '#c9b98a', name: '누런 벽지' },
  { color: '#7d7f82', name: '시멘트 벽' },
  { color: '#5a2a2e', name: '검붉은 벽지' },
]

export const ENTRIES: Entry[] = [
  ...Object.entries(CATALOG).flatMap(([item, def]) =>
    def.variants.map(
      (variant): ObjectEntry => ({
        kind: 'object',
        key: `${item}:${variant}`,
        item,
        variant,
        name: def.variants.length > 1 ? `${VARIANT_INFO[variant]?.name ?? variant} ${def.name}` : def.name,
        tab: TAB_OF[def.category],
      }),
    ),
  ),
  ...WALLS.map((w): BackgroundEntry => ({ kind: 'wall', key: `wall:${w.color}`, color: w.color, name: w.name, tab: 'background' })),
  ...Object.entries(FLOORS).map(
    ([floor, f]): BackgroundEntry => ({ kind: 'floor', key: `floor:${floor}`, floor, name: `${f.name} 바닥`, tab: 'background' }),
  ),
  ...CHARACTER_ENTRIES,
]

export const OBJECT_ENTRY = new Map(
  ENTRIES.filter((e): e is ObjectEntry => e.kind === 'object').map((e) => [e.key, e]),
)
