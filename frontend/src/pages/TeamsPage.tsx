/** 팀 목록 · 생성 · 참가 화면 (Role 5). */
import { CreateTeamForm } from '@/features/teams/CreateTeamForm'
import { JoinByCodeForm } from '@/features/teams/JoinByCodeForm'
import { TeamList } from '@/features/teams/TeamList'
import { useAuth } from '@/hooks/useAuth'
import { useTeams } from '@/hooks/useTeams'
import { Button } from '@/components/Button'
import { BASE_URL } from '@/api'
import { useState } from 'react'

/**
 * LMS 탭 콘솔에 붙여넣을 마지막 줄. F1(fetch)·F2(parse)는 same-origin 제약 때문에
 * 반드시 lms.kyonggi.ac.kr 탭에서 실행해야 한다 (frontend/src/lms/README.md).
 * 이 화면(when-we.vercel.app)은 그 절차 안내와, 토큰 복사만 담당한다.
 */
function buildSendSnippet(accessToken: string): string {
  return [
    'const parsed = parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year: 2026, month: 9 }))',
    'await sendLmsSchedules(parsed, {',
    `  accessToken: '${accessToken}',`,
    `  endpoint: '${BASE_URL}/api/lms/schedules',`,
    '})',
  ].join('\n')
}

export function TeamsPage() {
  const { user, accessToken, signOut } = useAuth()
  const { data, isLoading, error, refetch } = useTeams()
  const [showLmsGuide, setShowLmsGuide] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copySnippet() {
    if (!accessToken) return
    try {
      await navigator.clipboard.writeText(buildSendSnippet(accessToken))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">내 팀</h1>
          <p className="text-sm text-slate-500">
            <span className="font-mono">{user?.loginId}</span> 님으로 로그인했습니다.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void signOut()}>
          로그아웃
        </Button>
      </header>

      <section className="mb-8">
        <TeamList teams={data} isLoading={isLoading} error={error} />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <CreateTeamForm onCreated={refetch} />
        <JoinByCodeForm onJoined={refetch} />
      </section>

      {/*
        LMS 일정 가져오기 — F1(fetch)·F2(parse·send)는 same-origin 제약 때문에
        반드시 lms.kyonggi.ac.kr 탭 콘솔에서 실행해야 한다 (frontend/src/lms/README.md).
        이 화면은 그 절차를 안내하고, 콘솔에 붙여넣을 토큰·엔드포인트를 채운 코드를 복사만 해준다.
        F1·F2·backend LMS 로직은 그대로 재사용한다 — 여기서 새로 구현하지 않는다.
      */}
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold">LMS 일정 가져오기</h2>
        <p className="mt-1 mb-3 text-xs text-slate-500">
          학교 LMS 캘린더 탭에서 직접 실행해야 합니다. 이 화면에서 바로 가져올 수는 없습니다
          (브라우저 보안 정책 — LMS 로그인 세션은 LMS 탭 안에서만 쓸 수 있습니다).
        </p>
        <Button type="button" onClick={() => setShowLmsGuide((v) => !v)}>
          {showLmsGuide ? '안내 닫기' : 'LMS 일정 가져오는 방법'}
        </Button>

        {showLmsGuide && (
          <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            <ol className="list-decimal space-y-1 pl-5">
              <li>경기대 LMS에 로그인하고 캘린더 탭을 엽니다 (lms.kyonggi.ac.kr/calendar/view.php).</li>
              <li>
                그 탭에서 <code className="font-mono">F12</code> → Console 을 엽니다.
              </li>
              <li>
                <code className="font-mono">frontend/src/lms/</code>의 순서대로 코드를 붙여넣습니다:
                lmsErrors → fetchLmsCalendarHtml → lmsParseError → classifyLmsEvent → parseLmsCalendarHtml →
                sendLmsSchedules.
              </li>
              <li>아래 코드를 복사해 마지막에 붙여넣고 실행합니다.</li>
            </ol>

            {accessToken ? (
              <div>
                <pre className="overflow-x-auto rounded bg-slate-900 px-3 py-2 text-xs text-slate-100">
                  {buildSendSnippet(accessToken)}
                </pre>
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => void copySnippet()}>
                    코드 복사
                  </Button>
                  {copyState === 'copied' && <span className="text-xs text-emerald-700">복사했습니다.</span>}
                  {copyState === 'failed' && (
                    <span className="text-xs text-red-600">복사에 실패했습니다. 직접 선택해 복사해주세요.</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  실행 후 <code className="font-mono">{'{ importedCount }'}</code> 응답이 오면 성공입니다. 팀
                  Heatmap 화면에서 반영을 확인하세요.
                </p>
              </div>
            ) : (
              <p className="text-red-600">로그인 토큰을 확인할 수 없습니다. 다시 로그인해주세요.</p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
