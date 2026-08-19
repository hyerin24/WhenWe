/**
 * Heatmap 화면 (Role 6 / F6 담당 영역).
 * 지금은 라우터 연결 확인용 빈 페이지입니다. Role 6 가 features/heatmap/ 으로 채웁니다.
 */
import { Link, useSearchParams } from 'react-router-dom'

export function HeatmapPage() {
  // 팀 목록에서 팀 카드를 누르면 ?teamId= 로 넘어옵니다.
  // TODO(F6): 팀 선택 방식(쿼리 파라미터 vs /teams/:teamId/heatmap)은 Role 6 가 정합니다.
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('teamId')

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link to="/teams" className="text-sm text-slate-500 underline underline-offset-2">
        ← 내 팀
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Heatmap</h1>
      <p className="mt-2 text-sm text-slate-500">
        F6 담당(Role 6) 화면입니다. 아직 비어 있습니다.
        {teamId && (
          <>
            {' '}
            선택한 팀: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">{teamId}</code>
          </>
        )}
      </p>
    </main>
  )
}
