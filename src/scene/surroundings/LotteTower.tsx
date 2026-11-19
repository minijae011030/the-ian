import { useMemo } from 'react'
import { Vector2 } from 'three'
import { LOTTE_TOWER } from './layout'

const HEIGHT = 170
const BASE_RADIUS = 13

/**
 * 롯데월드타워 실루엣.
 * 위로 갈수록 곡선으로 가늘어지는 사각 단면이라 4분할 Lathe로 근사함
 */
export function LotteTower() {
  const points = useMemo(() => {
    const steps = 24
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps
      const r = BASE_RADIUS * (1 - 0.8 * Math.pow(t, 1.7))
      return new Vector2(r, t * HEIGHT)
    })
  }, [])

  return (
    <group position={[LOTTE_TOWER.x, 0, LOTTE_TOWER.z]}>
      <mesh rotation-y={Math.PI / 4}>
        <latheGeometry args={[points, 4]} />
        <meshStandardMaterial color="#b9c7e2" emissive="#33476e" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* 꼭대기 랜턴 불빛 */}
      <mesh position={[0, HEIGHT + 4, 0]} rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[2.6, 3.2, 8, 4, 1, true]} />
        <meshBasicMaterial color="#fff1c9" toneMapped={false} />
      </mesh>
    </group>
  )
}
