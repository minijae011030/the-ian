import { useMemo } from 'react'
import { canvasTexture, repeating } from '../../lib/canvasTexture'
import { useFocused } from '../../state/focus'
import { BUILDING, ROOM_DEPTH, SLOT_BY_ID } from './config'

const WALL = '#efe9df'
const WOOD = '#b98b5e'

/**
 * 들여다보는 방의 내부. 지금은 방 데이터가 없어서 기본 원룸 가구만 있음.
 * 방 원점 = 창 중심, 로컬 -z 방향이 방 안쪽
 */
export function RoomInterior() {
  const focused = useFocused()
  const slot = focused ? SLOT_BY_ID.get(focused) : undefined

  const floorTexture = useMemo(
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
          for (let i = 0; i < 8; i++) ctx.fillRect(((i * 53) % 128), i * 16, 2, 15)
        }),
        2,
        2,
      ),
    [],
  )

  if (!slot) return null

  const w = slot.size[0] + 0.1 // 방 폭 = 칸 폭
  const h = BUILDING.floorHeight - 0.22 // 위아래 슬래브 두께만큼 뺌
  const d = ROOM_DEPTH
  // 바닥·천장을 슬래브 면에서 살짝 띄움. 딱 붙이면 면이 겹쳐 지글거림(z-fighting)
  const floorY = -h / 2 + 0.012
  const ceilingY = h / 2 - 0.012

  return (
    <group position={slot.position} rotation-y={slot.rotationY}>
      <group position-z={-d / 2 - 0.02}>
        {/* 바닥 */}
        <mesh rotation-x={-Math.PI / 2} position-y={floorY}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={floorTexture} roughness={0.8} />
        </mesh>
        {/* 천장 */}
        <mesh rotation-x={Math.PI / 2} position-y={ceilingY}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#f6f3ee" />
        </mesh>
        {/* 안쪽 벽 */}
        <mesh position-z={-d / 2}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={WALL} />
        </mesh>
        {/* 양옆 벽 */}
        {[-1, 1].map((side) => (
          <mesh key={side} position-x={(side * w) / 2} rotation-y={(-side * Math.PI) / 2}>
            <planeGeometry args={[d, h]} />
            <meshStandardMaterial color={WALL} />
          </mesh>
        ))}

        {/* 천장 조명 */}
        <mesh position-y={ceilingY - 0.01} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.22, 24]} />
          <meshBasicMaterial color="#fff6e0" toneMapped={false} />
        </mesh>
        <pointLight position={[0, h / 2 - 0.3, 0]} intensity={4} distance={6} decay={1.5} color="#ffe2b8" />
        {/* 창 쪽에서 은은하게 채우는 빛. 가구 앞면이 시커멓게 안 보이게 */}
        <pointLight position={[0, h / 2 - 0.4, d / 2 - 0.4]} intensity={0.7} distance={4} decay={1.5} color="#f3ecff" />

        {/* 침대 (왼쪽 안) */}
        <group position={[-w / 2 + 0.5, floorY, -d / 2 + 1.05]}>
          <mesh position-y={0.18}>
            <boxGeometry args={[0.95, 0.36, 2]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
          <mesh position-y={0.42}>
            <boxGeometry args={[0.9, 0.14, 1.95]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          <mesh position={[0, 0.52, -0.78]}>
            <boxGeometry args={[0.6, 0.1, 0.32]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.5, 0.25]}>
            <boxGeometry args={[0.92, 0.06, 1.1]} />
            <meshStandardMaterial color="#9fb4d6" />
          </mesh>
        </group>

        {/* 책상 + 의자 (오른쪽 창가) */}
        <group position={[w / 2 - 0.4, floorY, -0.2]}>
          <mesh position-y={0.72}>
            <boxGeometry args={[0.6, 0.04, 1.1]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
          {[-0.5, 0.5].map((z) => (
            <mesh key={z} position={[0.22, 0.36, z]}>
              <boxGeometry args={[0.04, 0.72, 0.04]} />
              <meshStandardMaterial color="#555" />
            </mesh>
          ))}
          <mesh position={[-0.55, 0.45, 0]}>
            <boxGeometry args={[0.42, 0.06, 0.42]} />
            <meshStandardMaterial color="#8c93a1" />
          </mesh>
          <mesh position={[-0.75, 0.7, 0]}>
            <boxGeometry args={[0.05, 0.5, 0.42]} />
            <meshStandardMaterial color="#8c93a1" />
          </mesh>
          {/* 스탠드 */}
          <mesh position={[0.15, 0.95, -0.35]}>
            <cylinderGeometry args={[0.08, 0.12, 0.08, 12]} />
            <meshBasicMaterial color="#fff1cc" toneMapped={false} />
          </mesh>
        </group>

        {/* 러그 */}
        <mesh rotation-x={-Math.PI / 2} position={[0.1, floorY + 0.005, 0.3]}>
          <planeGeometry args={[0.9, 1.1]} />
          <meshStandardMaterial color="#c9b7a2" />
        </mesh>
      </group>
    </group>
  )
}
