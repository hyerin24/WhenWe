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
  teamId: string
  name: string
  memberCount: number
  inviteCode: string
  createdAt: string // ISO 8601 UTC
}

// ── 여유도 (Role 6) ───────────────────────────────────
// (Role 6 담당자가 여기에 추가합니다)
