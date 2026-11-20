import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { MeshBasicMaterial, PointLight } from 'three'
import { floorTexture } from '../../items/floors'
import type { RoomSize } from './types'

/** 벽·바닥·천장·조명. 원점 = 바닥 한가운데 */
export function RoomShell({
  size: { w, d, h },
  lightOn,
  wall,
  floor,
}: {
  size: RoomSize
  lightOn: boolean
  wall: string
  floor: string
}) {
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
        <meshStandardMaterial map={floorTexture(floor)} roughness={0.8} />
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
