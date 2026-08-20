/**
 * Heatmap 화면 (Role 6 / F6 담당 영역).
 * GET /api/teams/{teamId}/heatmap (F7, docs/api.md 합의완료) 실제 데이터로 그린다.
 */
import { Link, useSearchParams } from 'react-router-dom'
import CalendarHeatmap from '@/components/CalendarHeatmap'
import { useHeatmap } from '@/hooks/useHeatmap'

function todayKst(): string {
  // 저장·계산은 UTC지만 이 응답의 date/hour는 이미 KST로 집계된 값이다 (docs/api.md).
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export function HeatmapPage() {
  // 팀 목록에서 팀 카드를 누르면 ?teamId= 로 넘어옵니다.
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('teamId')
  const from = todayKst()

  const { data, isLoading, error } = useHeatmap(teamId, from)

  const items = (data?.items ?? [])
    // availableCount가 null인 시간대는 "데이터 없음"으로 보이도록 아예 뺀다 (CalendarHeatmap 규칙).
    .filter((item) => item.availableCount !== null)
    .map((item) => ({
      date: item.date,
      hour: item.hour,
      availableCount: item.availableCount as number,
      totalCount: item.totalCount,
      members: (item.members ?? []).map((m) => ({ name: m.displayName, available: m.available })),
    }))

  const dates = Array.from(new Set((data?.items ?? []).map((item) => item.date))).sort()
  const hours = Array.from(new Set((data?.items ?? []).map((item) => item.hour))).sort((a, b) => a - b)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link to="/teams" className="text-sm text-slate-500 underline underline-offset-2">
        ← 내 팀
      </Link>
      <h1 className="mt-4 text-2xl font-bold">팀 Calendar Heatmap</h1>
      <p className="mt-2 text-sm text-slate-500">
        {from}부터 7일간의 팀원 여유도입니다.
        {teamId && (
          <>
            {' '}
            선택한 팀: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">{teamId}</code>
          </>
        )}
      </p>

      <section className="mt-8">
        {!teamId && (
          <p className="text-sm text-slate-500">먼저 팀을 선택해주세요. (내 팀 목록에서 팀을 눌러 들어옵니다)</p>
        )}
        {teamId && isLoading && <p className="text-sm text-slate-500">불러오는 중…</p>}
        {teamId && error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}
        {teamId && !isLoading && !error && (
          <CalendarHeatmap items={items} dates={dates} hours={hours} />
        )}
      </section>
    </main>
  )
}
