import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import { isInsideLake, LANE, ROAD, roadLines, SIDEWALK_HEIGHT } from '../layout'
import { CROSSWALK_RANGE } from './Crosswalks'
import { type Axis, lightFor } from './signals'

const POLE_HEIGHT = 4.6
const CORNER = ROAD.width / 2 + 0.25 // 보도 모서리 (보행자 길보다 살짝 안쪽)

type Signal = {
  axis: Axis
  pole: [number, number]
  head: [number, number]
}

/**
 * 교차로 네 모서리에 신호등. 기둥에서 팔이 뻗어 나가서 그 방향 차선 위에 신호가 달림.
 * 신호 불빛 색은 축(x/z)별로 한 번에 바뀜
 */
function generate(): Signal[] {
  const signals: Signal[] = []
  const lines = roadLines().filter((l) => Math.abs(l) <= CROSSWALK_RANGE)
  const e = CORNER
  const lane = LANE.offset
  for (const cx of lines) {
    for (const cz of lines) {
      if (isInsideLake(cx, cz, 8)) continue
      signals.push(
        { axis: 'x', pole: [cx - e, cz + e], head: [cx - e, cz + lane] }, // +x로 오는 차
        { axis: 'x', pole: [cx + e, cz - e], head: [cx + e, cz - lane] }, // -x로 오는 차
        { axis: 'z', pole: [cx - e, cz - e], head: [cx - lane, cz - e] }, // +z로 오는 차
        { axis: 'z', pole: [cx + e, cz + e], head: [cx + lane, cz + e] }, // -z로 오는 차
      )
    }
  }
  return signals
}

const COLORS: Record<string, Color> = {
  green: new Color('#3dff8a').multiplyScalar(1.6),
  yellow: new Color('#ffc53d').multiplyScalar(1.6),
  red: new Color('#ff3b30').multiplyScalar(1.6),
}

export function TrafficLights() {
  const signals = useMemo(generate, [])
  const xSignals = useMemo(() => signals.filter((s) => s.axis === 'x'), [signals])
  const zSignals = useMemo(() => signals.filter((s) => s.axis === 'z'), [signals])

  const poleRef = useRef<InstancedMesh>(null)
  const armRef = useRef<InstancedMesh>(null)
  const housingRef = useRef<InstancedMesh>(null)
  const xBulbRef = useRef<InstancedMesh>(null)
  const zBulbRef = useRef<InstancedMesh>(null)

  const geometries = useMemo(
    () => ({
      pole: new BoxGeometry(0.14, POLE_HEIGHT, 0.14).translate(0, POLE_HEIGHT / 2, 0),
      unit: new BoxGeometry(1, 1, 1),
    }),
    [],
  )

  useLayoutEffect(() => {
    const dummy = new Object3D()
    const y = SIDEWALK_HEIGHT + POLE_HEIGHT - 0.2
    signals.forEach((s, i) => {
      const [px, pz] = s.pole
      const [hx, hz] = s.head
      dummy.rotation.set(0, 0, 0)

      dummy.position.set(px, SIDEWALK_HEIGHT, pz)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      poleRef.current?.setMatrixAt(i, dummy.matrix)

      dummy.position.set((px + hx) / 2, y, (pz + hz) / 2)
      dummy.scale.set(Math.abs(hx - px) + 0.1, 0.08, Math.abs(hz - pz) + 0.1)
      dummy.updateMatrix()
      armRef.current?.setMatrixAt(i, dummy.matrix)

      dummy.position.set(hx, y - 0.3, hz)
      dummy.scale.set(s.axis === 'x' ? 0.3 : 0.9, 0.35, s.axis === 'x' ? 0.9 : 0.3)
      dummy.updateMatrix()
      housingRef.current?.setMatrixAt(i, dummy.matrix)
    })

    for (const [list, ref] of [
      [xSignals, xBulbRef],
      [zSignals, zBulbRef],
    ] as const) {
      list.forEach((s, i) => {
        const [hx, hz] = s.head
        dummy.position.set(hx, y - 0.3, hz)
        dummy.scale.set(s.axis === 'x' ? 0.34 : 0.28, 0.22, s.axis === 'x' ? 0.28 : 0.34)
        dummy.updateMatrix()
        ref.current?.setMatrixAt(i, dummy.matrix)
      })
    }

    for (const ref of [poleRef, armRef, housingRef, xBulbRef, zBulbRef]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    }
  }, [signals, xSignals, zSignals])

  useFrame(() => {
    ;(xBulbRef.current?.material as MeshBasicMaterial | undefined)?.color.copy(COLORS[lightFor('x')])
    ;(zBulbRef.current?.material as MeshBasicMaterial | undefined)?.color.copy(COLORS[lightFor('z')])
  })

  return (
    <>
      <instancedMesh ref={poleRef} args={[geometries.pole, undefined, signals.length]}>
        <meshStandardMaterial color="#4a4f57" />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[geometries.unit, undefined, signals.length]}>
        <meshStandardMaterial color="#4a4f57" />
      </instancedMesh>
      <instancedMesh ref={housingRef} args={[geometries.unit, undefined, signals.length]}>
        <meshStandardMaterial color="#1e2126" />
      </instancedMesh>
      <instancedMesh ref={xBulbRef} args={[geometries.unit, undefined, xSignals.length]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={zBulbRef} args={[geometries.unit, undefined, zSignals.length]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
