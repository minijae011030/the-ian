import { Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Fog, Group, HemisphereLight } from 'three'
import { getSeoulHour } from '../lib/seoulTime'
import { environment, updateEnvironment } from './environment'

/**
 * 서울 시간을 읽어 공유 environment를 갱신하고, 안개·하늘빛·별을 맞춤.
 * priority -1이라 다른 컴포넌트의 useFrame보다 먼저 돎
 */
export function EnvironmentController() {
  const scene = useThree((s) => s.scene)
  const hemi = useRef<HemisphereLight>(null)
  const stars = useRef<Group>(null)

  useFrame(() => {
    updateEnvironment(getSeoulHour())
    if (scene.fog instanceof Fog) scene.fog.color.copy(environment.horizon)
    if (hemi.current) {
      hemi.current.intensity = environment.light
      hemi.current.color.copy(environment.horizon).lerp(environment.top, 0.3)
    }
    if (stars.current) stars.current.visible = environment.darkness > 0.75
  }, -1)

  return (
    <>
      <hemisphereLight ref={hemi} args={['#9bb7ee', '#2a3142', 1.5]} />
      <group ref={stars}>
        <Stars radius={600} depth={100} count={1500} factor={6} fade speed={0.3} />
      </group>
    </>
  )
}
