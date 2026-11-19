import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { BackSide, Color } from 'three'
import { environment } from './environment'

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    float t = pow(max(h, 0.0), exponent);
    gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
  }
`

/** 그라데이션 하늘. 색은 서울 시간에 따라 environment에서 받아옴 */
export function Sky() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new Color() },
      horizonColor: { value: new Color() },
      exponent: { value: 0.6 },
    }),
    [],
  )

  useFrame(() => {
    uniforms.topColor.value.copy(environment.top)
    uniforms.horizonColor.value.copy(environment.horizon)
  })

  return (
    <mesh>
      <sphereGeometry args={[900, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
