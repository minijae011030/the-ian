/**
 * THE IAN 방 데이터 = 내 일상.
 * 새 일상이 생기면 여기에 방을 하나 추가하면 건물에 불 켜진 창이 늘어남.
 *
 * - floor: 실제 층수 (2~14, 1층은 상가)
 * - bay: 왼쪽에서 몇 번째 칸부터인지 (1부터, 정면 기준 1~7)
 * - bays: 몇 칸짜리 방인지
 * - schedule: 서울 시간 기준 하루 일과. from > to면 자정을 넘기는 구간
 *   kind는 캐릭터 포즈·불 켜짐을 정하는 데 씀 (sleep·away면 불 꺼짐)
 */
export type ActivityKind = 'sleep' | 'skincare' | 'study' | 'work' | 'exercise' | 'eat' | 'rest' | 'away'

export type Activity = {
  from: string
  to: string
  kind: ActivityKind
  label: string
}

export type Room = {
  id: string
  name: string
  face: 'front' | 'back'
  floor: number
  bay: number
  bays: number
  schedule: Activity[]
}

export const ROOMS: Room[] = [
  {
    id: 'job',
    name: '취준방',
    face: 'front',
    floor: 12,
    bay: 3,
    bays: 2,
    schedule: [
      { from: '01:30', to: '08:30', kind: 'sleep', label: '자는 중' },
      { from: '08:30', to: '09:00', kind: 'rest', label: '채용공고 확인' },
      { from: '09:00', to: '12:00', kind: 'study', label: 'NCS 모의고사 푸는 중' },
      { from: '12:00', to: '13:00', kind: 'eat', label: '점심 먹는 중' },
      { from: '13:00', to: '18:00', kind: 'study', label: '면접 준비 중' },
      { from: '18:00', to: '19:00', kind: 'eat', label: '저녁 먹는 중' },
      { from: '19:00', to: '01:00', kind: 'work', label: '자소서 쓰는 중' },
      { from: '01:00', to: '01:30', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'english',
    name: '영어방',
    face: 'front',
    floor: 10,
    bay: 6,
    bays: 1,
    schedule: [
      { from: '02:00', to: '07:00', kind: 'sleep', label: '자는 중' },
      { from: '07:00', to: '09:00', kind: 'study', label: '비몽사몽 단어 외우는 중' },
      { from: '09:00', to: '12:00', kind: 'study', label: 'LC 듣는 중' },
      { from: '12:00', to: '13:00', kind: 'eat', label: '점심 먹는 중' },
      { from: '13:00', to: '17:00', kind: 'away', label: '스터디 카페 감' },
      { from: '17:00', to: '20:00', kind: 'rest', label: '쉬는 중' },
      { from: '20:00', to: '01:30', kind: 'study', label: 'RC 문제 푸는 중' },
      { from: '01:30', to: '02:00', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'dev',
    name: '개발방',
    face: 'front',
    floor: 8,
    bay: 1,
    bays: 3,
    schedule: [
      { from: '03:00', to: '10:00', kind: 'sleep', label: '자는 중' },
      { from: '10:00', to: '11:00', kind: 'rest', label: 'Today\'s News 보는 중' },
      { from: '11:00', to: '14:00', kind: 'work', label: '코딩 중' },
      { from: '14:00', to: '15:00', kind: 'eat', label: '점심 먹는 중' },
      { from: '15:00', to: '19:00', kind: 'work', label: 'THE IAN 만드는 중' },
      { from: '19:00', to: '20:00', kind: 'eat', label: '저녁 먹는 중' },
      { from: '20:00', to: '02:30', kind: 'work', label: '버그 잡는 중' },
      { from: '02:30', to: '03:00', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'running',
    name: '러닝방',
    face: 'front',
    floor: 6,
    bay: 5,
    bays: 2,
    schedule: [
      { from: '23:30', to: '06:00', kind: 'sleep', label: '자는 중' },
      { from: '06:00', to: '06:30', kind: 'exercise', label: '스트레칭 중' },
      { from: '06:30', to: '07:30', kind: 'away', label: '석촌호수 뛰러 감' },
      { from: '07:30', to: '08:30', kind: 'eat', label: '아침 먹는 중' },
      { from: '08:30', to: '18:00', kind: 'rest', label: '쉬는 중' },
      { from: '18:00', to: '19:00', kind: 'exercise', label: '러닝머신 5km 뛰는 중' },
      { from: '19:00', to: '23:00', kind: 'rest', label: '폼롤러 하는 중' },
      { from: '23:00', to: '23:30', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'bakery',
    name: '빵집방',
    face: 'front',
    floor: 3,
    bay: 2,
    bays: 2,
    schedule: [
      { from: '22:30', to: '05:30', kind: 'sleep', label: '자는 중' },
      { from: '05:30', to: '06:30', kind: 'rest', label: '출근 준비 중' },
      { from: '06:30', to: '14:00', kind: 'away', label: '빵집 알바 출근' },
      { from: '14:00', to: '15:00', kind: 'eat', label: '남은 빵 먹는 중' },
      { from: '15:00', to: '18:00', kind: 'sleep', label: '낮잠 자는 중' },
      { from: '18:00', to: '22:00', kind: 'rest', label: '쉬는 중' },
      { from: '22:00', to: '22:30', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'rabbit',
    name: '토끼방',
    face: 'front',
    floor: 5,
    bay: 1,
    bays: 1,
    schedule: [
      { from: '00:00', to: '07:00', kind: 'sleep', label: '토끼 자는 중' },
      { from: '07:00', to: '08:00', kind: 'eat', label: '토끼 밥 주는 중' },
      { from: '08:00', to: '18:00', kind: 'rest', label: '토끼 낮잠' },
      { from: '18:00', to: '20:00', kind: 'exercise', label: '토끼 산책(방 안)' },
      { from: '20:00', to: '23:30', kind: 'rest', label: '토끼랑 노는 중' },
      { from: '23:30', to: '00:00', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'reading',
    name: '독서방',
    face: 'back',
    floor: 11,
    bay: 4,
    bays: 2,
    schedule: [
      { from: '00:30', to: '08:00', kind: 'sleep', label: '자는 중' },
      { from: '08:00', to: '09:00', kind: 'rest', label: '커피 내리는 중' },
      { from: '09:00', to: '18:00', kind: 'away', label: '도서관 감' },
      { from: '18:00', to: '19:00', kind: 'eat', label: '저녁 먹는 중' },
      { from: '19:00', to: '00:00', kind: 'study', label: '책 읽는 중' },
      { from: '00:00', to: '00:30', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
  {
    id: 'cert',
    name: '자격증방',
    face: 'front',
    floor: 9,
    bay: 4,
    bays: 2,
    schedule: [
      { from: '01:00', to: '07:30', kind: 'sleep', label: '자는 중' },
      { from: '07:30', to: '09:00', kind: 'rest', label: '액자 닦는 중' },
      { from: '09:00', to: '12:00', kind: 'study', label: '정보보안기사 책 고민 중' },
      { from: '12:00', to: '13:00', kind: 'eat', label: '점심 먹는 중' },
      { from: '13:00', to: '19:00', kind: 'away', label: '외출' },
      { from: '19:00', to: '00:30', kind: 'study', label: '보안 개념 정리 중' },
      { from: '00:30', to: '01:00', kind: 'skincare', label: '스킨케어 중' },
    ],
  },
]
