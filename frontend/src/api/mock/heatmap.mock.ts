/**
 * GET /api/teams/{teamId}/heatmap 의 mock 버전.
 * docs/api.md 확정 응답 모양(members: userId/displayName/available, 값없음은 availableCount: null)을 그대로 흉내낸다.
 */
import type { HeatmapApi } from '../heatmap'
import type { HeatmapResponse } from '@/types/api'
import { HOURS, TOTAL_MEMBERS, pseudoRandom } from '@/mock/heatmap'

const MEMBER_IDS = Array.from({ length: TOTAL_MEMBERS }, (_, i) => `mock-member-${i + 1}`)

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const mockHeatmapApi: HeatmapApi = {
  async get(_teamId, from): Promise<HeatmapResponse> {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i))
    const items: HeatmapResponse['items'] = []

    dates.forEach((date, dayIndex) => {
      HOURS.forEach((hour) => {
        const baseSeed = dayIndex * 131 + hour * 7

        if (pseudoRandom(baseSeed * 3 + 1) < 0.06) {
          items.push({ date, hour, totalCount: TOTAL_MEMBERS, availableCount: null, availabilityRate: null, members: null })
          return
        }

        const bias = hour === 12 || hour === 13 || hour >= 19 ? 0.35 : 0
        const members = MEMBER_IDS.map((userId, memberIndex) => {
          const r = pseudoRandom(baseSeed * 17 + memberIndex * 3 + 1)
          return { userId, displayName: `팀원${memberIndex + 1}`, available: r - bias > 0.5 }
        })
        const availableCount = members.filter((m) => m.available).length

        items.push({
          date,
          hour,
          totalCount: TOTAL_MEMBERS,
          availableCount,
          availabilityRate: availableCount / TOTAL_MEMBERS,
          members,
        })
      })
    })

    return { items, dueAssignments: [] }
  },
}
