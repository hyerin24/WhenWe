/** 팀 목록 (Role 5). 로딩 · 빈 상태 · 에러를 모두 다룹니다. */
import { useNavigate } from 'react-router-dom'
import { formatDate } from '@/lib/datetime'
import { ErrorBox } from '@/components/ErrorBox'
import { Spinner } from '@/components/Spinner'
import type { Team } from '@/types/api'

interface Props {
  teams: Team[] | undefined
  isLoading: boolean
  error: Error | null
}

export function TeamList({ teams, isLoading, error }: Props) {
  const navigate = useNavigate()

  if (isLoading) return <Spinner label="팀 목록을 불러오는 중…" />
  if (error) return <ErrorBox error={error} />

  if (!teams || teams.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        아직 속한 팀이 없습니다. 팀을 만들거나 초대 코드로 참가해보세요.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {teams.map((team) => (
        <li key={team.id}>
          <button
            type="button"
            // TODO(F6): 팀 선택 방식은 Role 6 의 Heatmap 라우트 설계에 맞춰 바뀔 수 있습니다.
            onClick={() => navigate(`/heatmap?teamId=${team.id}`)}
            aria-label={`${team.name} 팀의 Heatmap 보기`}
            className="w-full cursor-pointer rounded-md border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 active:bg-slate-100"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{team.name}</span>
              <span className="text-xs text-slate-500">멤버 {team.memberCount}명</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-slate-500">
              <span>
                초대 코드 <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">{team.inviteCode}</code>
              </span>
              {/* 시각 변환은 lib/datetime.ts 만 씁니다 */}
              <span>{formatDate(team.createdAt)} 생성</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
