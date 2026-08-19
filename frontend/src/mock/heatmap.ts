// F7(부담도·여유도 계산) API 미확정 상태의 임시 Mock.
// docs/api.md 공통 규칙(camelCase, ISO 8601 날짜, `{ items: [...] }`)만 따르고
// 필드명·값 범위는 F7 담당자와 합의되는 대로 교체한다.

export interface HeatmapItem {
  date: string // ISO 8601 (YYYY-MM-DD)
  hour: number // 0~23
  availableCount: number
  totalCount: number
}

export interface HeatmapResponse {
  items: HeatmapItem[]
}

export const TOTAL_MEMBERS = 7

export const WEEKDAYS = ['월', '화', '수', '목', '금']

export const HOURS = Array.from({ length: 15 }, (_, i) => i + 9) // 9~23시

function isWeekday(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay()
  return day >= 1 && day <= 5
}

function generateMonthWeekdays(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const dates: string[] = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (isWeekday(dateStr)) dates.push(dateStr)
  }
  return dates
}

// 한 달치 평일 날짜 — 실제 날짜 뷰의 페이징(5일씩)과 요일별 뷰의 집계 대상이 된다
export const MONTH_DATES = generateMonthWeekdays(2026, 8)

export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function generateMockHeatmap(): HeatmapResponse {
  const items: HeatmapItem[] = []
  MONTH_DATES.forEach((date, dayIndex) => {
    HOURS.forEach((hour) => {
      const seed = dayIndex * 131 + hour * 7

      // 값없음(데이터 자체가 없음, availableCount 0과 다름)을 군데군데 섞는다
      if (pseudoRandom(seed * 3 + 1) < 0.06) return

      const r = pseudoRandom(seed)
      // 점심(12-13시)·저녁 이후(19시~)는 일부러 availableCount를 낮춰 0(값0)이 섞이게 한다
      const bias = hour === 12 || hour === 13 || hour >= 19 ? 0.35 : 0
      const availableCount = Math.max(0, Math.round((r - bias) * TOTAL_MEMBERS))

      items.push({
        date,
        hour,
        availableCount,
        totalCount: TOTAL_MEMBERS,
      })
    })
  })

  return { items }
}
