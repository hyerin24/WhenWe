import CalendarHeatmap from './components/CalendarHeatmap'
import { HOURS, MONTH_DATES } from './mock/heatmap'
import { generateMockHeatmapWithMembers } from './mock/heatmapWithMembers'

const mockResponseWithMembers = generateMockHeatmapWithMembers()

function App() {
  return (
    <div className="max-w-3xl mx-auto p-8 text-left">
      <h1 className="text-2xl font-semibold mb-1">WhenWe · 팀 Calendar Heatmap</h1>
      <p className="text-gray-500 mb-8">
        Mock 데이터입니다. F7(부담도·여유도 계산) API가 확정되면 실제 데이터로 교체합니다.
      </p>

      <section>
        <h2 className="text-lg font-medium mb-1">팀원별 상세형 — 협의용 데모</h2>
        <p className="text-sm text-gray-500 mb-3">
          칸을 클릭하면 누가 되고 안 되는지까지 나온다. 아직 api.md에 없는 형태 — 역할4·역할7과
          합의되면 이 버전으로 교체한다.
        </p>
        <CalendarHeatmap items={mockResponseWithMembers.items} dates={MONTH_DATES} hours={HOURS} />
      </section>
    </div>
  )
}

export default App
