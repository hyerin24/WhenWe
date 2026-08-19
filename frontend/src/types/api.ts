/**
 * ⚠️ 잠정(PROVISIONAL) — docs/api.md 에 확정된 엔드포인트가 아직 없습니다(합의 대기).
 * 이 파일의 경로·필드명은 프론트가 임의로 정한 안입니다.
 * api.md 가 확정되면 이 파일을 먼저 고치고 PR 로 백엔드 담당자와 맞춥니다.
 * 확정된 규칙만 지킵니다: camelCase / ISO 8601 UTC / { items: [] } / { code, message }
 */

/** 목록 응답은 배열을 그대로 주지 않고 항상 이 모양으로 감쌉니다. (api.md 확정 규칙) */
export interface ListResponse<T> {
  items: T[]
}

/** 모든 에러가 공유하는 구조. 프론트는 code 로 분기하고 message 를 보여줍니다. (api.md 확정 규칙) */
export interface ApiErrorBody {
  code: string
  message: string
}

// ── 인증·팀 (Role 5) ──────────────────────────────────

export interface AuthUser {
  /** 내부 식별자. Supabase Auth 의 user id 입니다. 화면에 노출하지 않습니다. */
  userId: string
  /**
   * 사용자가 로그인 때 입력하는 서비스 고유 아이디.
   * 이메일·전화번호는 받지 않습니다. 화면에 보이는 이름도 이 아이디입니다.
   */
  loginId: string
}

export interface Session {
  user: AuthUser
  accessToken: string
}

export interface Team {
  /** 팀 UUID. 서버 응답 필드명이 `id` 라 그대로 씁니다. (F4 · POST /api/teams) */
  id: string
  name: string
  inviteCode: string
  /** 팀을 만든 사용자의 UUID. 방장 표시·삭제 권한 분기에 씁니다. */
  createdBy: string
  createdAt: string // ISO 8601 UTC
  /**
   * 팀에 속한 인원 수. 목록 카드에 표시합니다.
   * TODO(api.md): POST /api/teams 응답에는 없습니다(생성 직후엔 항상 1).
   * GET /api/teams 응답에 포함되는지 F4 확인 필요.
   */
  memberCount: number
}

/**
 * 초대 코드로 참가했을 때의 응답. (F4 · POST /api/teams/join)
 *
 * Team 과 모양이 다릅니다 — 서버가 팀 전체 정보 대신 참가 사실만 돌려줍니다.
 * 그래서 참가 직후 화면에 팀 카드를 그릴 수 없고, 목록을 다시 받아야 합니다.
 * TODO(api.md): 참가 응답도 Team 으로 통일할지 F4 와 논의 중입니다.
 *   통일되면 이 타입을 지우고 TeamsApi.joinByCode 의 반환 타입만 되돌리면 됩니다.
 */
export interface JoinResult {
  id: string
  name: string
  joinedAt: string // ISO 8601 UTC
}

// ── 여유도 (Role 6) ───────────────────────────────────
// (Role 6 담당자가 여기에 추가합니다)
