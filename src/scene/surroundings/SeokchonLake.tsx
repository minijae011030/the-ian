import { LAKE } from './layout'

/** 석촌호수 서호·동호. 둘레 산책로를 살짝 밝은 링으로 */
export function SeokchonLake() {
  return (
    <group>
      {[LAKE.west, LAKE.east].map(({ x, z, rx, rz }) => (
        <group key={`${x}-${z}`} position={[x, 0.24, z]} scale={[rx, 1, rz]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
            <ringGeometry args={[1, 1.12, 64]} />
            <meshStandardMaterial color="#4a5163" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[1, 64]} />
            <meshStandardMaterial color="#1c3266" metalness={0.3} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
