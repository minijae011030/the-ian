import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Box3, type Group, type OrthographicCamera, Vector3 } from 'three'
import { FLOORS } from '../items/floors'
import { Rabbit } from '../items/kits/rooms'
import { Character } from '../scene/character/Character'
import { SnailCharacter } from '../scene/character/Snail'
import { PlacedItemMesh } from '../scene/rooms/PlacedItems'
import { DEFAULT_CHARACTER } from '../scene/rooms/types'
import { type CharacterEntry, ENTRIES, type ObjectEntry } from './entries'

type Shootable = ObjectEntry | CharacterEntry

const SIZE = 112

/**
 * 아이템 상자 썸네일. 안 보이는 작은 캔버스에서 물건을 하나씩 찍어서 그림 파일(dataURL)로 만듦.
 * 처음 열 때 한 번만 찍고 계속 씀
 */
export function useThumbnails() {
  const [thumbs, setThumbs] = useState<Record<string, string>>(() => {
    // 배경(벽·바닥)은 3D 없이 바로 그림
    const out: Record<string, string> = {}
    for (const e of ENTRIES) {
      if (e.kind === 'object' || e.kind === 'character') continue
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const ctx = c.getContext('2d')!
      if (e.kind === 'wall') {
        ctx.fillStyle = e.color
        ctx.fillRect(0, 0, 128, 128)
        ctx.fillStyle = 'rgba(0,0,0,0.08)'
        for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 1, 128)
      } else {
        FLOORS[e.floor].draw(ctx)
      }
      out[e.key] = c.toDataURL()
    }
    return out
  })
  const pending = ENTRIES.filter((e): e is Shootable => (e.kind === 'object' || e.kind === 'character') && !thumbs[e.key])
  const baker = pending.length ? (
    <ThumbnailBaker entry={pending[0]} onShot={(key, url) => setThumbs((t) => ({ ...t, [key]: url }))} />
  ) : null
  return { thumbs, baker }
}

function ThumbnailBaker({ entry, onShot }: { entry: Shootable; onShot: (key: string, url: string) => void }) {
  return (
    <div className="fixed top-0 -left-[9999px]" style={{ width: SIZE, height: SIZE }}>
      <Canvas orthographic gl={{ preserveDrawingBuffer: true, alpha: true }} dpr={1} camera={{ near: -50, far: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[3, 6, 4]} intensity={1.3} />
        <Shot key={entry.key} entry={entry} onShot={onShot} />
      </Canvas>
    </div>
  )
}

function Shot({ entry, onShot }: { entry: Shootable; onShot: (key: string, url: string) => void }) {
  const group = useRef<Group>(null)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const gl = useThree((s) => s.gl)
  const frame = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    frame.current = 0
    done.current = false
  }, [entry.key])

  useFrame(() => {
    if (done.current || !group.current) return
    frame.current++
    if (frame.current === 2) {
      // 물건 크기에 맞춰 카메라를 비스듬히 두고 꽉 차게
      const box = new Box3().setFromObject(group.current)
      const center = box.getCenter(new Vector3())
      const extent = box.getSize(new Vector3()).length()
      camera.position.copy(center).add(new Vector3(1, 0.85, 1.2).normalize().multiplyScalar(10))
      camera.lookAt(center)
      camera.zoom = (SIZE * 0.92) / Math.max(extent, 0.1)
      camera.updateProjectionMatrix()
    }
    if (frame.current === 4) {
      done.current = true
      onShot(entry.key, gl.domElement.toDataURL())
    }
  })

  return (
    <group ref={group}>
      {entry.kind === 'object' ? (
        <PlacedItemMesh placed={{ id: 'thumb', item: entry.item, variant: entry.variant, x: 0, y: 0, z: 0, rot: 0 }} lit />
      ) : (
        <CharacterThumb entry={entry} />
      )}
    </group>
  )
}

function CharacterThumb({ entry }: { entry: CharacterEntry }) {
  const config = { ...DEFAULT_CHARACTER, ...entry.patch }
  if (config.kind === 'rabbit') return <Rabbit fur={config.fur} />
  if (config.kind === 'snail') return <SnailCharacter kind="rest" size={{ w: 1, d: 1, h: 1 }} preview />
  return <Character pose="stand" hands="down" look={config} />
}

