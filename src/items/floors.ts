import { canvasTexture, repeating } from '../lib/canvasTexture'

/** 바닥 종류. 128px 한 장을 방 바닥에 2x2로 반복 */
export const FLOORS: Record<string, { name: string; draw: (ctx: CanvasRenderingContext2D) => void }> = {
  wood: {
    name: '나무',
    draw: (ctx) => {
      ctx.fillStyle = '#b48a62'
      ctx.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#a97f58' : '#bb926a'
        ctx.fillRect(0, i * 16, 128, 15)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      for (let i = 0; i < 8; i++) ctx.fillRect((i * 53) % 128, i * 16, 2, 15)
    },
  },
  tile: {
    name: '타일',
    draw: (ctx) => {
      ctx.fillStyle = '#c9c7c1'
      ctx.fillRect(0, 0, 128, 128)
      ctx.fillStyle = '#b3b1aa'
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) ctx.fillRect(x * 32, y * 32, 32, 32)
      ctx.strokeStyle = '#8f8d87'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 32, 0)
        ctx.lineTo(i * 32, 128)
        ctx.moveTo(0, i * 32)
        ctx.lineTo(128, i * 32)
        ctx.stroke()
      }
    },
  },
  carpet: {
    name: '카펫',
    draw: (ctx) => {
      ctx.fillStyle = '#5a2a2e'
      ctx.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,220,220'},${Math.random() * 0.08})`
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2)
      }
    },
  },
  concrete: {
    name: '콘크리트',
    draw: (ctx) => {
      ctx.fillStyle = '#8a8c8f'
      ctx.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.07})`
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2)
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.moveTo(10, 90)
      ctx.lineTo(40, 70)
      ctx.lineTo(55, 78)
      ctx.stroke()
    },
  },
  soil: {
    name: '코코피트 흙',
    draw: (ctx) => {
      ctx.fillStyle = '#3b271b'
      ctx.fillRect(0, 0, 128, 128)
      // 알갱이
      for (let i = 0; i < 1600; i++) {
        const v = Math.random()
        ctx.fillStyle = v < 0.5 ? 'rgba(20,12,8,0.5)' : v < 0.85 ? 'rgba(92,62,40,0.5)' : 'rgba(140,100,64,0.45)'
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2)
      }
      // 코코넛 섬유
      ctx.strokeStyle = 'rgba(150,110,70,0.55)'
      ctx.lineWidth = 0.8
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * 128
        const y = Math.random() * 128
        const a = Math.random() * Math.PI
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14)
        ctx.stroke()
      }
    },
  },
}

const cache = new Map<string, ReturnType<typeof canvasTexture>>()

export function floorTexture(kind: string) {
  const key = FLOORS[kind] ? kind : 'wood'
  if (!cache.has(key)) cache.set(key, repeating(canvasTexture(128, 128, FLOORS[key].draw), 2, 2))
  return cache.get(key)!
}
