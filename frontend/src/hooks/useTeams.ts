/**
 * ★ 상태관리 이음매 (Role 5).
 *
 * 반환 shape 을 처음부터 TanStack Query 와 똑같이 맞춰 둡니다.
 * 나중에 도입하기로 정해지면 이 파일의 본문만 useQuery / useMutation 으로 갈아끼우고,
 * 호출부(features/teams/*)는 한 줄도 바꾸지 않습니다.
 */
import { useCallback, useEffect, useState } from 'react'
import { teams } from '@/api'
import type { Team } from '@/types/api'

interface QueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useTeams(): QueryResult<Team[]> {
  const [data, setData] = useState<Team[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    teams
      .list()
      .then((items) => {
        if (!cancelled) setData(items)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('팀 목록을 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { data, isLoading, error, refetch }
}

interface MutationResult<TInput> {
  mutateAsync: (input: TInput) => Promise<Team>
  isPending: boolean
  error: Error | null
  reset: () => void
}

function useTeamMutation(fn: (input: string) => Promise<Team>): MutationResult<string> {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutateAsync = useCallback(
    async (input: string) => {
      setIsPending(true)
      setError(null)
      try {
        return await fn(input)
      } catch (e) {
        const err = e instanceof Error ? e : new Error('요청을 처리하지 못했습니다.')
        setError(err)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [fn],
  )

  const reset = useCallback(() => setError(null), [])

  return { mutateAsync, isPending, error, reset }
}

export function useCreateTeam(): MutationResult<string> {
  return useTeamMutation(useCallback((name: string) => teams.create(name), []))
}

export function useJoinTeam(): MutationResult<string> {
  return useTeamMutation(useCallback((inviteCode: string) => teams.joinByCode(inviteCode), []))
}
