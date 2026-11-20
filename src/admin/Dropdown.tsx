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
    <div className="relative" ref={ref} style={{ width }}>
      <button
        className={`flex h-[30px] w-full cursor-pointer items-center justify-between gap-2 rounded-[3px] border border-line bg-ink px-2.5 leading-none ${bold ? 'font-bold' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.label}</span>
        <svg className="flex-none text-mute" width="10" height="6" viewBox="0 0 10 6" aria-hidden>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="absolute top-[34px] left-0 z-40 min-w-full rounded-[3px] border border-line bg-panel p-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {options.map((o) => (
            <li key={o.value}>
              <button
                className={`w-full cursor-pointer rounded-[2px] px-2.5 py-[7px] text-left whitespace-nowrap hover:bg-hover ${
                  o.value === value ? 'font-bold text-accent' : ''
                }`}
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
