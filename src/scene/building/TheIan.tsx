import { SIDEWALK_HEIGHT } from '../surroundings/layout'
import { BUILDING, BUILDING_HEIGHT } from './config'
import { Frame } from './Frame'
import { Sign } from './Sign'
import { Windows } from './Windows'

const SIDE_WALL_INSET = 0.06

/** 우리 건물. 사진 속 하얀 격자 오피스텔 */
export function TheIan() {
  const { width, depth, frameDepth } = BUILDING
  const coreW = width - frameDepth * 2
  const coreD = depth - frameDepth * 2

  return (
    <group position-y={SIDEWALK_HEIGHT}>
      {/* 창 뒤 몸통. 격자 사이가 깊어 보이게 어둡게 */}
      <mesh position-y={BUILDING_HEIGHT / 2}>
        <boxGeometry args={[coreW, BUILDING_HEIGHT, coreD]} />
        <meshStandardMaterial color="#2a3140" />
      </mesh>

      {/* 동·서 옆면은 사진처럼 막힌 흰 벽.
          바깥면을 슬래브·기둥 면보다 살짝 안으로 넣어야 면이 겹치면서 지글거리지(z-fighting) 않음 */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 - SIDE_WALL_INSET - 0.2), BUILDING_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.4, BUILDING_HEIGHT, depth - 0.1]} />
          <meshStandardMaterial color="#e4e6eb" roughness={0.8} />
        </mesh>
      ))}

      <Windows />
      <Frame />
      <Sign />
    </group>
  )
}
