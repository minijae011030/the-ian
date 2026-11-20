import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ActivityKind, ROOMS } from '../data/rooms'
import { defaultLayout, fetchLayout, roomSize } from '../scene/rooms/layoutData'
import type { LayoutData, PlacedItem } from '../scene/rooms/types'
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
    <div className="admin">
      <header className="topbar">
        <div className="room-picker">
          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value)
              setSelectedId(null)
              setPlacing(null)
            }}
          >
            {ROOMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {dirtyIds.includes(r.id) ? ' •' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="tools">
          <button onClick={() => setView((v) => (v + 3) % 4)}>⟲</button>
          <button onClick={() => setView((v) => (v + 1) % 4)}>⟳</button>
          <button onClick={undo}>되돌리기</button>
          <select value={previewKind} onChange={(e) => setPreviewKind(e.target.value as ActivityKind)}>
            {KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        <div className="save-area">
          {status && (
            <span className={`status ${status.error ? 'error' : ''}`}>
              {status.url ? (
                <a href={status.url} target="_blank" rel="noreferrer">
                  {status.text}
                </a>
              ) : (
                status.text
              )}
            </span>
          )}
          <button className="save" disabled={saving || dirtyIds.length === 0} onClick={save}>
            미니룸 저장하기
          </button>
          <button className="gear" onClick={() => setShowSettings((v) => !v)}>
            ⚙
          </button>
          {showSettings && (
            <div className="settings">
              <label>
                레포
                <input value={settings.repo} onChange={(e) => updateSettings({ repo: e.target.value.trim() })} />
              </label>
              <label>
                브랜치
                <input value={settings.branch} onChange={(e) => updateSettings({ branch: e.target.value.trim() })} />
              </label>
              <label>
                토큰
                <input
                  type="password"
                  value={settings.token}
                  onChange={(e) => updateSettings({ token: e.target.value.trim() })}
                />
              </label>
            </div>
          )}
        </div>
      </header>

      <main className="stage">
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

      <section className="itembox">
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="grid">
          {shown.map((entry) => {
            const active = placing && entry.kind === 'object' && placing.item === entry.item && placing.variant === entry.variant
            return (
              <button key={entry.key} className={`cell ${active ? 'active' : ''}`} onClick={() => pick(entry)}>
                <span className="thumb">
                  {thumbs[entry.key] ? <img src={thumbs[entry.key]} alt="" /> : null}
                  {inUse(entry) && <em>사용중</em>}
                </span>
                <span className="name">{entry.name}</span>
              </button>
            )
          })}
        </div>
      </section>
      {baker}
    </div>
  )
}
