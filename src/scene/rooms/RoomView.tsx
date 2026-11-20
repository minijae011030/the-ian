import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import type { MeshBasicMaterial, PointLight } from 'three'
import type { ActivityKind } from '../../data/rooms'
import { canvasTexture, repeating } from '../../lib/canvasTexture'
import { useFocused } from '../../state/focus'
import { BUILDING, ROOM_DEPTH } from '../building/config'
import { currentActivity, isLightOn, ROOM_BY_ID, roomGeometry } from '../building/rooms'
import { Character } from '../character/Character'
import { environment } from '../environment'
import { CATALOG } from '../../items/catalog'
import { findSpot, isVisible, useLayout } from './layoutData'
import type { RoomSize } from './types'

function useFloorTexture() {
  return useMemo(
    () =>
      repeating(
        canvasTexture(128, 128, (ctx) => {
          ctx.fillStyle = '#b48a62'
          ctx.fillRect(0, 0, 128, 128)
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 ? '#a97f58' : '#bb926a'
            ctx.fillRect(0, i * 16, 128, 15)
          }
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          for (let i = 0; i < 8; i++) ctx.fillRect((i * 53) % 128, i * 16, 2, 15)
        }),
        2,
        2,
      ),
    [],
  )
}

/** 벽·바닥·천장·조명. 원점 = 바닥 한가운데 */
function RoomShell({ size: { w, d, h }, lightOn, wall }: { size: RoomSize; lightOn: boolean; wall: string }) {
  const floorTexture = useFloorTexture()
  const ceilingLight = useRef<PointLight>(null)
  const ceilingDisc = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    if (ceilingLight.current) ceilingLight.current.intensity = lightOn ? 4 : 0
    ceilingDisc.current?.color.setScalar(lightOn ? 1 : 0.35)
  })

  return (
    <>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTexture} roughness={0.8} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={h}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f6f3ee" />
      </mesh>
      <mesh position={[0, h / 2, -d / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * w) / 2, h / 2, 0]} rotation-y={(-side * Math.PI) / 2}>
          <planeGeometry args={[d, h]} />
          <meshStandardMaterial color={wall} />
        </mesh>
      ))}

      <mesh position-y={h - 0.01} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial ref={ceilingDisc} color="#fff6e0" toneMapped={false} />
      </mesh>
      <pointLight ref={ceilingLight} position={[0, h - 0.3, 0]} intensity={4} distance={6} decay={1.5} color="#ffe2b8" />
      {/* 창 쪽 은은한 빛. 불 꺼도 창밖 빛으로 자는 모습은 보이게 */}
      <pointLight position={[0, h - 0.4, d / 2 - 0.4]} intensity={lightOn ? 0.7 : 0.45} distance={4} decay={1.5} color="#dfe6ff" />
    </>
  )
}

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

  const { interiorCenter, rotationY, interiorWidth } = roomGeometry(room)
  // 위아래 슬래브 두께만큼 빼고, 바닥·천장을 슬래브 면에서 살짝 띄움 (z-fighting 방지)
  const h = BUILDING.floorHeight - 0.22 - 0.024
  const size: RoomSize = { w: interiorWidth, d: ROOM_DEPTH, h }
  const layout = useLayout(room.id, size)
  const lightOn = isLightOn({ from: '', to: '', label: '', kind })
  const spot = layout ? findSpot(layout, kind) : null

  return (
    <group position={interiorCenter} rotation-y={rotationY}>
      <group position={[0, -h / 2, -ROOM_DEPTH / 2 - 0.02]}>
        <RoomShell size={size} lightOn={lightOn} wall={layout?.wall ?? '#efe9df'} />
        {layout?.items
          .filter((placed) => isVisible(placed, kind))
          .map((placed) => {
            const def = CATALOG[placed.item]
            if (!def) return null
            return (
              <group key={placed.id} position={[placed.x, placed.y, placed.z]} rotation-y={(placed.rot * Math.PI) / 180}>
                {def.render({ variant: placed.variant ?? def.variants[0], lit: lightOn })}
              </group>
            )
          })}
        {spot && (
          <group position={spot.position} rotation-y={spot.rotationY}>
            <Character pose={spot.pose} hands={spot.hands} prop={spot.prop} seat={spot.seat} />
          </group>
        )}
      </group>
    </group>
  )
}
