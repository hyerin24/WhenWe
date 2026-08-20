/** GET /api/teams/{teamId}/heatmap 이음매 (Role 6). useTeams.ts 와 같은 모양을 맞춘다. */
import { useCallback, useEffect, useState } from 'react'
import { heatmap } from '@/api'
import type { HeatmapResponse } from '@/types/api'

interface QueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useHeatmap(teamId: string | null, from: string): QueryResult<HeatmapResponse> {
  const [data, setData] = useState<HeatmapResponse | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!teamId) {
      setData(undefined)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    heatmap
      .get(teamId, from)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Heatmap 데이터를 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, from, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { data, isLoading, error, refetch }
}
