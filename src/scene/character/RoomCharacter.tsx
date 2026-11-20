import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import type { ActivityKind } from '../../data/rooms'
import { CATALOG } from '../../items/catalog'
import { type CharacterConfig, DEFAULT_CHARACTER, type PlacedItem, type RoomSize, type Spot } from '../rooms/types'
import { Character } from './Character'
import { type Obstacle, RabbitCharacter, type RabbitPlaces } from './Pets'
import { SnailCharacter, type SnailPlaces } from './Snail'

/** 아이템이 바닥에서 차지하는 사각형 */
function rectOf(it: PlacedItem): Obstacle {
  let [w, d] = CATALOG[it.item].footprint
  if ((((Math.round(it.rot / 90) % 4) + 4) % 4) % 2 === 1) [w, d] = [d, w]
  return { minX: it.x - w / 2, maxX: it.x + w / 2, minZ: it.z - d / 2, maxZ: it.z + d / 2 }
}

/** 바닥에 서 있는 가구들 (러그처럼 납작한 거랑 숨숨집은 빼고) */
function obstaclesOf(items: PlacedItem[]): Obstacle[] {
  return items.flatMap((it) => {
    const def = CATALOG[it.item]
    if (!def || def.place !== 'floor' || def.flat || it.item === 'rabbit-house') return []
    return [rectOf(it)]
  })
}

/** 풀어 키우는 토끼가 찾아가는 곳: 배변판(밥·물·볼일), 숨숨집 */
function placesOf(items: PlacedItem[]): RabbitPlaces {
  const find = (id: string) => items.find((i) => i.item === id)
  const pan = find('rabbit-toilet')
  const house = find('rabbit-house')
  return {
    pan: pan && { x: pan.x, z: pan.z, rot: pan.rot },
    house: house && { x: house.x, z: house.z, rot: house.rot, rect: rectOf(house) },
  }
}

/** 달팽이가 찾아가는 곳: 달팽이 집(잘 때), 애호박(밥) */
function snailPlacesOf(items: PlacedItem[]): SnailPlaces {
  const house = items.find((i) => i.item === 'snail-house')
  const food = items.find((i) => i.item === 'zucchini')
  return {
    house: house && { x: house.x, z: house.z, rot: house.rot },
    food: food && { x: food.x, z: food.z },
  }
}

/**
 * 방에 사는 캐릭터 고르기.
 * - 사람: 지금 하는 일을 할 수 있는 가구 자리(spot)에
 * - 토끼·달팽이: 방 안을 알아서 돌아다님 (외출이어도 집에 있음)
 */
export function RoomCharacter({
  config = DEFAULT_CHARACTER,
  kind,
  size,
  spot,
  items = [],
  onHumanPointerDown,
}: {
  config?: CharacterConfig
  kind: ActivityKind
  size: RoomSize
  spot: Spot | null
  /** 토끼가 피해 다닐 가구들 */
  items?: PlacedItem[]
  onHumanPointerDown?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const obstacles = useMemo(() => obstaclesOf(items), [items])
  const places = useMemo(() => placesOf(items), [items])
  const snailPlaces = useMemo(() => snailPlacesOf(items), [items])
  if (config.kind === 'rabbit')
    return <RabbitCharacter kind={kind} size={size} fur={config.fur} obstacles={obstacles} places={places} />
  if (config.kind === 'snail') return <SnailCharacter kind={kind} size={size} places={snailPlaces} />
  if (!spot) return null
  return (
    <group position={spot.position} rotation-y={spot.rotationY} onPointerDown={onHumanPointerDown}>
      <Character pose={spot.pose} hands={spot.hands} prop={spot.prop} seat={spot.seat} look={config} />
    </group>
  )
}
