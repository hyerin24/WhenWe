/**
 * ⚠️ 잠정(PROVISIONAL) — docs/api.md 에 확정된 엔드포인트가 아직 없습니다(합의 대기).
 * 필드명은 프론트가 임의로 정한 안입니다. api.md 확정 시 여기와 ../teams.ts 를 함께 고칩니다.
 * 확정된 규칙만 지킵니다: camelCase / ISO 8601 UTC / { items: [] } / { code, message }
 *
 * 빈 목록 / 1개 / 여러 개를 전부 볼 수 있게 사용자별로 다른 데이터를 줍니다.
 *   demo@whenwe.dev   → 팀 2개
 *   newbie@whenwe.dev → 팀 0개 (빈 상태 UI 확인용)
 */
import type { TeamsApi } from '../teams'
import { ApiError } from '../client'
import type { Team } from '@/types/api'
import { delay, getMockUserId } from './auth.mock'

/** 초대 코드로 참가할 수 있는, 내가 아직 속하지 않은 팀들 */
const JOINABLE: Team[] = [
  { teamId: 't_101', name: '알고리즘 스터디', memberCount: 6, inviteCode: 'ZX99YQ', createdAt: '2026-08-17T02:30:00Z' },
  { teamId: 't_102', name: '졸업작품 발표조', memberCount: 3, inviteCode: 'KR42MN', createdAt: '2026-08-18T11:00:00Z' },
]

const SEED: Record<string, Team[]> = {
  u_demo: [
    { teamId: 't_001', name: '캡스톤 3조', memberCount: 4, inviteCode: 'AB12CD', createdAt: '2026-08-19T09:00:00Z' },
    { teamId: 't_002', name: '운영체제 팀플', memberCount: 5, inviteCode: 'QW34ER', createdAt: '2026-08-18T05:20:00Z' },
  ],
  u_newbie: [],
}

/** 사용자별 in-memory 저장소. 새로고침하면 SEED 로 돌아갑니다. */
const store = new Map<string, Team[]>()
let nextId = 900

function myTeams(): Team[] {
  const userId = getMockUserId()
  if (!userId) {
    throw new ApiError(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' })
  }
  if (!store.has(userId)) {
    store.set(userId, [...(SEED[userId] ?? [])])
  }
  return store.get(userId)!
}

export const mockTeamsApi: TeamsApi = {
  async list() {
    await delay()
    return [...myTeams()]
  },

  async create(name) {
    await delay()
    const teams = myTeams()

    const trimmed = name.trim()
    if (!trimmed) {
      throw new ApiError(400, { code: 'INVALID_TEAM_NAME', message: '팀 이름을 입력해주세요.' })
    }
    if (teams.some((t) => t.name === trimmed)) {
      throw new ApiError(409, { code: 'TEAM_NAME_DUPLICATED', message: '이미 같은 이름의 팀이 있습니다.' })
    }

    const team: Team = {
      teamId: `t_${++nextId}`,
      name: trimmed,
      memberCount: 1,
      inviteCode: randomInviteCode(),
      createdAt: new Date().toISOString(),
    }
    teams.push(team)
    return team
  },

  async joinByCode(inviteCode) {
    await delay()
    const teams = myTeams()
    const code = inviteCode.trim().toUpperCase()

    if (teams.some((t) => t.inviteCode === code)) {
      throw new ApiError(409, { code: 'ALREADY_JOINED', message: '이미 참여 중인 팀입니다.' })
    }

    const found = JOINABLE.find((t) => t.inviteCode === code)
    if (!found) {
      throw new ApiError(404, { code: 'TEAM_NOT_FOUND', message: '초대 코드에 해당하는 팀이 없습니다.' })
    }

    const joined: Team = { ...found, memberCount: found.memberCount + 1 }
    teams.push(joined)
    return joined
  },
}

/**
 * 참가 테스트에 쓸 수 있는 초대 코드 — 화면 안내용.
 *
 * JOINABLE.map(...) 으로 만들지 않습니다. 함수 호출이 있으면 번들러가 부작용을
 * 의심해 이 모듈을 프로덕션 빌드에서 지우지 못합니다(VITE_USE_MOCK=false 여도 남습니다).
 * 리터럴로 두면 통째로 tree-shaking 됩니다. 위 JOINABLE 과 손으로 맞춥니다.
 */
export const MOCK_JOINABLE_CODES = [
  { code: 'ZX99YQ', name: '알고리즘 스터디' },
  { code: 'KR42MN', name: '졸업작품 발표조' },
]

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
