import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { isInsideLake, ROAD, roadLines } from '../layout'
import { CROSSWALK, STOP_LINE } from './signals'

export const CROSSWALK_RANGE = 125 // 이 안의 교차로에만 횡단보도·신호등

type Bar = { x: number; z: number; sx: number; sz: number }

/** 교차로마다 네 방향 횡단보도(얼룩말 줄) + 정지선 */
function generate(): Bar[] {
  const bars: Bar[] = []
  const lines = roadLines().filter((l) => Math.abs(l) <= CROSSWALK_RANGE)
  const half = ROAD.width / 2
  const depth = CROSSWALK.to - CROSSWALK.from
  const mid = (CROSSWALK.from + CROSSWALK.to) / 2

  for (const cx of lines) {
    for (const cz of lines) {
      if (isInsideLake(cx, cz, 8)) continue
      for (const side of [-1, 1]) {
        // x축 도로(z = cz)를 가로지르는 횡단보도: 교차로 동·서쪽
        for (let s = -half + 0.5; s <= half - 0.4; s += 0.9) {
          bars.push({ x: cx + side * mid, z: cz + s, sx: depth, sz: 0.45 })
          bars.push({ x: cx + s, z: cz + side * mid, sx: 0.45, sz: depth })
        }
      }
      // 정지선: 들어오는 차선 쪽(진행 방향 오른쪽 절반)에만
      bars.push({ x: cx - STOP_LINE, z: cz + half / 2, sx: 0.3, sz: half - 0.2 }) // +x 방향 차
      bars.push({ x: cx + STOP_LINE, z: cz - half / 2, sx: 0.3, sz: half - 0.2 }) // -x 방향 차
      bars.push({ x: cx - half / 2, z: cz - STOP_LINE, sx: half - 0.2, sz: 0.3 }) // +z 방향 차
      bars.push({ x: cx + half / 2, z: cz + STOP_LINE, sx: half - 0.2, sz: 0.3 }) // -z 방향 차
    }
  }
  return bars
}

export function Crosswalks() {
  const ref = useRef<InstancedMesh>(null)
  const bars = useMemo(generate, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    bars.forEach((b, i) => {
      dummy.position.set(b.x, 0.015, b.z)
      dummy.scale.set(b.sx, 0.02, b.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [bars])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bars.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#d9d9d4" roughness={0.9} />
    </instancedMesh>
  )
}
