import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import type { ActivityKind } from '../../data/rooms'
import { useFocused } from '../../state/focus'
import { currentActivity, isLightOn, ROOM_BY_ID, roomGeometry } from '../building/rooms'
import { RoomCharacter } from '../character/RoomCharacter'
import { environment } from '../environment'
import { findSpot, roomSize, useLayout } from './layoutData'
import { PlacedItems } from './PlacedItems'
import { RoomShell } from './RoomShell'

/**
 * 들여다보는 방. 배치 데이터(JSON)대로 아이템을 놓고, 지금 하는 일을 할 수 있는 가구 자리에 캐릭터를 둠.
 * 방 원점 = 방 가운데 창 중심 → 안쪽 그룹에서 바닥 한가운데로 옮김
 */
export function RoomView() {
  const focused = useFocused()
  const room = focused ? ROOM_BY_ID.get(focused) : undefined
  return room ? <FocusedRoom key={room.id} roomId={room.id} /> : null
}

function FocusedRoom({ roomId }: { roomId: string }) {
  const room = ROOM_BY_ID.get(roomId)!
  const [kind, setKind] = useState<ActivityKind>(() => currentActivity(room, environment.hour).kind)

  // 일과가 바뀌면(1분 단위) 다시 그림
  useFrame(() => {
    const next = currentActivity(room, environment.hour).kind
    if (next !== kind) setKind(next)
  })

  const { interiorCenter, rotationY } = roomGeometry(room)
  const size = roomSize(room)
  const layout = useLayout(room.id, size)
  const lightOn = isLightOn({ from: '', to: '', label: '', kind })
  const spot = layout ? findSpot(layout, kind) : null

  return (
    <group position={interiorCenter} rotation-y={rotationY}>
      <group position={[0, -size.h / 2, -size.d / 2 - 0.02]}>
        <RoomShell size={size} lightOn={lightOn} wall={layout?.wall ?? '#efe9df'} floor={layout?.floor ?? 'wood'} />
        {layout && <PlacedItems items={layout.items} kind={kind} lit={lightOn} />}
        {layout && <RoomCharacter config={layout.character} kind={kind} size={size} spot={spot} items={layout.items} />}
      </group>
    </group>
  )
}
