import { Fragment, useMemo, useState } from 'react'
import './CalendarHeatmap.css'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function toWeekdayLabel(dateStr) {
  return WEEKDAY_LABELS[new Date(`${dateStr}T00:00:00`).getDay()]
}

// items: [{ date, hour, availableCount, totalCount }]
// dates: 표시할 날짜 배열 (ISO, 오름차순)
// hours: 표시할 시간대 배열 (정수, 오름차순)
export default function CalendarHeatmap({ items, dates, hours }) {
  const [viewMode, setViewMode] = useState('date') // 'date' | 'weekday'
  const [selected, setSelected] = useState(null)

  const byDateHour = useMemo(() => {
    const map = new Map()
    items.forEach((item) => map.set(`${item.date}-${item.hour}`, item))
    return map
  }, [items])

  const weekdayColumns = useMemo(() => {
    const seen = []
    dates.forEach((date) => {
      const label = toWeekdayLabel(date)
      if (!seen.includes(label)) seen.push(label)
    })
    return seen
  }, [dates])

  // 요일 보기: 같은 요일에 해당하는 모든 날짜의 값을 평균해 하나의 칸으로 합친다
  const byWeekdayHour = useMemo(() => {
    const map = new Map()
    dates.forEach((date) => {
      const label = toWeekdayLabel(date)
      hours.forEach((hour) => {
        const item = byDateHour.get(`${date}-${hour}`)
        if (!item) return
        const key = `${label}-${hour}`
        const acc = map.get(key) ?? { sum: 0, count: 0, totalCount: item.totalCount }
        acc.sum += item.availableCount
        acc.count += 1
        map.set(key, acc)
      })
    })
    const result = new Map()
    map.forEach((acc, key) => {
      result.set(key, {
        availableCount: Math.round(acc.sum / acc.count),
        totalCount: acc.totalCount,
      })
    })
    return result
  }, [byDateHour, dates, hours])

  const columns = viewMode === 'date' ? dates : weekdayColumns
  const lookup = viewMode === 'date' ? byDateHour : byWeekdayHour
  const keyOf = (col, hour) => `${col}-${hour}`

  function cellInfo(col, hour) {
    const data = lookup.get(keyOf(col, hour))
    if (!data) return { state: 'missing' }
    if (data.availableCount === 0) return { state: 'zero', ...data }
    return { state: 'value', ratio: data.availableCount / data.totalCount, ...data }
  }

  function cellStyle(info) {
    if (info.state === 'value') {
      // 여유도 비율이 높을수록 진한 초록
      const alpha = 0.15 + info.ratio * 0.75
      return { backgroundColor: `rgba(34, 139, 87, ${alpha})` }
    }
    return undefined
  }

  return (
    <div className="heatmap">
      <div className="heatmap-toolbar">
        <button
          className={viewMode === 'date' ? 'active' : ''}
          onClick={() => setViewMode('date')}
        >
          실제 날짜
        </button>
        <button
          className={viewMode === 'weekday' ? 'active' : ''}
          onClick={() => setViewMode('weekday')}
        >
          요일별
        </button>
        <div className="legend">
          <span className="legend-swatch missing" /> 값없음
          <span className="legend-swatch zero" /> 0명 가능
          <span className="legend-swatch value" /> 가능 인원 많음
        </div>
      </div>

      <div className="heatmap-grid" style={{ gridTemplateColumns: `56px repeat(${columns.length}, 1fr)` }}>
        <div className="corner" />
        {columns.map((col) => (
          <div key={col} className="col-header">
            {viewMode === 'date' ? `${col.slice(5)} (${toWeekdayLabel(col)})` : col}
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <div className="row-header">{hour}시</div>
            {columns.map((col) => {
              const info = cellInfo(col, hour)
              return (
                <button
                  key={`${col}-${hour}`}
                  className={`cell ${info.state}`}
                  style={cellStyle(info)}
                  onClick={() => setSelected({ col, hour, ...info })}
                  aria-label={`${col} ${hour}시`}
                />
              )
            })}
          </Fragment>
        ))}
      </div>

      {selected && (
        <div className="detail-panel">
          <strong>
            {viewMode === 'date' ? selected.col : `${selected.col}요일`} {selected.hour}시
          </strong>
          {selected.state === 'missing' && <p>아직 수집된 데이터가 없습니다.</p>}
          {selected.state === 'zero' && <p>가능한 인원이 없습니다 (0 / {selected.totalCount}명).</p>}
          {selected.state === 'value' && (
            <p>
              {selected.availableCount} / {selected.totalCount}명 가능
            </p>
          )}
          <button onClick={() => setSelected(null)}>닫기</button>
        </div>
      )}
    </div>
  )
}
