import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import type { Hands, Pose, Prop } from '../rooms/types'

/**
 * 임시 캐릭터 (나). 캡슐 몸통 + 구 머리 + 팔다리 막대.
 * 원점 = 발바닥(서 있을 때) / 엉덩이 아래 바닥(앉을 때), 정면이 +z.
 * 나중에 모델만 갈아끼워도 되게 pose·hands만 받아서 자세를 잡음
 */
const LOOK = {
  skin: '#f1d3b8',
  hair: '#2b211c',
  top: '#e9e4da', // 크림색 후드
  bottom: '#3b4458',
}

const THIGH = 0.3
const SHIN = 0.38
const HIP_STAND = THIGH + SHIN
const TORSO = 0.42
const ARM = 0.3

/** 팔 각도 [왼팔, 오른팔]: x축 회전(앞으로 들기), z축 회전(옆으로 벌리기) */
const ARM_POSES: Record<Hands, [[number, number], [number, number]]> = {
  down: [[0, -0.08], [0, 0.08]],
  type: [[-1.25, 0.15], [-1.25, -0.15]],
  write: [[-0.9, 0.2], [-1.3, -0.1]],
  read: [[-1.4, 0.25], [-1.4, -0.25]],
  phone: [[-0.4, 0.1], [-2.1, -0.35]],
  eat: [[-1.1, 0.2], [-1.9, -0.3]],
  face: [[-2.5, 0.55], [-2.5, -0.55]],
  pet: [[-0.9, 0.1], [-1.2, -0.2]],
}

type Props = {
  pose: Pose
  hands: Hands
  prop?: Prop
  seat?: number
}

function Limb({ length, radius, color }: { length: number; radius: number; color: string }) {
  return (
    <mesh position-y={-length / 2}>
      <capsuleGeometry args={[radius, length - radius * 2, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  )
}

export function Character({ pose, hands, prop, seat = 0.45 }: Props) {
  const torso = useRef<Group>(null)
  const head = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const chest = useRef<Mesh>(null)

  const hipY = pose === 'stand' ? HIP_STAND : pose === 'sit' ? seat + 0.04 : 0
  const [[lx, lz], [rx, rz]] = ARM_POSES[hands]

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const sleeping = pose === 'lie'
    // 숨쉬기
    const breath = Math.sin(t * (sleeping ? 1.4 : 2.2))
    chest.current?.scale.set(1 + breath * 0.015, 1 + breath * 0.02, 1 + breath * 0.02)

    if (!head.current || !leftArm.current || !rightArm.current) return
    head.current.rotation.set(0, 0, 0)
    leftArm.current.rotation.set(lx, 0, lz)
    rightArm.current.rotation.set(rx, 0, rz)

    // 손·머리 움직임
    switch (hands) {
      case 'type':
        leftArm.current.rotation.x += Math.sin(t * 17) * 0.04
        rightArm.current.rotation.x += Math.sin(t * 19 + 1) * 0.04
        head.current.rotation.x = 0.12 + Math.sin(t * 0.7) * 0.03
        break
      case 'write':
        rightArm.current.rotation.z += Math.sin(t * 9) * 0.06
        head.current.rotation.x = 0.3 + Math.sin(t * 0.5) * 0.04
        break
      case 'read':
        head.current.rotation.x = 0.35
        head.current.rotation.y = Math.sin(t * 0.4) * 0.12
        break
      case 'phone':
        head.current.rotation.x = 0.35
        rightArm.current.rotation.x += Math.sin(t * 1.3) * 0.03
        break
      case 'eat': {
        // 숟가락 들었다 놨다
        const bite = (Math.sin(t * 2.4) + 1) / 2
        rightArm.current.rotation.x = -1.2 - bite * 0.9
        head.current.rotation.x = 0.15 - bite * 0.1
        break
      }
      case 'face':
        // 얼굴에 톡톡
        leftArm.current.rotation.x += Math.sin(t * 6) * 0.08
        rightArm.current.rotation.x += Math.sin(t * 6 + 1.5) * 0.08
        head.current.rotation.z = Math.sin(t * 0.8) * 0.08
        break
      case 'pet':
        rightArm.current.rotation.x += Math.sin(t * 3) * 0.12
        head.current.rotation.x = 0.4
        break
      default:
        head.current.rotation.y = Math.sin(t * 0.3) * 0.15
    }
    if (sleeping) head.current.rotation.set(0, 0, 0.15)
  })

  // 누우면 통째로 눕힘: 머리가 -z, 얼굴이 위
  const lying = pose === 'lie'

  return (
    <group rotation-x={lying ? -Math.PI / 2 : 0} position={lying ? [0, 0.14, 0] : [0, 0, 0]}>
      {/* 다리: 엉덩이에서 허벅지, 무릎에서 정강이 */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.075, lying ? HIP_STAND : hipY, 0]} rotation-x={pose === 'sit' ? -Math.PI / 2 : 0}>
          <Limb length={THIGH} radius={0.065} color={LOOK.bottom} />
          <group position-y={-THIGH} rotation-x={pose === 'sit' ? Math.PI / 2 : 0}>
            <Limb length={SHIN} radius={0.055} color={LOOK.bottom} />
          </group>
        </group>
      ))}

      {/* 몸통 + 머리 + 팔 */}
      <group ref={torso} position-y={lying ? HIP_STAND : hipY}>
        <mesh ref={chest} position-y={TORSO / 2}>
          <capsuleGeometry args={[0.15, TORSO - 0.3, 4, 12]} />
          <meshStandardMaterial color={LOOK.top} roughness={0.9} />
        </mesh>

        <group ref={head} position-y={TORSO + 0.05}>
          <mesh position-y={0.14}>
            <sphereGeometry args={[0.135, 20, 16]} />
            <meshStandardMaterial color={LOOK.skin} roughness={0.7} />
          </mesh>
          {/* 머리카락: 정수리에서 뒤통수 쪽으로 기울인 반구. 앞은 이마까지만 덮어서 얼굴이 보임 */}
          <mesh position={[0, 0.145, -0.01]} rotation-x={-0.6}>
            <sphereGeometry args={[0.148, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.47]} />
            <meshStandardMaterial color={LOOK.hair} roughness={0.9} />
          </mesh>
          {/* 눈 */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.045, 0.15, 0.125]}>
              <sphereGeometry args={[0.014, 8, 6]} />
              <meshBasicMaterial color={lying ? LOOK.skin : '#1a1a1a'} />
            </mesh>
          ))}
        </group>

        {[
          [-1, leftArm],
          [1, rightArm],
        ].map(([side, ref]) => (
          <group key={side as number} ref={ref as React.RefObject<Group>} position={[(side as number) * 0.2, TORSO - 0.06, 0]}>
            <Limb length={ARM} radius={0.045} color={LOOK.top} />
            <mesh position-y={-ARM}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color={LOOK.skin} />
            </mesh>
            {/* 오른손 소품 */}
            {side === 1 && prop === 'phone' && (
              <mesh position={[0, -ARM - 0.02, 0.03]} rotation-x={0.3}>
                <boxGeometry args={[0.07, 0.13, 0.01]} />
                <meshBasicMaterial color="#9fc3ff" toneMapped={false} />
              </mesh>
            )}
          </group>
        ))}

        {/* 책은 두 손 사이 */}
        {prop === 'book' && (
          <mesh position={[0, TORSO - 0.3, 0.3]} rotation-x={-0.6}>
            <boxGeometry args={[0.26, 0.02, 0.18]} />
            <meshStandardMaterial color="#c75b4a" />
          </mesh>
        )}
      </group>
    </group>
  )
}
