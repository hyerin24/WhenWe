// F7(부담도·여유도 계산) API 미확정 상태의 임시 Mock.
// docs/api.md 공통 규칙(camelCase, ISO 8601 날짜, `{ items: [...] }`)만 따르고
// 필드명·값 범위는 F7 담당자와 합의되는 대로 교체한다.

export const TOTAL_MEMBERS = 7

export const WEEKDAYS = ['월', '화', '수', '목', '금']

// 이번 주 평일 날짜 (Mon~Fri)
export const WEEK_DATES = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21']

export const HOURS = Array.from({ length: 15 }, (_, i) => i + 9) // 9~23시

// 날짜별로 일부러 비운 슬롯 = "값없음"(데이터 자체가 없음, availableCount 0과 다름)
const MISSING = new Set(['2026-08-17-9', '2026-08-17-10', '2026-08-21-22', '2026-08-21-23'])

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function generateMockHeatmap() {
  const items = []
  WEEK_DATES.forEach((date, dayIndex) => {
    HOURS.forEach((hour) => {
      const key = `${date}-${hour}`
      if (MISSING.has(key)) return // 값없음은 아예 항목을 만들지 않는다

      const seed = dayIndex * 100 + hour
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
