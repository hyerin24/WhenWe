/** 초대 코드로 팀 참가 (Role 5). */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/Button'
import { ErrorBox } from '@/components/ErrorBox'
import { Field } from '@/components/Field'
import { useJoinTeam } from '@/hooks/useTeams'
import { useMockHints } from '@/hooks/useMockHints'

export function JoinByCodeForm({ onJoined }: { onJoined: () => void }) {
  const { mutateAsync, isPending, error } = useJoinTeam()
  const mockHints = useMockHints()
  const [code, setCode] = useState('')
  const [joinedName, setJoinedName] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const team = await mutateAsync(code)
      setCode('')
      setJoinedName(team.name)
      onJoined()
    } catch {
      setJoinedName(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">초대 코드로 참가</h2>
      <Field
        label="초대 코드"
        id="invite-code"
        required
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase())
          setJoinedName(null)
        }}
        placeholder="AB12CD"
        className="font-mono tracking-widest uppercase"
      />
      <ErrorBox error={error} />
      {joinedName && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          &lsquo;{joinedName}&rsquo; 팀에 참가했습니다.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? '참가하는 중…' : '참가하기'}
      </Button>

      {mockHints && (
        <p className="text-xs text-amber-800">
          Mock 참가 코드:{' '}
          {mockHints.joinableCodes.map((c, i) => (
            <span key={c.code}>
              {i > 0 && ', '}
              <button type="button" className="font-mono underline underline-offset-2" onClick={() => setCode(c.code)}>
                {c.code}
              </button>{' '}
              ({c.name})
            </span>
          ))}
        </p>
      )}
    </form>
  )
}
