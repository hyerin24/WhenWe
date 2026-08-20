/**
 * 팀 Heatmap API (Role 6).
 *
 * GET /api/teams/{teamId}/heatmap — 확정 (docs/api.md, F7 합의완료).
 * 이 파일을 컴포넌트가 직접 import 하지 않습니다. src/api/index.ts 만 씁니다.
 */
import type { HeatmapResponse } from '@/types/api'
import { apiClient } from './client'

export interface HeatmapApi {
  get(teamId: string, from: string): Promise<HeatmapResponse>
}

export const heatmapApi: HeatmapApi = {
  // from: YYYY-MM-DD (KST). 이 날짜부터 7일치를 반환한다.
  get: (teamId, from) =>
    apiClient.get<HeatmapResponse>(`/api/teams/${teamId}/heatmap?from=${encodeURIComponent(from)}`),
}
