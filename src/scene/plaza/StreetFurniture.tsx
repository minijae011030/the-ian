import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MeshBasicMaterial } from 'three'
import { canvasTexture } from '../../lib/canvasTexture'
import { BUILDING } from '../building/config'
import { environment } from '../environment'
import { SIDEWALK_HEIGHT } from '../surroundings/layout'
import { BENCHES, BOLLARDS, BUS_STOP } from './layout'

const WOOD = '#9a7350'
const METAL = '#3a3e46'

/** 밤이 되면 밝아지는 발광 재질 모음 */
function useNightGlow(base: number, night: number) {
  const ref = useRef<MeshBasicMaterial>(null)
  useFrame(() => {
    ref.current?.color.setScalar(base + (night - base) * environment.darkness)
  })
  return ref
}

function Bench({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, SIDEWALK_HEIGHT, z]}>
      <mesh position-y={0.45}>
        <boxGeometry args={[2, 0.08, 0.5]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 0.75, -0.24]}>
        <boxGeometry args={[2, 0.5, 0.06]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {[-0.85, 0.85].map((lx) => (
        <mesh key={lx} position={[lx, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.45]} />
          <meshStandardMaterial color={METAL} />
        </mesh>
      ))}
    </group>
  )
}

/** 건물 양옆 화단 */
function Planters() {
  const { width } = BUILDING
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 1), SIDEWALK_HEIGHT, 0]}>
          <mesh position-y={0.3}>
            <boxGeometry args={[0.9, 0.6, 7]} />
            <meshStandardMaterial color="#b9b3a8" />
          </mesh>
          {[-2.6, -1.3, 0, 1.3, 2.6].map((z) => (
            <mesh key={z} position={[0, 0.85, z]} scale={[0.45, 0.4, 0.6]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#4c7a40" flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

/** 정문 캐노피 + 아래 조명 */
function Entrance() {
  const light = useNightGlow(0.5, 1.4)
  const { depth } = BUILDING
  return (
    <group position={[0, SIDEWALK_HEIGHT, depth / 2]}>
      <mesh position={[0, 1.78, 0.9]}>
        <boxGeometry args={[3.8, 0.12, 1.8]} />
        <meshStandardMaterial color="#eef0f4" emissive="#3b3f4d" />
      </mesh>
      <mesh position={[0, 1.715, 0.9]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[3.2, 1.4]} />
        <meshBasicMaterial ref={light} color="#fff2d6" toneMapped={false} />
      </mesh>
      {/* 입구 매트 */}
      <mesh position={[0, 0.012, 0.9]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.4, 1.6]} />
        <meshStandardMaterial color="#3b3f47" />
      </mesh>
    </group>
  )
}

/** 정면 진입로 양쪽 볼라드 조명 */
function Bollards() {
  const glow = useNightGlow(0.4, 1.3)
  return (
    <>
      {BOLLARDS.map(([x, z]) => (
        <group key={x} position={[x, SIDEWALK_HEIGHT, z]}>
          <mesh position-y={0.35}>
            <cylinderGeometry args={[0.1, 0.1, 0.7, 8]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
          <mesh position-y={0.72}>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
            <meshBasicMaterial ref={glow} color="#ffe9c2" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/** 버스 정류장. 광고판엔 THE IAN 포스터 */
function BusStop() {
  const [x, z] = BUS_STOP
  const glow = useNightGlow(0.75, 1.25)
  const poster = useMemo(
    () =>
      canvasTexture(256, 384, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 384)
        g.addColorStop(0, '#1d3f95')
        g.addColorStop(1, '#f2c29a')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 256, 384)
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.font = '600 34px "Helvetica Neue", Arial, sans-serif'
        ctx.fillText('THE IAN', 128, 300)
        ctx.font = '400 16px "Helvetica Neue", Arial, sans-serif'
        ctx.fillText('JAMSIL, SEOUL', 128, 330)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) ctx.fillRect(78 + c * 26, 70 + r * 30, 18, 20)
      }),
    [],
  )

  return (
    <group position={[x, SIDEWALK_HEIGHT, z]}>
      {/* 지붕 */}
      <mesh position-y={2.4}>
        <boxGeometry args={[3.2, 0.1, 1.3]} />
        <meshStandardMaterial color="#d8dbe0" />
      </mesh>
      {/* 기둥 */}
      {[-1.5, 1.5].map((px) => (
        <mesh key={px} position={[px, 1.2, -0.5]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color={METAL} />
        </mesh>
      ))}
      {/* 뒷 유리 */}
      <mesh position={[-0.3, 1.2, -0.55]}>
        <boxGeometry args={[2.4, 2, 0.04]} />
        <meshStandardMaterial color="#9fb3cc" transparent opacity={0.35} />
      </mesh>
      {/* 광고판 */}
      <mesh position={[1.25, 1.25, -0.5]}>
        <boxGeometry args={[0.5, 1.9, 0.14]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[1.25, 1.25, -0.42]}>
        <planeGeometry args={[0.4, 1.75]} />
        <meshBasicMaterial ref={glow} map={poster} toneMapped={false} />
      </mesh>
      {/* 의자 */}
      <mesh position={[-0.4, 0.5, -0.3]}>
        <boxGeometry args={[1.8, 0.07, 0.4]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
    </group>
  )
}

export function StreetFurniture() {
  return (
    <>
      {BENCHES.map(([x, z]) => (
        <Bench key={x} x={x} z={z} />
      ))}
      <Planters />
      <Entrance />
      <Bollards />
      <BusStop />
    </>
  )
}
