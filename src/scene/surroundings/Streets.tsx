import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import { environment } from '../environment'
import { STOP_LINE } from './traffic/signals'
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

  const lines = roadLines()
  /** 교차로·횡단보도 구간이면 차선 점선·가로등 안 그림 */
  const nearIntersection = (t: number, margin: number) => lines.some((c) => Math.abs(t - c) < STOP_LINE + margin)

  for (const line of lines) {
    if (Math.abs(line) > LAMP_RANGE) continue
    for (let t = -LAMP_RANGE; t < LAMP_RANGE; t += DASH.length + DASH.gap) {
      if (nearIntersection(t, DASH.length / 2)) continue
      // 가로 방향 도로(z = line)와 세로 방향 도로(x = line) 둘 다
      if (!isInsideLake(t, line, 2))
        dashes.push({ x: t, y: 0.02, z: line, sx: DASH.length, sy: 0.02, sz: 0.25 })
      if (!isInsideLake(line, t, 2))
        dashes.push({ x: line, y: 0.02, z: t, sx: 0.25, sy: 0.02, sz: DASH.length })
    }

    // 가로등은 보도 가장자리 (보행자 걷는 줄보다 바깥쪽)
    const edge = ROAD.width / 2 + 0.25
    for (let t = -LAMP_RANGE; t < LAMP_RANGE; t += LAMP_GAP) {
      if (nearIntersection(t, 1.5)) continue
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

  // 바닥이 y=0에 오게 원점을 아래로 옮긴 상자 (onUpdate로 하면 리렌더마다 계속 밀려 올라감)
  const groundedBox = useMemo(() => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [])

  useInstances(sidewalkRef, sidewalks)
  useInstances(dashRef, dashes)
  useInstances(poleRef, poles)
  useInstances(headRef, heads)

  // 가로등: 어두워지면 켜지고 낮엔 꺼진 회색
  const lampOn = useMemo(() => new Color('#ffe2a8'), [])
  const lampOff = useMemo(() => new Color('#8a8d93'), [])
  useFrame(() => {
    const material = headRef.current?.material as MeshBasicMaterial | undefined
    if (!material) return
    const on = environment.darkness > 0.45 ? 1 : 0
    material.color.copy(lampOff).lerp(lampOn, on)
  })

  return (
    <>
      <instancedMesh ref={sidewalkRef} args={[groundedBox, undefined, sidewalks.length]}>
        <meshStandardMaterial color="#6b6f78" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#c9c4a8" />
      </instancedMesh>
      <instancedMesh ref={poleRef} args={[groundedBox, undefined, poles.length]}>
        <meshStandardMaterial color="#3a3e46" />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, heads.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
