/**
 * 잠실 배치 (대충 1 = 3m 감각, 실제 축척 아님)
 * 도로는 바둑판. 카메라가 처음에 -z 방향을 보니까 롯데타워·석촌호수가 왼쪽 뒤편에 보이게 둠
 */
export const CITY_RADIUS = 300

/** 도로 중심선 간격과 폭. 우리 건물(원점)이 블록 하나를 통째로 차지 */
export const ROAD = { spacing: 34, width: 9 }
export const BLOCK_SIZE = ROAD.spacing - ROAD.width
export const SIDEWALK_HEIGHT = 0.2

/** 차선: 도로 중심선에서 진행 방향 오른쪽으로 이만큼 (우측통행) */
export const LANE = { offset: 1.7 }

/** 보행자가 걷는 줄: 블록 가장자리에서 이만큼 안쪽 */
export const WALKWAY_INSET = 0.55
/** 도로 중심선 좌표 목록 (±17, ±51, ...) */
export function roadLines() {
  const lines: number[] = []
  for (let c = ROAD.spacing / 2; c < CITY_RADIUS; c += ROAD.spacing) lines.push(c, -c)
  return lines
}

/** 블록 중심 좌표 목록 (0, ±34, ...) */
export function blockCenters() {
  const centers: number[] = [0]
  for (let c = ROAD.spacing; c < CITY_RADIUS; c += ROAD.spacing) centers.push(c, -c)
  return centers
}

export const LAKE = {
  west: { x: -95, z: -95, rx: 34, rz: 22 }, // 서호
  east: { x: -40, z: -125, rx: 30, rz: 20 }, // 동호
}

export const LOTTE_TOWER = { x: -170, z: -270 }

export function isInsideLake(x: number, z: number, margin = 0) {
  return [LAKE.west, LAKE.east].some(({ x: cx, z: cz, rx, rz }) => {
    const dx = (x - cx) / (rx + margin)
    const dz = (z - cz) / (rz + margin)
    return dx * dx + dz * dz < 1
  })
}

export function isNearTower(x: number, z: number, radius = 26) {
  return Math.hypot(x - LOTTE_TOWER.x, z - LOTTE_TOWER.z) < radius
}
