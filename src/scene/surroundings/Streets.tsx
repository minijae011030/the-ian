import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import {
  BLOCK_SIZE,
  blockCenters,
  CITY_RADIUS,
  isInsideLake,
  ROAD,
  roadLines,
  SIDEWALK_HEIGHT,
} from './layout'

type Item = { x: number; y: number; z: number; sx: number; sy: number; sz: number }

const LAMP_RANGE = 160 // 가로등·차선은 가까운 데만
const LAMP_GAP = 11
const DASH = { length: 2.4, gap: 3.2 }

function generate() {
  const sidewalks: Item[] = []
  const dashes: Item[] = []
  const poles: Item[] = []
  const heads: Item[] = []

  // 블록 = 살짝 솟은 보도. 그 사이가 도로(땅)
  for (const bx of blockCenters()) {
    for (const bz of blockCenters()) {
      if (Math.hypot(bx, bz) > CITY_RADIUS + 20) continue
      if (isInsideLake(bx, bz, -4)) continue
      sidewalks.push({ x: bx, y: 0, z: bz, sx: BLOCK_SIZE, sy: SIDEWALK_HEIGHT, sz: BLOCK_SIZE })
    }
  }

  for (const line of roadLines()) {
    if (Math.abs(line) > LAMP_RANGE) continue
    for (let t = -LAMP_RANGE; t < LAMP_RANGE; t += DASH.length + DASH.gap) {
      // 가로 방향 도로(z = line)와 세로 방향 도로(x = line) 둘 다
      if (!isInsideLake(t, line, 2))
        dashes.push({ x: t, y: 0.02, z: line, sx: DASH.length, sy: 0.02, sz: 0.25 })
      if (!isInsideLake(line, t, 2))
        dashes.push({ x: line, y: 0.02, z: t, sx: 0.25, sy: 0.02, sz: DASH.length })
    }

    const edge = ROAD.width / 2 - 0.6
    for (let t = -LAMP_RANGE; t < LAMP_RANGE; t += LAMP_GAP) {
      for (const [x, z] of [
        [t, line + edge],
        [line + edge, t],
      ]) {
        if (isInsideLake(x, z, 2)) continue
        poles.push({ x, y: SIDEWALK_HEIGHT, z, sx: 0.12, sy: 4.2, sz: 0.12 })
        heads.push({ x, y: SIDEWALK_HEIGHT + 4.2, z, sx: 0.45, sy: 0.25, sz: 0.45 })
      }
    }
  }
  return { sidewalks, dashes, poles, heads }
}

function useInstances(ref: React.RefObject<InstancedMesh | null>, items: Item[]) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z)
      dummy.scale.set(it.sx, it.sy, it.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [ref, items])
}

/** 도로·보도·차선·가로등 */
export function Streets() {
  const { sidewalks, dashes, poles, heads } = useMemo(generate, [])
  const sidewalkRef = useRef<InstancedMesh>(null)
  const dashRef = useRef<InstancedMesh>(null)
  const poleRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)

  useInstances(sidewalkRef, sidewalks)
  useInstances(dashRef, dashes)
  useInstances(poleRef, poles)
  useInstances(headRef, heads)

  return (
    <>
      <instancedMesh ref={sidewalkRef} args={[undefined, undefined, sidewalks.length]}>
        <boxGeometry args={[1, 1, 1]} onUpdate={(g) => g.translate(0, 0.5, 0)} />
        <meshStandardMaterial color="#6b6f78" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#c9c4a8" />
      </instancedMesh>
      <instancedMesh ref={poleRef} args={[undefined, undefined, poles.length]}>
        <boxGeometry args={[1, 1, 1]} onUpdate={(g) => g.translate(0, 0.5, 0)} />
        <meshStandardMaterial color="#3a3e46" />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, heads.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffe2a8" toneMapped={false} />
      </instancedMesh>
    </>
  )
}
