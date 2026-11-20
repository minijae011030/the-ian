import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ActivityKind, ROOMS } from '../data/rooms'
import { CATALOG, type ItemDef } from '../items/catalog'
import { FLOORS } from '../items/floors'
import { defaultLayout, fetchLayout, roomSize } from '../scene/rooms/layoutData'
import type { LayoutData, PlacedItem } from '../scene/rooms/types'
import { EditorScene } from './EditorScene'
import type { Placement } from './placement'
import { commitFiles, type GithubSettings, loadSettings, readFile, saveSettings } from './github'

const KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: 'work', label: '작업' },
  { kind: 'study', label: '공부' },
  { kind: 'eat', label: '식사' },
  { kind: 'rest', label: '휴식' },
  { kind: 'skincare', label: '스킨케어' },
  { kind: 'sleep', label: '잠' },
  { kind: 'exercise', label: '운동' },
  { kind: 'away', label: '외출' },
]

const CATEGORY_LABEL: Record<ItemDef['category'], string> = {
  furniture: '가구',
  decor: '꾸미기',
  small: '소품',
  wall: '벽',
}

const layoutPath = (roomId: string) => `public/data/layouts/${roomId}.json`
const round = (v: number) => Math.round(v * 100) / 100

/** 저장용 JSON: 숫자 반올림 + 아이템 한 줄에 하나 (git diff 보기 좋게) */
function serialize(layout: LayoutData) {
  const items = layout.items.map((it) =>
    JSON.stringify({ ...it, x: round(it.x), y: round(it.y), z: round(it.z), rot: round(it.rot) }),
  )
  return `{\n  "version": 1,\n  "wall": ${JSON.stringify(layout.wall)},\n  "floor": ${JSON.stringify(layout.floor)},\n  "items": [\n    ${items.join(',\n    ')}\n  ]\n}\n`
}

