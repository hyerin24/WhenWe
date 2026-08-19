/**
 * ⚠️ 잠정(PROVISIONAL) — docs/api.md 에 확정된 엔드포인트가 아직 없습니다(합의 대기).
 * 아래 경로·필드명은 프론트가 임의로 정한 안입니다.
 * api.md 가 확정되면 이 파일을 먼저 고치고 PR 로 백엔드 담당자(F4)와 맞춥니다.
 * 확정된 규칙만 지킵니다: camelCase / ISO 8601 UTC / { items: [] } / { code, message }
 *
 * 이 파일을 컴포넌트가 직접 import 하지 않습니다. src/api/index.ts 만 씁니다.
 */
import type { Team } from '@/types/api'
import { apiClient } from './client'

export interface TeamsApi {
  list(): Promise<Team[]>
  create(name: string): Promise<Team>
  joinByCode(inviteCode: string): Promise<Team>
}

export const teamsApi: TeamsApi = {
  // TODO(api.md): 경로 미확정
  list: () => apiClient.getList<Team>('/api/teams'),

  // TODO(api.md): 경로 미확정
  create: (name) => apiClient.post<Team>('/api/teams', { name }),

  // TODO(api.md): 경로 미확정 · 409(이미 참여한 팀) code 미확정
  joinByCode: (inviteCode) => apiClient.post<Team>('/api/teams/join', { inviteCode }),
}
