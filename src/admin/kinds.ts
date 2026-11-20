import type { ActivityKind } from '../data/rooms'

export const KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: 'work', label: '작업' },
  { kind: 'study', label: '공부' },
  { kind: 'eat', label: '밥' },
  { kind: 'rest', label: '쉬기' },
  { kind: 'skincare', label: '스킨케어' },
  { kind: 'sleep', label: '잠' },
  { kind: 'exercise', label: '운동' },
  { kind: 'away', label: '외출' },
]
