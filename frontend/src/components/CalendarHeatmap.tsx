import { Fragment, useMemo, useState } from 'react'
import type { HeatmapItem } from '../mock/heatmap'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const PAGE_SIZE = 5

type ViewMode = 'date' | 'weekday'

// 팀원별 상세(누가 되고 안 되는지)는 아직 api.md에 없는 필드라 선택 사항으로 둔다.
// 없으면 지금까지와 동일하게 카운트만 표시하고, 있으면 상세 패널에 목록을 추가로 보여준다.
export interface MemberAvailability {
  name: string
  available: boolean
}

type HeatmapItemInput = HeatmapItem & { members?: MemberAvailability[] }

type CellInfo =
  | { state: 'missing' }
  | { state: 'zero'; availableCount: number; totalCount: number; members?: MemberAvailability[] }
  | {
      state: 'value'
      availableCount: number
      totalCount: number
      ratio: number
      full: boolean
      members?: MemberAvailability[]
    }

type SelectedCell = CellInfo & { col: string; hour: number }

interface CalendarHeatmapProps {
  items: HeatmapItemInput[]
  dates: string[] // 전체 기간 날짜 배열 (ISO, 오름차순) — 실제 날짜 뷰에서는 5일씩 나눠 페이징한다
  hours: number[]
}

function toWeekdayLabel(dateStr: string): string {
  return WEEKDAY_LABELS[new Date(`${dateStr}T00:00:00`).getDay()]
}

