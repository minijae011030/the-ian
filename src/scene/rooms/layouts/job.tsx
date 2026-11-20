import { Bed, BookStack, Bowl, Chair, ClothesRack, Desk, DeskLamp, Laptop, Plant, Rug, Vanity, WallPicture } from '../furniture'
import type { RoomLayout } from '../types'
import { basicPositions, basicSpots } from './default'

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

/** 노트북 화면: 쓰다 만 자소서 */
function drawCoverLetter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1d3f95'
  ctx.fillRect(0, 0, 256, 18)
  ctx.fillStyle = '#fff'
  ctx.font = `600 11px ${FONT}`
  ctx.fillText('자기소개서_최종_진짜최종.docx', 8, 13)
  ctx.fillStyle = '#222'
  ctx.font = `700 13px ${FONT}`
  ctx.fillText('1. 지원동기 및 입사 후 포부', 12, 40)
  ctx.fillStyle = '#9aa0aa'
  for (let i = 0; i < 7; i++) ctx.fillRect(12, 54 + i * 13, 150 + ((i * 37) % 80), 5)
  ctx.fillStyle = '#1d3f95'
  ctx.fillRect(12 + 150 + 30, 54 + 6 * 13 - 3, 2, 11) // 커서
}

/** 벽 달력: 면접 날 동그라미 */
function drawCalendar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fbfaf7'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(0, 0, w, h * 0.2)
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${h * 0.12}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('NOVEMBER', w / 2, h * 0.14)
  ctx.fillStyle = '#555'
  const cw = w / 7
  const ch = (h * 0.75) / 5
  ctx.font = `500 ${ch * 0.42}px ${FONT}`
  for (let d = 1; d <= 30; d++) {
    const i = d + 5 // 11월 1일이 토요일 칸
    const x = (i % 7) * cw + cw / 2
    const y = h * 0.25 + Math.floor(i / 7) * ch + ch * 0.55
    if (y > h) continue
    ctx.fillText(String(d), x, y)
    if (d === 25) {
      ctx.strokeStyle = '#c0392b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y - ch * 0.15, ch * 0.42, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/** 포스트잇 보드 */
function drawPostIts(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#c8a77a'
  ctx.fillRect(0, 0, w, h)
  const notes: [string, string][] = [
    ['#fff3a8', 'NCS'],
    ['#ffc9de', '자소서'],
    ['#bfe8ff', '면접'],
    ['#c9f2c0', '금감원'],
    ['#ffd8a8', '장학재단'],
  ]
  ctx.font = `700 ${h * 0.11}px ${FONT}`
  ctx.textAlign = 'center'
  notes.forEach(([color, text], i) => {
    const x = (i % 3) * (w / 3) + w * 0.04
    const y = Math.floor(i / 3) * (h / 2) + h * 0.07
    ctx.fillStyle = color
    ctx.fillRect(x, y, w / 3 - w * 0.08, h / 2 - h * 0.14)
    ctx.fillStyle = '#333'
    ctx.fillText(text, x + (w / 3 - w * 0.08) / 2, y + h * 0.22)
  })
}

/**
 * 취준방. 오른쪽 벽 책상에서 자소서·NCS, 안쪽 벽엔 면접 날 동그라미 친 달력과 포스트잇,
 * 행거엔 면접 정장, 창가엔 화장대
 */
export const jobLayout: RoomLayout = {
  Furniture: ({ size, kind }) => {
    const { w, d, h } = size
    const p = basicPositions(size)
    const on = kind !== 'sleep' && kind !== 'away'
    return (
      <>
        <Bed position={p.bed} blanket="#d7c4e8" />
        <Desk position={p.desk} rotationY={Math.PI / 2} width={1.3} />
        <Chair position={p.chair} rotationY={Math.PI / 2} color="#3f4655" />
        <Laptop position={p.deskTop(-0.02, 0.05)} rotationY={Math.PI / 2} draw={drawCoverLetter} on={on} />
        <DeskLamp position={p.deskTop(0.12, -0.5)} on={on} />
        <BookStack position={p.deskTop(0.05, 0.48)} rotationY={Math.PI / 2} colors={['#2c5e9e', '#e0a43a', '#2c5e9e', '#7f8c8d', '#c0392b']} />
        {kind === 'eat' && <Bowl position={p.deskTop(-0.12, -0.25)} />}

        <ClothesRack position={[w / 2 - 0.5, 0, -d / 2 + 0.3]} clothes={['#1f2633', '#1f2633', '#f5f5f5', '#8b9bb4']} />
        <Vanity position={p.vanity} rotationY={Math.PI / 2} />
        <Plant position={[w / 2 - 0.25, 0, d / 2 - 0.3]} />
        <Rug position={[-0.1, 0, 0.35]} size={[1.1, 1.0]} color="#d9cbb8" />

        {/* 안쪽 벽: 달력 + 포스트잇 보드 */}
        <WallPicture position={[-0.05, h * 0.62, -d / 2 + 0.01]} size={[0.42, 0.5]} draw={drawCalendar} />
        <WallPicture position={[0.6, h * 0.6, -d / 2 + 0.01]} size={[0.75, 0.4]} draw={drawPostIts} />
      </>
    )
  },
  spots: basicSpots,
}
