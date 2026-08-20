/** 팀 생성 (Role 5). */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/Button'
import { ErrorBox } from '@/components/ErrorBox'
import { Field } from '@/components/Field'
import { useCreateTeam } from '@/hooks/useTeams'

export function CreateTeamForm({ onCreated }: { onCreated: () => void }) {
  const { mutateAsync, isPending, error } = useCreateTeam()
  const [name, setName] = useState('')
  const [createdName, setCreatedName] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const team = await mutateAsync(name)
      setName('')
      setCreatedName(team.name)
      onCreated()
    } catch {
      // 실패는 error 로 화면에 표시됩니다.
      setCreatedName(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">팀 만들기</h2>
      <Field
        label="팀 이름"
        id="team-name"
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setCreatedName(null)
        }}
        placeholder="예: 캡스톤 3조"
      />
      <ErrorBox error={error} />
      {createdName && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          &lsquo;{createdName}&rsquo; 팀을 만들었습니다.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? '만드는 중…' : '팀 만들기'}
      </Button>
    </form>
  )
}
