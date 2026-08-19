/**
 * 팀 API (Role 5).
 *
 * 엔드포인트마다 확정도가 다릅니다. 아래 주석의 표시를 보고 판단하세요.
 *   create      — F4 가 구현·공유한 계약입니다. 프론트도 확인했습니다.
 *   list · join — ⚠️ 잠정(PROVISIONAL). 프론트가 임의로 정한 안입니다.
 *
 * 잠정 항목은 api.md 가 확정되면 이 파일을 먼저 고치고 PR 로 F4 와 맞춥니다.
 * 확정된 규칙은 항상 지킵니다: camelCase / ISO 8601 UTC / { items: [] } / { code, message }
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
  // TODO(api.md): 경로 미확정 · 응답에 memberCount 가 포함되는지 F4 확인 필요
  list: () => apiClient.getList<Team>('/api/teams'),

  // 확정 (F4 공유). 201 로 생성된 팀을 그대로 돌려줍니다.
  // 실패: 400 INVALID_NAME · 401 UNAUTHORIZED
  create: (name) => apiClient.post<Team>('/api/teams', { name }),

  // TODO(api.md): 경로 미확정 · 409(이미 참여한 팀) code 미확정
  joinByCode: (inviteCode) => apiClient.post<Team>('/api/teams/join', { inviteCode }),
}
