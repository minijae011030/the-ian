import { useRef, useState } from 'react'

const round = (v: number) => Number(v.toFixed(2))

/**
 * 숫자 칸. 왼쪽 글자(X·Y·Z)를 좌우로 끌면 값이 바뀜 (Figma처럼).
 * - 끌기: 4px당 0.05, Shift 누르면 0.25씩
 * - 칸 안에서 ↑↓: 0.05씩, Shift면 0.25씩
 * - 직접 입력도 됨 (Enter나 칸 밖 클릭으로 확정)
 */
export function ScrubInput({
  label,
  color,
  value,
  onChange,
  onScrubStart,
}: {
  label: string
  color: string
  value: number
  /** record=false면 되돌리기 기록 안 남김 (끄는 동안 매 픽셀마다 쌓이지 않게) */
  onChange: (value: number, record: boolean) => void
  onScrubStart: () => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const scrub = useRef<{ startX: number; startValue: number } | null>(null)

  const commit = () => {
    if (draft === null) return
    const v = Number(draft)
    if (Number.isFinite(v)) onChange(round(v), true)
    setDraft(null)
  }

  return (
    <div className="scrub">
      <span
        className="scrub-label"
        style={{ color }}
        onPointerDown={(e) => {
          e.preventDefault()
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          scrub.current = { startX: e.clientX, startValue: value }
          onScrubStart()
        }}
        onPointerMove={(e) => {
          if (!scrub.current) return
          const steps = Math.round((e.clientX - scrub.current.startX) / 4)
          onChange(round(scrub.current.startValue + steps * (e.shiftKey ? 0.25 : 0.05)), false)
        }}
        onPointerUp={() => (scrub.current = null)}
      >
        {label}
      </span>
      <input
        inputMode="decimal"
        value={draft ?? value.toFixed(2)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setDraft(null)
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const step = (e.shiftKey ? 0.25 : 0.05) * (e.key === 'ArrowUp' ? 1 : -1)
            setDraft(null)
            onChange(round(value + step), true)
          }
        }}
      />
    </div>
  )
}
