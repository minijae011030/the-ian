import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, Object3D } from 'three'
import { createRandom, range } from '../../lib/random'
import { createBuildingMaterial } from './buildingMaterial'
import {
  BLOCK_SIZE,
  blockCenters,
  CITY_RADIUS,
  isInsideLake,
  isNearTower,
  SIDEWALK_HEIGHT,
} from './layout'

type Box = { x: number; y: number; z: number; w: number; h: number; d: number; color: Color }

const FLOOR_H = 1.9
const WALL_COLORS = ['#c9c2b4', '#a9adb4', '#d8d4cc', '#8d8f94', '#b79b84', '#9aa3ad', '#e2ddd2', '#7c838c']
const ROOFTOP_COLOR = '#6f747c'

/** 원점에서 거리별 층수. 가까운 골목은 낮은 상가, 멀수록 높은 건물이 섞임 */
function pickFloors(rand: () => number, dist: number) {
  if (dist < 60) return Math.floor(range(rand, 2, 6))
  if (dist < 120) return Math.floor(range(rand, 3, rand() < 0.2 ? 18 : 10))
  return Math.floor(range(rand, 5, rand() < 0.25 ? 32 : 16))
}

function generate() {
  const rand = createRandom(20261120)
  const buildings: Box[] = []
  const rooftops: Box[] = []
  const color = () => new Color(WALL_COLORS[Math.floor(rand() * WALL_COLORS.length)])

  for (const bx of blockCenters()) {
    for (const bz of blockCenters()) {
      if (bx === 0 && bz === 0) continue // 우리 건물 블록
      if (Math.hypot(bx, bz) > CITY_RADIUS) continue

      // 블록 하나를 2~3 x 2~3 필지로 쪼갬
      const nx = rand() < 0.5 ? 2 : 3
      const nz = rand() < 0.5 ? 2 : 3
      const lotW = BLOCK_SIZE / nx
      const lotD = BLOCK_SIZE / nz

      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          const cx = bx - BLOCK_SIZE / 2 + lotW * (i + 0.5)
          const cz = bz - BLOCK_SIZE / 2 + lotD * (j + 0.5)
          if (isInsideLake(cx, cz, 6) || isNearTower(cx, cz)) continue
          if (rand() < 0.08) continue // 가끔 빈 필지(주차장 느낌)

          const dist = Math.hypot(cx, cz)
          const floors = pickFloors(rand, dist)
          const w = lotW - range(rand, 0.6, 2)
          const d = lotD - range(rand, 0.6, 2)
          const h = floors * FLOOR_H + 0.8 // +0.8은 지붕 난간
          const c = color()

          buildings.push({ x: cx, y: SIDEWALK_HEIGHT, z: cz, w, h, d, color: c })

          // 높은 건물은 위쪽을 한 번 들여서(셋백) 덩어리감 주기
          let topY = SIDEWALK_HEIGHT + h
          let topW = w
          let topD = d
          if (floors >= 10 && rand() < 0.6) {
            const extra = Math.floor(range(rand, 3, 10)) * FLOOR_H + 0.8
            topW = w * range(rand, 0.55, 0.8)
            topD = d * range(rand, 0.55, 0.8)
            buildings.push({ x: cx, y: topY, z: cz, w: topW, h: extra, d: topD, color: c })
            topY += extra
          }

          // 옥상 실외기·물탱크·계단실
          const units = Math.floor(range(rand, 0, 3))
          for (let k = 0; k < units; k++) {
            rooftops.push({
              x: cx + range(rand, -topW / 3, topW / 3),
              y: topY,
              z: cz + range(rand, -topD / 3, topD / 3),
              w: range(rand, 0.8, 2.4),
              h: range(rand, 0.6, 1.6),
              d: range(rand, 0.8, 2.4),
              color: new Color(ROOFTOP_COLOR),
            })
          }
        }
      }
    }
  }
  return { buildings, rooftops }
}

function useInstances(ref: React.RefObject<InstancedMesh | null>, boxes: Box[]) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    boxes.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z)
      dummy.scale.set(b.w, b.h, b.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, b.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [ref, boxes])
}

/** 잠실 골목 건물들. 거리처럼 블록 안에 빽빽하게 */
export function CityBlocks() {
  const buildingRef = useRef<InstancedMesh>(null)
  const rooftopRef = useRef<InstancedMesh>(null)
  const { buildings, rooftops } = useMemo(generate, [])
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [])
  const material = useMemo(createBuildingMaterial, [])

  useInstances(buildingRef, buildings)
  useInstances(rooftopRef, rooftops)

  return (
    <>
      <instancedMesh ref={buildingRef} args={[geometry, material, buildings.length]} />
      <instancedMesh ref={rooftopRef} args={[geometry, undefined, rooftops.length]}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </>
  )
}
