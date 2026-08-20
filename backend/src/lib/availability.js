// 팀 여유도(Heatmap)·개인 부담도 계산.
// 규칙 출처: docs/burden-availability-algorithm.md
// 입력은 GET /api/teams/:teamId/schedules 의 items 그대로.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR
const OCCUPYING_TYPES = new Set(['class', 'exam'])
const ASSIGNMENT_WEIGHT_HOURS = 1

function toKstDateHour(utcIso) {
  const d = new Date(new Date(utcIso).getTime() + KST_OFFSET_MS)
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }
}

function inRange(utcIso, fromIso, toIso) {
  const t = new Date(utcIso).getTime()
  return t >= new Date(fromIso).getTime() && t < new Date(toIso).getTime()
}

function isValidForOccupancy(item) {
  if (item.allDay) return false
  if (!OCCUPYING_TYPES.has(item.type)) return false
  return Boolean(item.startAt || item.endAt)
}

/** class·exam 하나가 점유하는 (date,hour) KST 버킷들. 시각이 하나뿐이면 그 시각 1시간만. */
function occupiedBuckets(item, fromIso, toIso) {
  const { startAt, endAt } = item
  if (startAt && endAt) {
    const buckets = []
    let cursor = new Date(startAt).getTime()
    const end = new Date(endAt).getTime()
    while (cursor < end) {
      const iso = new Date(cursor).toISOString()
      if (inRange(iso, fromIso, toIso)) buckets.push(toKstDateHour(iso))
      cursor += MS_PER_HOUR
    }
    return buckets
  }
  const point = startAt || endAt
  return point && inRange(point, fromIso, toIso) ? [toKstDateHour(point)] : []
}

function dateRangeKst(fromIso, toIso) {
  const dates = []
  let cursor = new Date(fromIso).getTime()
  const end = new Date(toIso).getTime()
  while (cursor < end) {
    dates.push(toKstDateHour(new Date(cursor).toISOString()).date)
    cursor += MS_PER_DAY
  }
  return [...new Set(dates)]
}

function displayNameOf(members, userId) {
  return members.find((m) => m.userId === userId)?.displayName ?? null
}

/**
 * @param {object} params
 * @param {Array} params.schedules - F4 GET /api/teams/:teamId/schedules 의 items
 * @param {Array<{userId:string, displayName:string}>} params.members - 팀원 명단
 * @param {string} params.from - ISO 8601 UTC, 포함
 * @param {string} params.to - ISO 8601 UTC, 미포함
 * @param {number[]} [params.hours] - 계산할 시간대(기본 9~23시)
 */
export function computeHeatmap({ schedules, members, from, to, hours }) {
  const targetHours = hours ?? Array.from({ length: 15 }, (_, i) => i + 9)

  // 팀 전체에 일정 데이터가 하나도 없으면 "값 없음" — 동기화한 사람이 아예 없는 경우.
  // 일부만 동기화한 경우(팀원 A는 있고 B는 없음)는 아직 미확정이라 다루지 않는다 (문서 §5 참고).
  if (schedules.length === 0) {
    const items = []
    for (const date of dateRangeKst(from, to)) {
      for (const hour of targetHours) {
        items.push({ date, hour, totalCount: members.length, availableCount: null, availabilityRate: null, members: null })
      }
    }
    return { items, dueAssignments: [] }
  }

  const busyByBucket = new Map() // "date-hour" -> Set(userId)
  const dueAssignments = []

  for (const item of schedules) {
    if (item.type === 'assignment') {
      const point = item.endAt || item.startAt
      if (point && inRange(point, from, to)) {
        const { date, hour } = toKstDateHour(point)
        dueAssignments.push({
          date,
          hour,
          userId: item.userId,
          displayName: displayNameOf(members, item.userId),
          courseName: item.courseName ?? null,
        })
      }
      continue
    }
    if (!isValidForOccupancy(item)) continue
    for (const { date, hour } of occupiedBuckets(item, from, to)) {
      const key = `${date}-${hour}`
      if (!busyByBucket.has(key)) busyByBucket.set(key, new Set())
      busyByBucket.get(key).add(item.userId)
    }
  }

  const totalCount = members.length
  const items = []
  for (const date of dateRangeKst(from, to)) {
    for (const hour of targetHours) {
      const busy = busyByBucket.get(`${date}-${hour}`) ?? new Set()
      const availableCount = members.filter((m) => !busy.has(m.userId)).length
      items.push({
        date,
        hour,
        totalCount,
        availableCount,
        availabilityRate: totalCount === 0 ? null : availableCount / totalCount,
        members: members.map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          available: !busy.has(m.userId),
        })),
      })
    }
  }

  return { items, dueAssignments }
}

/**
 * @param {object} params
 * @param {Array} params.schedules - 한 사용자의 F4 schedules items (userId로 미리 필터링해서 넘겨도 되고, 전체를 넘기면 내부에서 userId로 거른다)
 * @param {string} params.userId
 * @param {string} params.from - 그 주의 시작 (ISO 8601 UTC, 포함)
 * @param {string} params.to - 그 주의 끝 (ISO 8601 UTC, 미포함)
 */
export function computeBurden({ schedules, userId, from, to }) {
  let busyHours = 0
  let dueCount = 0

  for (const item of schedules) {
    if (item.userId !== userId) continue

    if (item.type === 'assignment') {
      const point = item.endAt || item.startAt
      if (point && inRange(point, from, to)) dueCount += 1
      continue
    }

    if (!isValidForOccupancy(item)) continue

    if (item.startAt && item.endAt) {
      const overlapStart = Math.max(new Date(item.startAt).getTime(), new Date(from).getTime())
      const overlapEnd = Math.min(new Date(item.endAt).getTime(), new Date(to).getTime())
      if (overlapEnd > overlapStart) busyHours += (overlapEnd - overlapStart) / MS_PER_HOUR
    } else {
      const point = item.startAt || item.endAt
      if (point && inRange(point, from, to)) busyHours += 1
    }
  }

  const burdenScore = busyHours + dueCount * ASSIGNMENT_WEIGHT_HOURS
  return {
    userId,
    busyHours: Math.round(busyHours * 100) / 100,
    dueCount,
    burdenScore: Math.round(burdenScore * 100) / 100,
  }
}
