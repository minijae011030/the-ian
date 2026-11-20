import { Color } from 'three'

/**
 * 시간대별 하늘·조명·도시 상태. 키프레임 사이를 선형으로 보간함.
 * - darkness: 0(한낮) ~ 1(한밤). 가로등·차 불빛·별·창문 밝기에 씀
 * - cityLit: 주변 건물 창 중 불 켜진 비율 배수
 * - traffic: 차량 밀도 0~1 (출퇴근 피크, 새벽 거의 없음)
 * - pedestrians: 보행자 밀도 0~1 (점심·퇴근길 북적, 새벽 몇 명)
 */
type Keyframe = {
  hour: number
  top: string
  horizon: string
  light: number
  darkness: number
}

const SKY: Keyframe[] = [
  { hour: 0, top: '#050a1c', horizon: '#16234a', light: 0.55, darkness: 1 },
  { hour: 4.6, top: '#070d24', horizon: '#1a2a55', light: 0.55, darkness: 1 },
  { hour: 5.6, top: '#1b2f6b', horizon: '#e0977c', light: 0.9, darkness: 0.7 },
  { hour: 6.6, top: '#4f7fd0', horizon: '#f2c29a', light: 1.6, darkness: 0.3 },
  { hour: 8, top: '#5a9ae8', horizon: '#c4dcf5', light: 2.6, darkness: 0 },
  { hour: 16.6, top: '#5a9ae8', horizon: '#c4dcf5', light: 2.6, darkness: 0 },
  { hour: 17.5, top: '#3c62b8', horizon: '#f0a070', light: 2, darkness: 0.2 },
  { hour: 18.4, top: '#1d3f95', horizon: '#8aa8de', light: 1.7, darkness: 0.5 },
  { hour: 19.2, top: '#123a8c', horizon: '#6d93d6', light: 1.5, darkness: 0.65 }, // 사진 속 블루아워
  { hour: 20.5, top: '#0a1838', horizon: '#24386a', light: 0.8, darkness: 0.9 },
  { hour: 24, top: '#050a1c', horizon: '#16234a', light: 0.55, darkness: 1 },
]

/** [시각, 값] — 늦은 밤일수록 불 꺼진 집이 늘어남 */
const CITY_LIT: [number, number][] = [
  [0, 0.6], [2, 0.32], [4, 0.15], [6, 0.3], [8, 0.35], [17, 0.45], [19.5, 1], [22.5, 0.9], [24, 0.6],
]

/** [시각, 값] — 7~9시, 18~19시 출퇴근 피크 */
const TRAFFIC: [number, number][] = [
  [0, 0.18], [1.5, 0.06], [4.5, 0.04], [6, 0.35], [7.5, 1], [9, 0.95], [10, 0.5],
  [12, 0.6], [16, 0.55], [18, 1], [19.5, 0.85], [21, 0.45], [23, 0.28], [24, 0.18],
]

/** [시각, 값] — 출근길·점심·퇴근 후 저녁이 제일 북적 */
const PEDESTRIANS: [number, number][] = [
  [0, 0.15], [2, 0.05], [5, 0.04], [7, 0.4], [8.5, 0.75], [10, 0.45], [12, 0.9], [13.5, 0.6],
  [17, 0.6], [18.5, 1], [21, 0.7], [23, 0.3], [24, 0.15],
]

function lerpTable(table: [number, number][], hour: number) {
  for (let i = 0; i < table.length - 1; i++) {
    const [h0, v0] = table[i]
    const [h1, v1] = table[i + 1]
    if (hour >= h0 && hour <= h1) return v0 + ((v1 - v0) * (hour - h0)) / (h1 - h0)
  }
  return table[0][1]
}

const a = new Color()
const b = new Color()

/** 매 프레임 갱신되는 공유 상태. EnvironmentController가 쓰고 나머지는 읽기만 함 */
export const environment = {
  hour: 19.2,
  top: new Color(),
  horizon: new Color(),
  light: 1.5,
  darkness: 0.65,
  cityLit: 1,
  traffic: 0.8,
  pedestrians: 0.8,
}

export function updateEnvironment(hour: number) {
  let i = 0
  while (i < SKY.length - 2 && hour > SKY[i + 1].hour) i++
  const k0 = SKY[i]
  const k1 = SKY[i + 1]
  const t = Math.min(1, Math.max(0, (hour - k0.hour) / (k1.hour - k0.hour)))

  environment.hour = hour
  environment.top.copy(a.set(k0.top)).lerp(b.set(k1.top), t)
  environment.horizon.copy(a.set(k0.horizon)).lerp(b.set(k1.horizon), t)
  environment.light = k0.light + (k1.light - k0.light) * t
  environment.darkness = k0.darkness + (k1.darkness - k0.darkness) * t
  environment.cityLit = lerpTable(CITY_LIT, hour)
  environment.traffic = lerpTable(TRAFFIC, hour)
  environment.pedestrians = lerpTable(PEDESTRIANS, hour)
}
