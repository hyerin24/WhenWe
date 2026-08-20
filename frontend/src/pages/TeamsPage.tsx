/** 팀 목록 · 생성 · 참가 화면 (Role 5). */
import { CreateTeamForm } from '@/features/teams/CreateTeamForm'
import { JoinByCodeForm } from '@/features/teams/JoinByCodeForm'
import { TeamList } from '@/features/teams/TeamList'
import { useAuth } from '@/hooks/useAuth'
import { useTeams } from '@/hooks/useTeams'
import { Button } from '@/components/Button'
import { BASE_URL } from '@/api'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const LMS_ENDPOINT = `${BASE_URL}/api/lms/schedules`

/**
 * 개발자용 대체 방법(콘솔 복붙)에 쓰는 코드. 실제 사용자 흐름은 "LMS 연동하기" 버튼 +
 * extension/ 확장프로그램이다 — 이 스니펫은 확장프로그램 없이 F1·F2를 확인할 때만 쓴다
 * (frontend/src/lms/README.md "확인 방법" 참고).
 */
function buildSendSnippet(accessToken: string): string {
  return [
    'const parsed = parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year: 2026, month: 9 }))',
    'await sendLmsSchedules(parsed, {',
    `  accessToken: '${accessToken}',`,
    `  endpoint: '${LMS_ENDPOINT}',`,
    '})',
  ].join('\n')
}

type LmsStatus =
  | 'idle'
  | 'checking'
  | 'not-installed'
  | 'awaiting-tab'
  | 'awaiting-login'
  | 'collecting'
  | 'success'
  | 'error'
  | 'busy'

interface LmsStatusMessage {
  source: 'whenwe-extension'
  type: 'WHENWE_LMS_STATUS'
  status: LmsStatus
  importedCount?: number
  code?: string
  message?: string
}

function isLmsStatusMessage(data: unknown): data is LmsStatusMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === 'whenwe-extension' &&
    (data as { type?: unknown }).type === 'WHENWE_LMS_STATUS'
  )
}

function statusText(status: LmsStatus, importedCount: number | null, errorMessage: string | null): string {
  switch (status) {
    case 'checking':
      return '확장프로그램 확인 중…'
    case 'not-installed':
      return 'LMS 연동 확장프로그램이 설치되어 있지 않습니다.'
    case 'awaiting-tab':
      return 'LMS 탭을 여는 중…'
    case 'awaiting-login':
      return 'LMS 로그인 대기 중… LMS에서 로그인하면 자동으로 이어집니다.'
    case 'collecting':
      return '일정을 가져오는 중…'
    case 'success':
      return `${importedCount ?? 0}개의 일정을 가져왔습니다.`
    case 'busy':
      return '이미 진행 중입니다.'
    case 'error':
      return errorMessage ?? '일정을 가져오지 못했습니다.'
    default:
      return ''
  }
}

export function TeamsPage() {
  const { user, accessToken, signOut } = useAuth()
  const { data, isLoading, error, refetch } = useTeams()
  const [showDevFallback, setShowDevFallback] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const [lmsStatus, setLmsStatus] = useState<LmsStatus>('idle')
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [lmsErrorMessage, setLmsErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== window || !isLmsStatusMessage(event.data)) return
      const { status, importedCount: count, message } = event.data
      setLmsStatus(status)
      if (status === 'success') {
        setImportedCount(count ?? 0)
        void refetch()
      }
      if (status === 'error') setLmsErrorMessage(message ?? null)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refetch])

  function startLmsImport() {
    if (lmsStatus !== 'idle' && lmsStatus !== 'success' && lmsStatus !== 'error' && lmsStatus !== 'not-installed') {
      return // 진행 중에는 중복 클릭 방지
    }
    setLmsErrorMessage(null)
    setLmsStatus('checking')

    if (!window.__WHENWE_LMS_EXTENSION__) {
      setLmsStatus('not-installed')
      return
    }
    if (!accessToken) {
      setLmsStatus('error')
      setLmsErrorMessage('로그인 토큰을 확인할 수 없습니다. 다시 로그인해주세요.')
      return
    }

    setLmsStatus('collecting')
    window.postMessage(
      { source: 'whenwe-app', type: 'WHENWE_LMS_START', accessToken, endpoint: LMS_ENDPOINT },
      window.location.origin,
    )
  }

  const isBusy = lmsStatus !== 'idle' && lmsStatus !== 'success' && lmsStatus !== 'error' && lmsStatus !== 'not-installed'
  const firstTeamId = data && data.length > 0 ? data[0].id : null

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
        LMS 일정 — extension/ 확장프로그램이 LMS 탭 안에서 F1·F2를 실행하고
        결과(일정 JSON)만 이 화면으로 돌려준다. F1·F2·backend 로직은 그대로 재사용한다
        (extension/content-lms.js, frontend/src/lms/*.js, backend POST /api/lms/schedules).
      */}
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold">LMS 일정</h2>
        <p className="mt-1 mb-3 text-xs text-slate-500">
          경기대 LMS 캘린더에서 내 일정을 가져와 팀에 반영합니다.
        </p>

        <Button type="button" onClick={startLmsImport} disabled={isBusy}>
          LMS 연동하기
        </Button>

        {lmsStatus !== 'idle' && (
          <p
            className={`mt-3 rounded-md border px-3 py-2 text-sm ${
              lmsStatus === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : lmsStatus === 'error' || lmsStatus === 'not-installed'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            {statusText(lmsStatus, importedCount, lmsErrorMessage)}
          </p>
        )}

        {lmsStatus === 'success' && (
          <p className="mt-2 text-xs text-slate-500">
            {firstTeamId ? (
              <Link to={`/heatmap?teamId=${firstTeamId}`} className="underline underline-offset-2">
                팀 Heatmap에서 반영 확인하기
              </Link>
            ) : (
              '팀 Heatmap 화면에서 반영을 확인하세요.'
            )}
          </p>
        )}

        <details className="mt-4" open={showDevFallback} onToggle={(e) => setShowDevFallback(e.currentTarget.open)}>
          <summary className="cursor-pointer text-xs text-slate-400">개발자용 대체 방법 (확장프로그램 없이 확인)</summary>
          <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            <p className="text-xs">
              확장프로그램을 설치하지 않고 F1·F2를 확인하려면 LMS 탭 콘솔에 직접 붙여넣습니다
              (자세한 절차는 <code className="font-mono">frontend/src/lms/README.md</code>).
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-xs">
              <li>경기대 LMS에 로그인하고 캘린더 탭을 엽니다 (lms.kyonggi.ac.kr/calendar/view.php).</li>
              <li>
                그 탭에서 <code className="font-mono">F12</code> → Console 을 엽니다.
              </li>
              <li>
                <code className="font-mono">frontend/src/lms/</code>의 순서대로 코드를 붙여넣습니다: lmsErrors →
                fetchLmsCalendarHtml → lmsParseError → classifyLmsEvent → parseLmsCalendarHtml → sendLmsSchedules.
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
              </div>
            ) : (
              <p className="text-red-600 text-xs">로그인 토큰을 확인할 수 없습니다. 다시 로그인해주세요.</p>
            )}
          </div>
        </details>
      </section>
    </main>
  )
}
