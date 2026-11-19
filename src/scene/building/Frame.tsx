import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { BUILDING, BUILDING_HEIGHT } from './config'

type Piece = { x: number; y: number; z: number; sx: number; sy: number; sz: number }

/** 사진 속 하얀 격자. 층마다 둘러진 슬래브 + 칸 사이 기둥, 옥상 위로 한 층 더 열린 격자 */
function createPieces(): Piece[] {
  const { width, depth, floors, floorHeight, frontBays, slabThickness, columnWidth, crownHeight } = BUILDING
  const pieces: Piece[] = []
  const top = BUILDING_HEIGHT + crownHeight

  // 슬래브 (지붕 높이까지 + 크라운 맨 위)
  for (let f = 1; f <= floors; f++) {
    pieces.push({ x: 0, y: f * floorHeight, z: 0, sx: width, sy: slabThickness, sz: depth })
  }
  pieces.push({ x: 0, y: top, z: 0, sx: width, sy: slabThickness, sz: depth })

  // 정면·뒷면 기둥
  for (let i = 0; i <= frontBays; i++) {
    const x = -width / 2 + (width / frontBays) * i
    const cw = i === 0 || i === frontBays ? columnWidth * 1.6 : columnWidth
    for (const z of [depth / 2 - columnWidth / 2, -depth / 2 + columnWidth / 2]) {
      pieces.push({ x, y: top / 2, z, sx: cw, sy: top, sz: columnWidth })
    }
  }
  return pieces
}

export function Frame() {
  const ref = useRef<InstancedMesh>(null)
  const pieces = useMemo(createPieces, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    pieces.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.set(p.sx, p.sy, p.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [pieces])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pieces.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f4f4f6" emissive="#3b3f4d" roughness={0.6} />
    </instancedMesh>
  )
}
