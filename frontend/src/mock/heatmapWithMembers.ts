// F6·F7 협의용 데모 — "팀원별로 누가 되고 안 되는지"까지 응답에 포함하는 버전.
// 아직 api.md에 없는 형태다. 역할4(팀원 데이터)·역할7(계산)과 합의 전까지는
// 검토용으로만 쓰고, 확정되면 heatmap.ts와 통합하거나 이 형태로 교체한다.

import { HOURS, MONTH_DATES, TOTAL_MEMBERS, pseudoRandom } from './heatmap'

export interface MemberAvailability {
  name: string
  available: boolean
}

export interface HeatmapItemWithMembers {
  date: string
  hour: number
  availableCount: number
  totalCount: number
  members: MemberAvailability[]
}

export interface HeatmapWithMembersResponse {
  items: HeatmapItemWithMembers[]
}

const TEAM_MEMBER_NAMES = Array.from({ length: TOTAL_MEMBERS }, (_, i) => `팀원${i + 1}`)

export function generateMockHeatmapWithMembers(): HeatmapWithMembersResponse {
  const items: HeatmapItemWithMembers[] = []

  MONTH_DATES.forEach((date, dayIndex) => {
    HOURS.forEach((hour) => {
      const baseSeed = dayIndex * 131 + hour * 7

      // 값없음 규칙은 heatmap.ts와 동일하게 맞춘다
      if (pseudoRandom(baseSeed * 3 + 1) < 0.06) return

      const bias = hour === 12 || hour === 13 || hour >= 19 ? 0.35 : 0
      const members: MemberAvailability[] = TEAM_MEMBER_NAMES.map((name, memberIndex) => {
        const r = pseudoRandom(baseSeed * 17 + memberIndex * 3 + 1)
        return { name, available: r - bias > 0.5 }
      })

      items.push({
        date,
        hour,
        availableCount: members.filter((m) => m.available).length,
        totalCount: TOTAL_MEMBERS,
        members,
      })
    })
  })

  return { items }
}