export default function CalendarHeatmap({ items, dates, hours }: CalendarHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('date')
  const [pageIndex, setPageIndex] = useState(0)
  const [selected, setSelected] = useState<SelectedCell | null>(null)

  const pages = useMemo(() => {
    const chunks: string[][] = []
    for (let i = 0; i < dates.length; i += PAGE_SIZE) chunks.push(dates.slice(i, i + PAGE_SIZE))
    return chunks
  }, [dates])
  const currentPage = pages[pageIndex] ?? []

  const byDateHour = useMemo(() => {
    const map = new Map<string, HeatmapItemInput>()
    items.forEach((item) => map.set(`${item.date}-${item.hour}`, item))
    return map
  }, [items])

  const weekdayColumns = useMemo(() => {
    const seen: string[] = []
    dates.forEach((date) => {
      const label = toWeekdayLabel(date)
      if (!seen.includes(label)) seen.push(label)
    })
    return seen
  }, [dates])

  // 요일 보기: 같은 요일에 해당하는 모든 날짜의 값을 평균해 하나의 칸으로 합친다
  const byWeekdayHour = useMemo(() => {
    const acc = new Map<string, { sum: number; count: number; totalCount: number }>()
    dates.forEach((date) => {
      const label = toWeekdayLabel(date)
      hours.forEach((hour) => {
        const item = byDateHour.get(`${date}-${hour}`)
        if (!item) return
        const key = `${label}-${hour}`
        const entry = acc.get(key) ?? { sum: 0, count: 0, totalCount: item.totalCount }
        entry.sum += item.availableCount
        entry.count += 1
        acc.set(key, entry)
      })
    })
    const result = new Map<string, { availableCount: number; totalCount: number }>()
    acc.forEach((entry, key) => {
      result.set(key, {
        availableCount: Math.round(entry.sum / entry.count),
        totalCount: entry.totalCount,
      })
    })
    return result
  }, [byDateHour, dates, hours])

  const columns = viewMode === 'date' ? currentPage : weekdayColumns
  const lookup = viewMode === 'date' ? byDateHour : byWeekdayHour

  function cellInfo(col: string, hour: number): CellInfo {
    const data = lookup.get(`${col}-${hour}`)
    if (!data) return { state: 'missing' }
    if (data.availableCount === 0) return { state: 'zero', ...data }
    return {
      state: 'value',
      ratio: data.availableCount / data.totalCount,
      full: data.availableCount === data.totalCount,
      ...data,
    }
  }

  function cellStyle(info: CellInfo) {
    if (info.state === 'value') {
      // 여유도 비율이 높을수록 진한 초록
      const alpha = 0.15 + info.ratio * 0.75
      return { backgroundColor: `rgba(34, 139, 87, ${alpha})` }
    }
    return undefined
  }

  const toggleBtn = (active: boolean) =>
    `px-3.5 py-1.5 rounded-md border text-sm cursor-pointer ${
      active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300'
    }`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button className={toggleBtn(viewMode === 'date')} onClick={() => setViewMode('date')}>
          실제 날짜
        </button>
        <button className={toggleBtn(viewMode === 'weekday')} onClick={() => setViewMode('weekday')}>
          요일별
        </button>

        {viewMode === 'date' && currentPage.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-sm disabled:opacity-40 disabled:cursor-default"
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
              disabled={pageIndex === 0}
              aria-label="이전 5일"
            >
              &lt;
            </button>
            <span className="text-xs text-gray-500 min-w-[90px] text-center">
              {currentPage[0].slice(5)} ~ {currentPage[currentPage.length - 1].slice(5)}
            </span>
            <button
              className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-sm disabled:opacity-40 disabled:cursor-default"
              onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={pageIndex === pages.length - 1}
              aria-label="다음 5일"
            >
              &gt;
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3.5 h-3.5 rounded ml-2.5 border border-gray-200 inline-block [background:repeating-linear-gradient(45deg,#eee,#eee_3px,#fff_3px,#fff_6px)]" />
          값없음
          <span className="w-3.5 h-3.5 rounded ml-2.5 border border-gray-200 inline-block bg-rose-200" />
          0명 가능
          <span className="w-3.5 h-3.5 rounded ml-2.5 border border-gray-200 inline-block bg-emerald-600/70" />
          가능 인원 많음
          <span className="relative w-3.5 h-3.5 rounded ml-2.5 border border-gray-200 inline-block bg-emerald-600/70">
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
          전원 가능
        </div>
      </div>

      <div
        className="grid gap-0.5 overflow-x-auto"
        style={{ gridTemplateColumns: `56px repeat(${columns.length}, 1fr)` }}
      >
        <div />
        {columns.map((col) => (
          <div key={col} className="text-xs text-gray-500 flex items-center justify-center p-1">
            {viewMode === 'date' ? `${col.slice(5)} (${toWeekdayLabel(col)})` : col}
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <div className="text-xs text-gray-500 flex items-center justify-end p-1 pr-2">{hour}시</div>
            {columns.map((col) => {
              const info = cellInfo(col, hour)
              const stateClass =
                info.state === 'missing'
                  ? '[background:repeating-linear-gradient(45deg,#eee,#eee_3px,#fff_3px,#fff_6px)]'
                  : info.state === 'zero'
                    ? 'bg-rose-200'
                    : info.full
                      ? 'ring-2 ring-red-500 ring-inset'
                      : ''
              return (
                <button
                  key={`${col}-${hour}`}
                  className={`border border-gray-200 rounded-sm min-h-[22px] p-0 cursor-pointer hover:outline hover:outline-2 hover:outline-emerald-600 ${stateClass}`}
                  style={cellStyle(info)}
                  onClick={() => setSelected({ col, hour, ...info })}
                  aria-label={`${col} ${hour}시${info.state === 'value' && info.full ? ' 전원 가능' : ''}`}
                />
              )
            })}
          </Fragment>
        ))}
      </div>

      {selected && (
        <div className="border border-gray-300 rounded-lg px-4 py-3 max-w-xs bg-gray-50">
          <strong>
            {viewMode === 'date' ? selected.col : `${selected.col}요일`} {selected.hour}시
          </strong>
          {selected.state === 'missing' && <p>아직 수집된 데이터가 없습니다.</p>}
          {selected.state === 'zero' && <p>가능한 인원이 없습니다 (0 / {selected.totalCount}명).</p>}
          {selected.state === 'value' && (
            <p>
              {selected.availableCount} / {selected.totalCount}명 가능
              {selected.full && <span className="text-red-600 font-semibold"> · 전원 가능</span>}
            </p>
          )}
          {selected.state !== 'missing' && selected.members && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {selected.members.map((m) => (
                <li key={m.name} className={m.available ? 'text-emerald-700' : 'text-gray-400 line-through'}>
                  {m.name}
                </li>
              ))}
            </ul>
          )}
          <button className="mt-2" onClick={() => setSelected(null)}>
            닫기
          </button>
        </div>
      )}
    </div>
  )
}
