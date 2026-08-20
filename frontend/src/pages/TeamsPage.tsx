/** 팀 목록 · 생성 · 참가 화면 (Role 5). */
import { CreateTeamForm } from '@/features/teams/CreateTeamForm'
import { JoinByCodeForm } from '@/features/teams/JoinByCodeForm'
import { TeamList } from '@/features/teams/TeamList'
import { useAuth } from '@/hooks/useAuth'
import { useTeams } from '@/hooks/useTeams'
import { Button } from '@/components/Button'
import { useState } from 'react'

export function TeamsPage() {
  const { user, signOut } = useAuth()
  const { data, isLoading, error, refetch } = useTeams()
  const [importNotice, setImportNotice] = useState(false)

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
        LMS 일정 가져오기 — 브라우저 same-origin 정책상 이 화면에서 직접 LMS를 fetch할 수 없어
        (frontend/src/lms/README.md 참고), 안내 UI만 제공합니다. F1·F2 코드 자체는 그대로 둡니다.
      */}
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold">LMS 일정</h2>
        <p className="mt-1 mb-3 text-xs text-slate-500">
          학교 LMS 에서 내 일정을 불러와 팀에 반영합니다.
        </p>
        <Button type="button" onClick={() => setImportNotice(true)}>
          LMS 일정 가져오기
        </Button>
        {importNotice && (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p>이 화면에서 바로 가져올 수는 없습니다. LMS 로그인 상태에서 별도 수집 절차가 필요합니다.</p>
            <p className="mt-1">현재는 학교 LMS 페이지에서 실행하는 별도 방법이 필요하며, 자세한 절차는 담당자에게 문의해주세요.</p>
          </div>
        )}
      </section>
    </main>
  )
}
