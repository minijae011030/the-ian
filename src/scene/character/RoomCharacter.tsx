import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import type { ActivityKind } from '../../data/rooms'
import { CATALOG } from '../../items/catalog'
import { type CharacterConfig, DEFAULT_CHARACTER, type PlacedItem, type RoomSize, type Spot } from '../rooms/types'
import { Character } from './Character'
import { type Obstacle, RabbitCharacter, SnailCharacter } from './Pets'

/** 바닥에 서 있는 가구들의 사각형 (러그처럼 납작한 건 빼고) */
function obstaclesOf(items: PlacedItem[]): Obstacle[] {
  return items.flatMap((it) => {
    const def = CATALOG[it.item]
    if (!def || def.place !== 'floor' || def.flat) return []
    let [w, d] = def.footprint
    if ((((Math.round(it.rot / 90) % 4) + 4) % 4) % 2 === 1) [w, d] = [d, w]
    return [{ minX: it.x - w / 2, maxX: it.x + w / 2, minZ: it.z - d / 2, maxZ: it.z + d / 2 }]
  })
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
  if (config.kind === 'rabbit') return <RabbitCharacter kind={kind} size={size} fur={config.fur} obstacles={obstacles} />
  if (config.kind === 'snail') return <SnailCharacter kind={kind} size={size} />
  if (!spot) return null
  return (
    <group position={spot.position} rotation-y={spot.rotationY} onPointerDown={onHumanPointerDown}>
      <Character pose={spot.pose} hands={spot.hands} prop={spot.prop} seat={spot.seat} look={config} />
    </group>
  )
}
