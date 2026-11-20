import { CATALOG, VARIANT_INFO } from '../items/catalog'
import type { PlacedItem, RoomSize } from '../scene/rooms/types'
import { KINDS } from './kinds'
import { ScrubInput } from './ScrubInput'

const STEP = 0.1
const round = (v: number) => Number(v.toFixed(2))
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const AXES = [
  { key: 'x', color: '#ff6b6b' },
  { key: 'y', color: '#7bd88f' },
  { key: 'z', color: '#6ba8ff' },
] as const

/**
 * 고른 아이템 고치는 패널. 누구나 쓸 수 있게 버튼 위주로:
 * 색 고르기 → 화살표로 옮기기 → 돌리기 → 언제 보일지 → 복사/치우기.
 * 숫자로 정확히 넣는 건 맨 아래 "숫자로 정확하게"에 접어둠
 */
export function ItemInspector({
  item,
  size,
  onChange,
  onScrubStart,
  onDuplicate,
  onRemove,
}: {
  item: PlacedItem
  size: RoomSize
  onChange: (patch: Partial<PlacedItem>, record?: boolean) => void
  onScrubStart: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const def = CATALOG[item.item]
  const rot = ((Math.round(item.rot) % 360) + 360) % 360
  const onWall = def?.place === 'wall'
  const canLift = def?.place !== 'floor'

  /** 방 기준 이동. 벽에 붙은 건 그 벽을 따라 옆으로만 */
  const move = (dir: 'left' | 'right' | 'back' | 'front' | 'up' | 'down') => {
    const sideAxis = onWall && (rot === 90 || rot === 270) ? 'z' : 'x'
    // 왼벽(90)은 벽을 보고 섰을 때 오른쪽이 -z, 오른벽(270)은 +z
    const sideSign = onWall && rot === 90 ? -1 : 1
    const patch: Partial<PlacedItem> = {}
    if (dir === 'left' || dir === 'right') {
      const delta = (dir === 'right' ? STEP : -STEP) * sideSign
      const limit = sideAxis === 'x' ? size.w / 2 : size.d / 2
      patch[sideAxis] = round(clamp(item[sideAxis] + delta, -limit, limit))
    }
    if (dir === 'back' || dir === 'front') patch.z = round(clamp(item.z + (dir === 'front' ? STEP : -STEP), -size.d / 2, size.d / 2))
    if (dir === 'up' || dir === 'down') patch.y = round(clamp(item.y + (dir === 'up' ? STEP : -STEP), 0, size.h))
    onChange(patch)
  }

  const turn = (deg: number) => onChange({ rot: (((rot + deg) % 360) + 360) % 360 })

  const visibleAlways = !item.when
  const toggleKind = (kind: (typeof KINDS)[number]['kind']) => {
    const all = KINDS.map((k) => k.kind)
    const current = item.when ?? all
    const next = current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]
    onChange({ when: next.length === all.length || next.length === 0 ? undefined : next })
  }

  return (
    <div className="inspector">
      <h2>{def?.name ?? item.item}</h2>

      {def && def.variants.length > 1 && (
        <section>
          <p className="q">어떤 걸로 할까?</p>
          <div className="choices">
            {def.variants.map((v) => {
              const info = VARIANT_INFO[v]
              const active = (item.variant ?? def.variants[0]) === v
              return (
                <button key={v} className={active ? 'active' : ''} onClick={() => onChange({ variant: v })}>
                  {info?.color && <span className="swatch" style={{ background: info.color }} />}
                  {info?.name ?? v}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <p className="q">옮기기</p>
        <div className="pad">
          {!onWall && (
            <button className="pad-up" onClick={() => move('back')} title="방 안쪽으로">
              ↑<small>안쪽</small>
            </button>
          )}
          <button className="pad-left" onClick={() => move('left')}>
            ←<small>왼쪽</small>
          </button>
          <button className="pad-right" onClick={() => move('right')}>
            →<small>오른쪽</small>
          </button>
          {!onWall && (
            <button className="pad-down" onClick={() => move('front')} title="창가 쪽으로">
              ↓<small>창가</small>
            </button>
          )}
        </div>
        {canLift && (
          <div className="row2">
            <button onClick={() => move('up')}>▲ 올리기</button>
            <button onClick={() => move('down')}>▼ 내리기</button>
          </div>
        )}
        <p className="tip">방에서 직접 끌어도 돼. 키보드 방향키로도 움직여.</p>
      </section>

      {!onWall && (
        <section>
          <p className="q">돌리기</p>
          <div className="row2">
            <button onClick={() => turn(90)}>↺ 왼쪽으로</button>
            <button onClick={() => turn(-90)}>오른쪽으로 ↻</button>
          </div>
        </section>
      )}

      <section>
        <p className="q">언제 보일까?</p>
        <div className="choices">
          <button className={visibleAlways ? 'active' : ''} onClick={() => onChange({ when: undefined })}>
            항상
          </button>
          {KINDS.map(({ kind, label }) => (
            <button
              key={kind}
              className={!visibleAlways && item.when!.includes(kind) ? 'active' : ''}
              onClick={() => toggleKind(kind)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="tip">예) 밥그릇은 '밥'만 켜두면 밥 먹을 때만 나와.</p>
      </section>

      <div className="row2">
        <button onClick={onDuplicate}>⧉ 하나 더</button>
        <button className="danger" onClick={onRemove}>
          🗑 치우기
        </button>
      </div>

      <details className="advanced">
        <summary>숫자로 정확하게</summary>
        <div className="xyz">
          {AXES.map(({ key, color }) => (
            <ScrubInput
              key={key}
              label={key.toUpperCase()}
              color={color}
              value={item[key]}
              onChange={(v, record) => onChange({ [key]: v }, record)}
              onScrubStart={onScrubStart}
            />
          ))}
        </div>
        <p className="tip">
          X 왼↔오른 · Y 높이 · Z 안쪽↔창가. 글자를 좌우로 끌어도 바뀌어. 회전 {rot}° · 이름 {item.id}
        </p>
      </details>
    </div>
  )
}
