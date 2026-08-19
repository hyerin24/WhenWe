import CalendarHeatmap from './components/CalendarHeatmap'
import { HOURS, WEEK_DATES, generateMockHeatmap } from './mock/heatmap'
import './App.css'

const mockResponse = generateMockHeatmap()

function App() {
  return (
    <div className="page">
      <h1>WhenWe · 팀 Calendar Heatmap</h1>
      <p className="subtitle">
        Mock 데이터입니다. F7(부담도·여유도 계산) API가 확정되면 실제 데이터로 교체합니다.
      </p>
      <CalendarHeatmap items={mockResponse.items} dates={WEEK_DATES} hours={HOURS} />
    </div>
  )
}

export default App
