// 수동 확인용: node scripts/check-availability.js
// 실제 DB 연결 없이 계산 로직만 눈으로 확인한다.

import { computeHeatmap, computeBurden } from '../src/lib/availability.js'

const members = [
  { userId: 'u1', displayName: '팀원1' },
  { userId: 'u2', displayName: '팀원2' },
]

const schedules = [
  // u1: 8/19 10~12시(KST) 수업
  { userId: 'u1', scheduleId: 's1', type: 'class', startAt: '2026-08-19T01:00:00Z', endAt: '2026-08-19T03:00:00Z', allDay: false, source: 'lms' },
  // u2: 8/19 23시(KST) 과제 마감 — 계산엔 안 잡히고 dueAssignments 로만
  { userId: 'u2', scheduleId: 's2', type: 'assignment', startAt: '2026-08-19T14:59:00Z', endAt: null, allDay: false, courseName: '자료구조', source: 'lms' },
  // u1: allDay 일정 — 계산에서 제외돼야 함
  { userId: 'u1', scheduleId: 's3', type: 'exam', startAt: '2026-08-20T00:00:00Z', endAt: null, allDay: true, source: 'lms' },
]

const from = '2026-08-17T00:00:00Z' // 8/17 09:00 KST
const to = '2026-08-24T00:00:00Z'

const { items, dueAssignments } = computeHeatmap({ schedules, members, from, to })

console.log('8/19 10시(KST) — u1 수업 중:', items.find((i) => i.date === '2026-08-19' && i.hour === 10))
console.log('8/19 12시(KST) — 수업 끝난 뒤:', items.find((i) => i.date === '2026-08-19' && i.hour === 12))
console.log('dueAssignments:', dueAssignments)
console.log('u1 부담도:', computeBurden({ schedules, userId: 'u1', from, to }))
console.log('u2 부담도:', computeBurden({ schedules, userId: 'u2', from, to }))
console.log('일정 데이터 자체가 없을 때(값 없음):', computeHeatmap({ schedules: [], members, from, to }).items[0])
