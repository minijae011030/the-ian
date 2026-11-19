/** 시드 고정 난수. 새로고침해도 주변 건물 배치가 그대로 유지되게 */
export function createRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function range(rand: () => number, min: number, max: number) {
  return min + rand() * (max - min)
}
