import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Object3D } from 'three'
import { createRandom, range } from '../../lib/random'
import { SIDEWALK_HEIGHT } from '../surroundings/layout'
import { TREES } from './layout'

const GREENS = ['#3e6a38', '#4a7a3f', '#365f33', '#557f44']

/** 사진 속 플라타너스 가로수 느낌. 기둥 + 덩어리 3~4개 뭉친 잎 */
export function Trees() {
  const trunkRef = useRef<InstancedMesh>(null)
  const leafRef = useRef<InstancedMesh>(null)
  const pitRef = useRef<InstancedMesh>(null)

  const leaves = useMemo(() => {
    const rand = createRandom(1104)
    return TREES.flatMap(([x, z]) => {
      const height = range(rand, 3.8, 4.8)
      return Array.from({ length: 5 }, (_, i) => ({
        x: x + range(rand, -0.75, 0.75),
        y: height - (i === 0 ? 0 : range(rand, 0.3, 1.1)),
        z: z + range(rand, -0.75, 0.75),
        r: range(rand, 0.65, 1.05),
        color: new Color(GREENS[Math.floor(rand() * GREENS.length)]),
      }))
    })
  }, [])

  const leafGeometry = useMemo(() => new IcosahedronGeometry(1, 0), [])
  const trunkGeometry = useMemo(() => new CylinderGeometry(0.1, 0.16, 3.2, 6).translate(0, 1.6, 0), [])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    TREES.forEach(([x, z], i) => {
      dummy.position.set(x, SIDEWALK_HEIGHT, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      trunkRef.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.y = SIDEWALK_HEIGHT + 0.01
      dummy.updateMatrix()
      pitRef.current?.setMatrixAt(i, dummy.matrix)
    })
    leaves.forEach((l, i) => {
      dummy.position.set(l.x, SIDEWALK_HEIGHT + l.y, l.z)
      dummy.rotation.set(l.x, l.z, 0)
      dummy.scale.setScalar(l.r)
      dummy.updateMatrix()
      leafRef.current?.setMatrixAt(i, dummy.matrix)
      leafRef.current?.setColorAt(i, l.color)
    })
    for (const ref of [trunkRef, leafRef, pitRef]) {
      if (!ref.current) continue
      ref.current.instanceMatrix.needsUpdate = true
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    }
  }, [leaves])

  return (
    <>
      <instancedMesh ref={trunkRef} args={[trunkGeometry, undefined, TREES.length]}>
        <meshStandardMaterial color="#8a7d6b" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pitRef} args={[undefined, undefined, TREES.length]}>
        <boxGeometry args={[1.3, 0.04, 1.3]} />
        <meshStandardMaterial color="#3d3a35" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[leafGeometry, undefined, leaves.length]}>
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
    </>
  )
}
