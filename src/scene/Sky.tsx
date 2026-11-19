import { BackSide, Color } from 'three'

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

type SkyProps = {
  topColor?: string
  horizonColor?: string
}

/** 사진 속 블루아워 하늘. 지금은 고정 색이고, 서울 시간 연동은 나중에 */
export function Sky({ topColor = '#123a8c', horizonColor = '#6d93d6' }: SkyProps) {
  return (
    <mesh>
      <sphereGeometry args={[900, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          topColor: { value: new Color(topColor) },
          horizonColor: { value: new Color(horizonColor) },
          exponent: { value: 0.6 },
        }}
      />
    </mesh>
  )
}
