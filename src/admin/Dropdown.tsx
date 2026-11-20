import { useEffect, useRef, useState } from 'react'

/** 직접 만든 드롭다운. 기본 select는 맥에서 글자·화살표 정렬이 제멋대로라 씀 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  bold = false,
  width,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  bold?: boolean
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="dropdown" ref={ref} style={{ width }}>
      <button className={`dd-button ${bold ? 'bold' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span>{current?.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="dd-list">
          {options.map((o) => (
            <li key={o.value}>
              <button
                className={o.value === value ? 'active' : ''}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
