import { useSyncExternalStore } from 'react'

/**
 * 카메라 높이 조작용 작은 브리지.
 * 엘리베이터 버튼(DOM)이 누르면 CameraControls(3D)가 등록해둔 함수로 위아래 이동.
 * 반대로 CameraControls는 지금 보고 있는 층을 알려줌
 */
let move: ((floors: number) => void) | null = null
let floor = 8
const listeners = new Set<() => void>()

export function registerVerticalMove(fn: typeof move) {
  move = fn
}

export function moveFloors(floors: number) {
  move?.(floors)
}

export function setViewFloor(next: number) {
  if (next === floor) return
  floor = next
  listeners.forEach((l) => l())
}

export function useViewFloor() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => floor,
  )
}
