import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ActivityKind, ROOMS } from '../data/rooms'
import { defaultLayout, fetchLayout, roomSize } from '../scene/rooms/layoutData'
import type { LayoutData, PlacedItem } from '../scene/rooms/types'
import { Dropdown } from './Dropdown'
import { RotateIcon } from './icons'
import { EditorScene } from './EditorScene'
import { type Entry, ENTRIES, type Tab, TABS } from './entries'
import { commitFiles, type GithubSettings, loadSettings, readFile, saveSettings } from './github'
import { KINDS } from './kinds'
import type { Placement } from './placement'
import { useThumbnails } from './Thumbnails'

const layoutPath = (roomId: string) => `public/data/layouts/${roomId}.json`
const round = (v: number) => Math.round(v * 100) / 100

/** 저장용 JSON: 숫자 반올림 + 아이템 한 줄에 하나 (git diff 보기 좋게) */
function serialize(layout: LayoutData) {
  const items = layout.items.map((it) =>
    JSON.stringify({ ...it, x: round(it.x), y: round(it.y), z: round(it.z), rot: round(it.rot) }),
  )
  return `{\n  "version": 1,\n  "wall": ${JSON.stringify(layout.wall)},\n  "floor": ${JSON.stringify(layout.floor)},\n  "items": [\n    ${items.join(',\n    ')}\n  ]\n}\n`
}

/**
 * 방꾸 에디터 (파니룸 스타일).
 * 위: 방 · 아래: 아이템 상자. 상자에서 고르고 → 방에 클릭해서 놓고 → 끌어서 옮기고 → 방향/빼기
 */
