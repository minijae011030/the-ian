export function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[800, 64]} />
      <meshStandardMaterial color="#2c3039" />
    </mesh>
  )
}
