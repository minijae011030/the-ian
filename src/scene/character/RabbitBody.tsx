import type { Ref } from 'react'
import type { Group } from 'three'

/**
 * 토끼 생김새. 방 캐릭터(Pets)·소품(kits/rooms)·썸네일이 같이 씀
 * mine = 우리 토끼: 하얀 몸에 귀 까맣고 눈 주위만 까만 아이라인
 */
export type RabbitFur = 'mine' | 'white' | 'brown'

export const RABBIT_FURS: Record<RabbitFur, { name: string; body: string; ear: string; patch?: string }> = {
  mine: { name: '우리 토끼', body: '#f5f3ef', ear: '#1f1d1d', patch: '#1f1d1d' },
  white: { name: '흰 토끼', body: '#f2efe9', ear: '#f2efe9' },
  brown: { name: '갈색 토끼', body: '#9a7458', ear: '#8a664c' },
}

export function RabbitBody({
  fur = 'mine',
  headRef,
  earsRef,
}: {
  fur?: RabbitFur
  headRef?: Ref<Group>
  earsRef?: Ref<Group>
}) {
  const f = RABBIT_FURS[fur] ?? RABBIT_FURS.mine
  return (
    <>
      {/* 동글동글 통통한 몸 */}
      <mesh position={[0, 0.09, -0.02]} scale={[0.1, 0.085, 0.12]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={f.body} />
      </mesh>
      {/* 앞발 (털에 거의 묻힘) */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.03, 0.02, 0.06]} scale={[0.017, 0.016, 0.03]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={f.body} />
        </mesh>
      ))}
      <mesh position={[0, 0.07, -0.135]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <group ref={headRef} position={[0, 0.155, 0.08]}>
        <mesh scale={[0.06, 0.055, 0.065]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={f.body} />
        </mesh>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            {f.patch && (
              <mesh position={[sx * 0.033, 0.012, 0.052]} scale={[0.015, 0.014, 0.011]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={f.patch} roughness={0.9} />
              </mesh>
            )}
            <mesh position={[sx * 0.036, 0.013, 0.056]}>
              <sphereGeometry args={[0.008, 8, 6]} />
              <meshStandardMaterial color="#0b0b0c" roughness={0.15} />
            </mesh>
            {/* 눈 반짝 */}
            <mesh position={[sx * 0.04, 0.017, 0.061]}>
              <sphereGeometry args={[0.0022, 4, 3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.01, 0.064]}>
          <sphereGeometry args={[0.006, 6, 4]} />
          <meshStandardMaterial color="#e8a0a0" />
        </mesh>
        <group ref={earsRef} position={[0, 0.04, -0.01]}>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.025, 0.06, 0]} rotation-z={sx * -0.12} scale={[0.02, 0.07, 0.011]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color={f.ear} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  )
}