export function AdminApp() {
  const [roomId, setRoomId] = useState(ROOMS[0].id)
  const [layouts, setLayouts] = useState<Record<string, LayoutData>>({})
  const [saved, setSaved] = useState<Record<string, string>>({}) // 마지막으로 불러오거나 저장한 상태
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewKind, setPreviewKind] = useState<ActivityKind>('work')
  const [view, setView] = useState(0)
  const [placing, setPlacing] = useState<{ item: string; variant: string } | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<GithubSettings>(loadSettings)
  const [status, setStatus] = useState<{ text: string; error?: boolean; url?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const history = useRef<Record<string, LayoutData[]>>({})
  const { thumbs, baker } = useThumbnails()

  const room = ROOMS.find((r) => r.id === roomId)!
  const size = useMemo(() => roomSize(room), [room])
  const layout = layouts[roomId]
  const selected = layout?.items.find((it) => it.id === selectedId) ?? null
  const dirtyIds = Object.keys(layouts).filter((id) => serialize(layouts[id]) !== saved[id])

  // 방 불러오기: 토큰이 있으면 GitHub 최신 커밋에서, 없으면 배포된 파일에서. 둘 다 없으면 기본 원룸
  useEffect(() => {
    if (layouts[roomId]) return
    let alive = true
    ;(async () => {
      let data: LayoutData | null = null
      try {
        if (settings.token) {
          const text = await readFile(settings, layoutPath(roomId))
          data = text ? (JSON.parse(text) as LayoutData) : null
        } else {
          data = await fetchLayout(roomId)
        }
      } catch (e) {
        setStatus({ text: `불러오기 실패: ${(e as Error).message}`, error: true })
      }
      const loaded = data ?? defaultLayout(size)
      if (!alive) return
      setLayouts((prev) => ({ ...prev, [roomId]: loaded }))
      setSaved((prev) => ({ ...prev, [roomId]: data ? serialize(data) : '' }))
    })()
    return () => {
      alive = false
    }
  }, [roomId, layouts, settings, size])

  /** 되돌리기용으로 지금 상태를 쌓아둠 */
  const remember = useCallback(() => {
    if (!layout) return
    const stack = (history.current[roomId] ??= [])
    stack.push(layout)
    if (stack.length > 80) stack.shift()
  }, [layout, roomId])

  const update = useCallback(
    (fn: (l: LayoutData) => LayoutData, record = true) => {
      if (!layout) return
      if (record) remember()
      setLayouts((prev) => ({ ...prev, [roomId]: fn(prev[roomId]) }))
    },
    [layout, remember, roomId],
  )

  const patchItem = useCallback(
    (id: string, patch: Partial<PlacedItem>, record = true) =>
      update((l) => ({ ...l, items: l.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }), record),
    [update],
  )

  const undo = useCallback(() => {
    const prev = history.current[roomId]?.pop()
    if (prev) setLayouts((all) => ({ ...all, [roomId]: prev }))
  }, [roomId])

  /** 방에 클릭한 자리에 놓기. Shift+클릭이면 같은 걸 계속 놓음 */
  const placeItem = useCallback(
    (at: Placement, keepPlacing: boolean) => {
      if (!placing) return
      let n = 1
      while (layout?.items.some((it) => it.id === `${placing.item}-${n}`)) n++
      const placed: PlacedItem = { id: `${placing.item}-${n}`, item: placing.item, variant: placing.variant, rot: 0, ...at }
      update((l) => ({ ...l, items: [...l.items, placed] }))
      setSelectedId(placed.id)
      if (!keepPlacing) setPlacing(null)
    },
    [layout, placing, update],
  )

  const turnSelected = useCallback(() => {
    if (selected) patchItem(selected.id, { rot: (((selected.rot - 90) % 360) + 360) % 360 })
  }, [selected, patchItem])

  const removeSelected = useCallback(() => {
    if (!selectedId) return
    update((l) => ({ ...l, items: l.items.filter((it) => it.id !== selectedId) }))
    setSelectedId(null)
  }, [selectedId, update])

  /** 상자 칸 누르기: 물건은 놓기 모드, 벽지·바닥은 바로 바뀜 */
  const pick = (entry: Entry) => {
    setSelectedId(null)
    if (entry.kind === 'wall') update((l) => ({ ...l, wall: entry.color }))
    else if (entry.kind === 'floor') update((l) => ({ ...l, floor: entry.floor }))
    else {
      const same = placing?.item === entry.item && placing.variant === entry.variant
      setPlacing(same ? null : { item: entry.item, variant: entry.variant })
    }
  }

  const inUse = (entry: Entry) => {
    if (!layout) return false
    if (entry.kind === 'wall') return layout.wall === entry.color
    if (entry.kind === 'floor') return layout.floor === entry.floor
    return layout.items.some((it) => it.item === entry.item && (it.variant ?? '') === entry.variant)
  }

  // 단축키 (안내 없이 조용히): ⌘Z 되돌리기, R 방향, Delete 빼기, Esc 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      } else if (e.key === 'Escape') {
        setPlacing(null)
        setSelectedId(null)
      } else if (e.key === 'r' || e.key === 'R') {
        turnSelected()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, turnSelected, removeSelected])

  // 저장 안 한 채로 나가려 하면 경고
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirtyIds.length) e.preventDefault()
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirtyIds.length])

  const save = async () => {
    if (!settings.token) {
      setShowSettings(true)
      setStatus({ text: '토큰 없음', error: true })
      return
    }
    setSaving(true)
    setStatus({ text: '저장 중…' })
    try {
      const names = dirtyIds.map((id) => ROOMS.find((r) => r.id === id)?.name ?? id)
      const files = dirtyIds.map((id) => ({ path: layoutPath(id), content: serialize(layouts[id]) }))
      const url = await commitFiles(settings, files, `data(room): update ${names.join(', ')}`)
      setSaved((prev) => ({ ...prev, ...Object.fromEntries(files.map((f, i) => [dirtyIds[i], f.content])) }))
      setStatus({ text: '저장됨', url })
    } catch (e) {
      setStatus({ text: `저장 실패: ${(e as Error).message}`, error: true })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (patch: Partial<GithubSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const shown = ENTRIES.filter((e) => (tab === 'all' ? e.kind === 'object' : e.tab === tab))

  return (
    <div className="grid h-full grid-rows-[48px_minmax(0,1fr)_236px]">
      <header className="flex items-center gap-3 border-b border-line-soft bg-panel px-3">
        <Dropdown
          bold
          width={150}
          value={roomId}
          options={ROOMS.map((r) => ({ value: r.id, label: `${r.name}${dirtyIds.includes(r.id) ? ' •' : ''}` }))}
          onChange={(id) => {
            setRoomId(id)
            setSelectedId(null)
            setPlacing(null)
          }}
        />

        <div className="mx-auto flex items-center gap-1.5">
          <button className="tool-btn px-0" title="시점 왼쪽으로" onClick={() => setView((v) => (v + 3) % 4)}>
            <RotateIcon flip />
          </button>
          <button className="tool-btn px-0" title="시점 오른쪽으로" onClick={() => setView((v) => (v + 1) % 4)}>
            <RotateIcon />
          </button>
          <button className="tool-btn" onClick={undo}>
            되돌리기
          </button>
          <Dropdown
            width={110}
            value={previewKind}
            options={KINDS.map((k) => ({ value: k.kind, label: k.label }))}
            onChange={setPreviewKind}
          />
        </div>

        <div className="relative flex items-center gap-1.5">
          {status && (
            <span className={`text-xs ${status.error ? 'text-danger' : 'text-mute'}`}>
              {status.url ? (
                <a className="text-accent" href={status.url} target="_blank" rel="noreferrer">
                  {status.text}
                </a>
              ) : (
                status.text
              )}
            </span>
          )}
          <button
            className="h-[30px] cursor-pointer rounded-[3px] border border-[#7a2a2a] bg-[#5e1f22] px-3.5 font-bold text-white disabled:cursor-default disabled:border-line disabled:bg-raised disabled:text-[#6b707c]"
            disabled={saving || dirtyIds.length === 0}
            onClick={save}
          >
            미니룸 저장하기
          </button>
          <button className="tool-btn" onClick={() => setShowSettings((v) => !v)}>
            ⚙
          </button>
          {showSettings && (
            <div className="absolute top-[38px] right-0 z-30 flex w-[260px] flex-col gap-2 rounded border border-line bg-panel p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {(
                [
                  ['레포', 'repo', 'text'],
                  ['브랜치', 'branch', 'text'],
                  ['토큰', 'token', 'password'],
                ] as const
              ).map(([label, key, type]) => (
                <label key={key} className="grid grid-cols-[48px_1fr] items-center text-mute">
                  {label}
                  <input
                    className="field-input min-w-0 text-text"
                    type={type}
                    value={settings[key]}
                    onChange={(e) => updateSettings({ [key]: e.target.value.trim() })}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="relative min-h-0 min-w-0 overflow-hidden">
        {layout && (
          <EditorScene
            size={size}
            layout={layout}
            selectedId={selectedId}
            previewKind={previewKind}
            view={view}
            placing={placing}
            onPlace={placeItem}
            onSelect={(id) => {
              setSelectedId(id)
              if (id) setPlacing(null)
            }}
            onDragStart={remember}
            onMove={(id, patch) => patchItem(id, patch, false)}
            onTurn={turnSelected}
            onRemove={removeSelected}
          />
        )}
      </main>

      <section className="flex min-h-0 flex-col border-t border-line-soft bg-panel">
        <nav className="flex gap-0.5 border-b border-line px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`-mb-px cursor-pointer rounded-t border border-b-0 px-4 py-1.5 font-bold ${
                tab === t.id ? 'border-line bg-raised text-white' : 'border-transparent text-mute'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="grid grid-cols-[repeat(auto-fill,96px)] gap-2.5 overflow-y-auto p-3">
          {shown.map((entry) => {
            const active = placing && entry.kind === 'object' && placing.item === entry.item && placing.variant === entry.variant
            return (
              <button key={entry.key} className="group flex cursor-pointer flex-col items-center gap-1" onClick={() => pick(entry)}>
                <span
                  className={`relative block size-24 overflow-hidden rounded bg-[#e9e7e2] ${
                    active ? 'border-2 border-accent' : 'border border-line group-hover:border-[#6b7180]'
                  }`}
                >
                  {thumbs[entry.key] && <img className="size-full object-cover" src={thumbs[entry.key]} alt="" />}
                  {inUse(entry) && (
                    <em className="absolute inset-x-0 bottom-1.5 text-center text-xs font-extrabold text-[#c0392b] not-italic [text-shadow:0_0_3px_#fff,0_0_3px_#fff]">
                      사용중
                    </em>
                  )}
                </span>
                <span className="w-24 truncate text-center text-xs">{entry.name}</span>
              </button>
            )
          })}
        </div>
      </section>
      {baker}
    </div>
  )
}
