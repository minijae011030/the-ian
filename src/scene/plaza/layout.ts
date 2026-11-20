/**
 * THE IAN 블록 꾸미기 배치. 블록 중심이 원점, +z가 정면(카메라 시작 방향).
 * 블록 끝은 ±12.5, 건물은 x ±6 / z ±4
 */
export const EDGE = 11.2 // 가로수 줄

export const TREES: [number, number][] = [
  // 정면 (가운데는 입구 시야 확보용으로 비움)
  [-10.5, EDGE], [-6.5, EDGE], [6.5, EDGE],
  // 뒷면
  [-10.5, -EDGE], [-7, -EDGE], [-3.5, -EDGE], [0, -EDGE], [3.5, -EDGE], [7, -EDGE], [10.5, -EDGE],
  // 동·서 옆면
  ...[-7.5, -4, -0.5, 3, 6.5].flatMap((z): [number, number][] => [[-EDGE, z], [EDGE, z]]),
]

export const BENCHES: [number, number][] = [
  [-4.2, 9.8],
  [4.2, 9.8],
]

export const BOLLARDS: [number, number][] = [-2.4, -1.2, 0, 1.2, 2.4].map((x) => [x, 12.1])

/** 보행자 길(블록 끝에서 0.55 안쪽)에 안 걸리게 살짝 안으로 */
export const BUS_STOP: [number, number] = [9.6, 10.8]

/** 정면 왼쪽 모퉁이. 팔이 왼쪽 도로 위로 뻗음 */
export const ROAD_SIGN: [number, number] = [-12.3, 12.3]
