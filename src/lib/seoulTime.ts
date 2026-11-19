/**
 * 서울 시간(0~24, 소수). 테스트용 URL 파라미터:
 *   ?time=08:30      특정 시각으로 고정해서 시작
 *   ?timelapse=600   600배속으로 시간 흐르게 (하루 = 약 2분 24초)
 */
const params = new URLSearchParams(window.location.search)
const startedAt = performance.now()

function parseTime(value: string | null) {
  if (!value) return null
  const [h, m = '0'] = value.split(':')
  const hour = Number(h) + Number(m) / 60
  return Number.isFinite(hour) ? hour : null
}

function realSeoulHour() {
  const now = new Date()
  const utc = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
  return (utc + 9) % 24
}

const fixedStart = parseTime(params.get('time'))
const timelapse = Number(params.get('timelapse')) || 1

export function getSeoulHour() {
  const base = fixedStart ?? realSeoulHour()
  const elapsedHours = ((performance.now() - startedAt) / 3_600_000) * (fixedStart === null ? timelapse - 1 : timelapse)
  return (((base + elapsedHours) % 24) + 24) % 24
}

export function formatHour(hour: number) {
  const h = Math.floor(hour)
  const m = Math.floor((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
