import { ROAD } from '../layout'

/**
 * 신호 체계. 모든 교차로가 같은 주기로 돎 (단순하게).
 *   x축 도로 초록 → 노랑 → 전체 빨강 → z축 도로 초록 → 노랑 → 전체 빨강
 * 보행자는 같은 방향으로 가는 차가 초록일 때 건넘
 * (x축 방향으로 걷는다 = 세로(z축) 도로를 건넌다 = x축 차가 달릴 때)
 */
export const CYCLE = { green: 14, yellow: 3, allRed: 1.5 }
const HALF = CYCLE.green + CYCLE.yellow + CYCLE.allRed
const PERIOD = HALF * 2
/** 보행 신호는 초록 끝나기 몇 초 전에 끊음 (건너는 중에 빨강 안 되게) */
const WALK_CUTOFF = 4

export type Axis = 'x' | 'z'
export type Light = 'green' | 'yellow' | 'red'

export const signalClock = { t: 0 }

export function lightFor(axis: Axis, t = signalClock.t): Light {
  const phase = ((t % PERIOD) + PERIOD) % PERIOD
  const local = axis === 'x' ? phase : (phase + HALF) % PERIOD
  if (local < CYCLE.green) return 'green'
  if (local < CYCLE.green + CYCLE.yellow) return 'yellow'
  return 'red'
}

/** 그 축 방향으로 걷는 보행자가 지금 출발해도 되는지 */
export function canWalk(axis: Axis, t = signalClock.t) {
  const phase = ((t % PERIOD) + PERIOD) % PERIOD
  const local = axis === 'x' ? phase : (phase + HALF) % PERIOD
  return local < CYCLE.green - WALK_CUTOFF
}

/**
 * 교차로 주변 치수 (교차로 중심 기준 거리)
 *   |← 교차로 →| 횡단보도 |  정지선
 *   0 ─── 4.5 ── 4.6~6.6 ── 7.2
 */
export const CROSSWALK = { from: ROAD.width / 2 + 0.1, to: ROAD.width / 2 + 2.1 }
export const STOP_LINE = CROSSWALK.to + 0.6