/** 방꾸 에디터. 방 고르기 → 아이템 놓고 옮기기 → 저장(GitHub 커밋) */
export function AdminApp() {
  const [roomId, setRoomId] = useState(ROOMS[0].id)
  const [layouts, setLayouts] = useState<Record<string, LayoutData>>({})
  const [saved, setSaved] = useState<Record<string, string>>({}) // 마지막으로 불러오거나 저장한 상태
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewKind, setPreviewKind] = useState<ActivityKind>('work')
  const [view, setView] = useState(0)
  const [placing, setPlacing] = useState<string | null>(null)
  const [settings, setSettings] = useState<GithubSettings>(loadSettings)
  const [status, setStatus] = useState<{ text: string; error?: boolean; url?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const history = useRef<Record<string, LayoutData[]>>({})

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

  const uniqueId = (base: string) => {
    let n = 1
    while (layout?.items.some((it) => it.id === `${base}-${n}`)) n++
    return `${base}-${n}`
  }

  /** 놓기 모드에서 클릭한 자리에 아이템 추가. Shift 누른 채 클릭하면 같은 걸 계속 놓을 수 있음 */
  const placeItem = useCallback(
    (itemId: string, at: Placement, keepPlacing: boolean) => {
      const def = CATALOG[itemId]
      let n = 1
      while (layout?.items.some((it) => it.id === `${itemId}-${n}`)) n++
      const placed: PlacedItem = { id: `${itemId}-${n}`, item: itemId, rot: 0, ...at, variant: def.variants[0] }
      update((l) => ({ ...l, items: [...l.items, placed] }))
      setSelectedId(placed.id)
      if (!keepPlacing) setPlacing(null)
    },
    [layout, update],
  )

  const removeSelected = useCallback(() => {
    if (!selectedId) return
    update((l) => ({ ...l, items: l.items.filter((it) => it.id !== selectedId) }))
    setSelectedId(null)
  }, [selectedId, update])

  // 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.key === 'Escape') {
        setPlacing(null)
        setSelectedId(null)
        return
      }
      if (!selected) return
      const step = e.shiftKey ? 0.25 : 0.05
      const nudge: Record<string, Partial<PlacedItem>> = {
        ArrowLeft: { x: round(selected.x - step) },
        ArrowRight: { x: round(selected.x + step) },
        ArrowUp: { z: round(selected.z - step) },
        ArrowDown: { z: round(selected.z + step) },
      }
      if (nudge[e.key]) {
        e.preventDefault()
        patchItem(selected.id, nudge[e.key])
      } else if (e.key === 'r' || e.key === 'R') {
        patchItem(selected.id, { rot: (((selected.rot + (e.shiftKey ? -90 : 90)) % 360) + 360) % 360 })
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeSelected()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const copy = { ...selected, id: uniqueId(selected.item), x: round(selected.x + 0.2) }
        update((l) => ({ ...l, items: [...l.items, copy] }))
        setSelectedId(copy.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
      setStatus({ text: '저장하려면 GitHub 토큰을 넣어줘', error: true })
      return
    }
    setSaving(true)
    setStatus({ text: '커밋하는 중…' })
    try {
      const names = dirtyIds.map((id) => ROOMS.find((r) => r.id === id)?.name ?? id)
      const files = dirtyIds.map((id) => ({ path: layoutPath(id), content: serialize(layouts[id]) }))
      const url = await commitFiles(settings, files, `data(room): update ${names.join(', ')}`)
      setSaved((prev) => ({ ...prev, ...Object.fromEntries(files.map((f, i) => [dirtyIds[i], f.content])) }))
      setStatus({ text: '저장 완료. 1~2분 뒤 사이트에 반영돼.', url })
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

  const byCategory = Object.entries(CATALOG).reduce<Record<string, [string, ItemDef][]>>((acc, entry) => {
    ;(acc[entry[1].category] ??= []).push(entry)
    return acc
  }, {})

  return (
    <div className="admin">
      <aside className="panel">
        <h2>방</h2>
        <div className="list">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              className={`${r.id === roomId ? 'active' : ''} ${dirtyIds.includes(r.id) ? 'dirty' : ''}`}
              onClick={() => {
                setRoomId(r.id)
                setSelectedId(null)
              }}
            >
              {r.name} <span style={{ opacity: 0.5 }}>· {r.floor}층 {r.bays}칸</span>
            </button>
          ))}
        </div>

        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category}>
            <h2>{CATEGORY_LABEL[category as ItemDef['category']]}</h2>
            <div className="chips">
              {items.map(([id, def]) => (
                <button
                  key={id}
                  className={placing === id ? 'active' : ''}
                  onClick={() => setPlacing(placing === id ? null : id)}
                  disabled={!layout}
                >
                  {def.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

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
            onSelect={setSelectedId}
            onDragStart={remember}
            onMove={(id, patch) => patchItem(id, patch, false)}
          />
        )}
        <div className="toolbar">
          <button onClick={() => setView((v) => (v + 3) % 4)}>⟲ 시점</button>
          <button onClick={() => setView((v) => (v + 1) % 4)}>시점 ⟳</button>
          <button onClick={undo}>되돌리기</button>
        </div>
        <div className="keys">
          {placing ? '클릭해서 놓기 · Shift+클릭 여러 개 · Esc 취소 · ' : ''}드래그 이동 · R 회전 · 방향키 미세조정(Shift 크게) · ⌘D 복제 · Delete 삭제 · ⌘Z 되돌리기 · 오른쪽 드래그 화면 이동
        </div>
      </main>

      <aside className="panel right">
        {selected ? (
          <ItemInspector
            item={selected}
            onChange={(patch) => patchItem(selected.id, patch)}
            onRemove={removeSelected}
          />
        ) : (
          <p className="hint">아이템을 클릭하면 여기서 고칠 수 있어.</p>
        )}

        <h2>방 설정</h2>
        {layout && (
          <div className="field">
            <label>벽 색</label>
            <input type="color" value={layout.wall} onChange={(e) => update((l) => ({ ...l, wall: e.target.value }))} />
          </div>
        )}
        {layout && (
          <div className="field">
            <label>바닥</label>
            <select value={layout.floor} onChange={(e) => update((l) => ({ ...l, floor: e.target.value }))}>
              {Object.entries(FLOORS).map(([id, f]) => (
                <option key={id} value={id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <h2>미리보기</h2>
        <div className="field">
          <label>하는 일</label>
          <select value={previewKind} onChange={(e) => setPreviewKind(e.target.value as ActivityKind)}>
            {KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <p className="hint">캐릭터는 그 일을 할 수 있는 가구(침대·의자·화장대…)로 자동으로 가.</p>

        <h2>저장</h2>
        <div className="field">
          <label>레포</label>
          <input value={settings.repo} onChange={(e) => updateSettings({ repo: e.target.value.trim() })} />
        </div>
        <div className="field">
          <label>브랜치</label>
          <input value={settings.branch} onChange={(e) => updateSettings({ branch: e.target.value.trim() })} />
        </div>
        <div className="field">
          <label>토큰</label>
          <input
            type="password"
            placeholder="github_pat_…"
            value={settings.token}
            onChange={(e) => updateSettings({ token: e.target.value.trim() })}
          />
        </div>
        <button className="btn primary" disabled={saving || dirtyIds.length === 0} onClick={save}>
          {dirtyIds.length ? `저장 (${dirtyIds.length}개 방 커밋)` : '바뀐 거 없음'}
        </button>
        {layout && (
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(serialize(layout))}>
            이 방 JSON 복사
          </button>
        )}
        {status && (
          <p className={`status ${status.error ? 'error' : ''}`}>
            {status.text}{' '}
            {status.url && (
              <a href={status.url} target="_blank" rel="noreferrer">
                커밋 보기
              </a>
            )}
          </p>
        )}
        <p className="hint">토큰은 이 브라우저에만 저장돼. 이 레포 Contents 쓰기 권한만 준 fine-grained 토큰을 써.</p>
      </aside>
    </div>
  )
}

function ItemInspector({
  item,
  onChange,
  onRemove,
}: {
  item: PlacedItem
  onChange: (patch: Partial<PlacedItem>) => void
  onRemove: () => void
}) {
  const def = CATALOG[item.item]
  const num = (key: 'x' | 'y' | 'z' | 'rot') => (
    <input
      type="number"
      step={key === 'rot' ? 90 : 0.05}
      value={item[key]}
      title={key}
      onChange={(e) => onChange({ [key]: Number(e.target.value) })}
    />
  )
  return (
    <>
      <h2>{def?.name ?? item.item}</h2>
      <div className="field">
        <label>이름</label>
        <input value={item.id} readOnly />
      </div>
      {def && def.variants.length > 1 && (
        <div className="field">
          <label>종류</label>
          <select value={item.variant ?? def.variants[0]} onChange={(e) => onChange({ variant: e.target.value })}>
            {def.variants.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label>
          x · y
          <br />z · 회전
        </label>
        <div className="xyz">
          {num('x')}
          {num('y')}
          {num('z')}
          {num('rot')}
        </div>
      </div>
      <div className="field">
        <label>보일 때</label>
        <div className="checks">
          {KINDS.map(({ kind, label }) => (
            <label key={kind}>
              <input
                type="checkbox"
                checked={!item.when || item.when.includes(kind)}
                onChange={(e) => {
                  const all = KINDS.map((k) => k.kind)
                  const current = item.when ?? all
                  const next = e.target.checked ? [...current, kind] : current.filter((k) => k !== kind)
                  onChange({ when: next.length === all.length ? undefined : next })
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <button className="btn ghost" onClick={onRemove}>
        삭제
      </button>
    </>
  )
}
