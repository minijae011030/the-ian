import { Bed, Chair, Desk, DeskLamp, Laptop, Rug, Vanity } from '../furniture'
import type { RoomLayout, RoomSize, Spot } from '../types'

/**
 * 기본 원룸 배치. 창(카메라)에서 봤을 때 캐릭터가 옆모습으로 다 보이게:
 * - 침대: 왼쪽 안쪽, 길게
 * - 책상: 오른쪽 벽에 붙이고, 앉으면 오른쪽(+x)을 봄
 * - 화장대: 왼쪽 벽 창가 (넓은 방만), 서면 왼쪽(-x)을 봄
 */
export function basicPositions({ w, d }: RoomSize) {
  const wide = w > 2
  const deskZ = wide ? 0.15 : d / 2 - 0.7
  return {
    wide,
    bed: [-w / 2 + 0.55, 0, -d / 2 + 1.05] as [number, number, number],
    desk: [w / 2 - 0.3, 0, deskZ] as [number, number, number],
    chair: [w / 2 - 0.85, 0, deskZ] as [number, number, number],
    deskTop: (dx: number, dz: number) => [w / 2 - 0.3 + dx, 0.74, deskZ + dz] as [number, number, number],
    vanity: [-w / 2 + 0.2, 0, d / 2 - 0.55] as [number, number, number],
  }
}

export function basicSpots(size: RoomSize): ReturnType<RoomLayout['spots']> {
  const { w } = size
  const p = basicPositions(size)
  const desk: Pick<Spot, 'pose' | 'position' | 'rotationY'> = {
    pose: 'sit',
    position: [p.chair[0] - 0.02, 0, p.chair[2]],
    rotationY: Math.PI / 2,
  }
  return {
    sleep: { pose: 'lie', hands: 'down', position: [p.bed[0], 0.5, p.bed[2] + 0.95], rotationY: 0 },
    skincare: p.wide
      ? { pose: 'stand', hands: 'face', position: [-w / 2 + 0.72, 0, p.vanity[2]], rotationY: -Math.PI / 2 }
      : { ...desk, hands: 'face' },
    study: { ...desk, hands: 'write' },
    work: { ...desk, hands: 'type' },
    eat: { ...desk, hands: 'eat' },
    rest: { pose: 'sit', hands: 'phone', prop: 'phone', seat: 0.5, position: [p.bed[0] + 0.3, 0, p.bed[2] + 0.5], rotationY: Math.PI / 2 },
    exercise: { pose: 'stand', hands: 'down', position: [0, 0, 0.6], rotationY: 0 },
    away: null,
  }
}

export const defaultLayout: RoomLayout = {
  Furniture: ({ size, kind }) => {
    const p = basicPositions(size)
    const on = kind !== 'sleep' && kind !== 'away'
    return (
      <>
        <Bed position={p.bed} />
        <Desk position={p.desk} rotationY={Math.PI / 2} width={1.1} />
        <Chair position={p.chair} rotationY={Math.PI / 2} />
        <Laptop position={p.deskTop(-0.02, 0.05)} rotationY={Math.PI / 2} on={on} />
        <DeskLamp position={p.deskTop(0.12, -0.4)} on={on} />
        {p.wide && <Vanity position={p.vanity} rotationY={Math.PI / 2} />}
        <Rug position={[0, 0, 0.3]} size={[Math.min(1.2, size.w - 0.6), 1.0]} color="#c9b7a2" />
      </>
    )
  },
  spots: basicSpots,
}
