/**
 * Heatmap 화면 (Role 6 / F6 담당 영역).
 * 지금은 Mock 데이터로 그립니다. F7(부담도·여유도 계산) API가 확정되면 실제 데이터로 교체합니다.
 */
import { Link, useSearchParams } from 'react-router-dom'
import CalendarHeatmap from '@/components/CalendarHeatmap'
import { HOURS, MONTH_DATES } from '@/mock/heatmap'
import { generateMockHeatmapWithMembers } from '@/mock/heatmapWithMembers'

const mockResponseWithMembers = generateMockHeatmapWithMembers()

export function HeatmapPage() {
  // 팀 목록에서 팀 카드를 누르면 ?teamId= 로 넘어옵니다.
  // TODO(F6): 팀 선택 방식(쿼리 파라미터 vs /teams/:teamId/heatmap)은 Role 6 가 정합니다.
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('teamId')

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link to="/teams" className="text-sm text-slate-500 underline underline-offset-2">
        ← 내 팀
      </Link>
      <h1 className="mt-4 text-2xl font-bold">팀 Calendar Heatmap</h1>
      <p className="mt-2 text-sm text-slate-500">
        Mock 데이터입니다. F7(부담도·여유도 계산) API가 확정되면 실제 데이터로 교체합니다.
        {teamId && (
          <>
            {' '}
            선택한 팀: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">{teamId}</code>
          </>
        )}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">팀원별 상세형 — 협의용 데모</h2>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          칸을 클릭하면 누가 되고 안 되는지까지 나옵니다. 아직 api.md에 없는 형태라 역할4·역할7과
          합의되면 이 버전으로 교체합니다.
        </p>
        <CalendarHeatmap items={mockResponseWithMembers.items} dates={MONTH_DATES} hours={HOURS} />
      </section>
    </main>
  )
}
