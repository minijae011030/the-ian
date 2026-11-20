import { useSyncExternalStore } from 'react'

/**
 * 지금 들여다보고 있는 방 id (data/rooms.ts). null이면 건물 밖에서 보는 중.
 * 3D 씬(카메라·창문)과 DOM UI(나가기 버튼)가 같이 써야 해서 작은 외부 스토어로 둠
 */
let focused: string | null = null
const listeners = new Set<() => void>()

export function getFocused() {
  return focused
}

export function setFocused(id: string | null) {
  if (focused === id) return
  focused = id
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFocused() {
  return useSyncExternalStore(subscribe, getFocused)
}
