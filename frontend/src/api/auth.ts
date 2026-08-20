/**
 * 인증 API (Role 5).
 *
 * ⚠️ 잠정(PROVISIONAL) — docs/api.md 에 인증 엔드포인트가 아직 없습니다(합의 대기).
 * 아래 경로·요청/응답 필드는 프론트가 임의로 정한 안입니다.
 * api.md 가 확정되면 이 파일을 먼저 고치고 PR 로 백엔드 담당자(F4)와 맞춥니다.
 *
 * 로그인은 이메일이 아니라 **서비스 고유 아이디** 로 합니다.
 * 예전에는 프론트가 아이디를 내부 전용 이메일(`<id>@whenwe.local`)로 바꿔
 * Supabase 에 직접 넘겼지만, F4 와 합의해 **변환을 백엔드가 맡기로** 했습니다.
 * 프론트는 아이디를 그대로 보내고, 내부 이메일 형태는 이제 알지 못합니다.
 *
 * 그래서 이 파일은 supabase-js 를 쓰지 않습니다. 대신 백엔드 API 를 호출합니다.
 * 그 대가로 supabase-js 가 해주던 두 가지를 여기서 직접 해야 합니다.
 *   1. 세션 지속   — 새로고침해도 로그인이 풀리지 않도록 localStorage 에 보관
 *   2. 세션 변화 통지 — 다른 탭에서의 로그인·로그아웃까지 따라가도록 storage 이벤트 구독
 * 토큰 자동 갱신은 아직 못 합니다. 아래 TODO(F4) 를 보세요.
 *
 * 이 파일을 컴포넌트가 직접 import 하지 않습니다. src/api/index.ts 만 씁니다.
 */
import type { Session } from '@/types/api'
import { ApiError, apiClient } from './client'

/**
 * 회원가입 결과.
 * 백엔드가 별도 승인 절차를 두면 가입 직후 세션이 없습니다.
 * 그 경우 session 이 null 이고, 화면은 "관리자 확인이 필요하다"는 안내를 보여줍니다.
 */
export interface SignUpResult {
  session: Session | null
}

export interface AuthApi {
  signIn(loginId: string, password: string): Promise<Session>
  signUp(loginId: string, password: string): Promise<SignUpResult>
  signOut(): Promise<void>
  /** 새로고침 후 로그인 상태 복원용. 없으면 null. */
  getSession(): Promise<Session | null>
  /**
   * 세션이 바뀔 때마다 호출됩니다. 해제 함수를 돌려줍니다.
   * 이 탭에서의 로그인·로그아웃과, 다른 탭에서의 변화가 모두 여기로 들어옵니다.
   */
  onSessionChange(listener: (session: Session | null) => void): () => void
}

/** Supabase 기본 정책과 맞춥니다. 여기만 고치면 mock·실제·화면 안내가 같이 바뀝니다. */
export const MIN_PASSWORD_LENGTH = 6

/**
 * 아이디 규칙. 화면 안내문과 검사에 같은 값을 씁니다.
 * TODO(F4): profiles.username 의 CHECK 제약과 같은 값이어야 합니다. 확인 필요.
 */
export const LOGIN_ID_RULE = {
  min: 4,
  max: 20,
  /** 영문 소문자·숫자·밑줄만. 대소문자 구분으로 헷갈리는 걸 막습니다. */
  pattern: /^[a-z0-9_]+$/,
  description: '영문 소문자, 숫자, 밑줄(_) 4~20자',
} as const

/** 아이디가 규칙에 맞는지. 어긋나면 사용자에게 보여줄 문구를 돌려줍니다. */
export function validateLoginId(loginId: string): string | null {
  const id = loginId.trim()
  if (id.length < LOGIN_ID_RULE.min || id.length > LOGIN_ID_RULE.max) {
    return `아이디는 ${LOGIN_ID_RULE.min}~${LOGIN_ID_RULE.max}자여야 합니다.`
  }
  if (!LOGIN_ID_RULE.pattern.test(id)) {
    return `아이디는 ${LOGIN_ID_RULE.description}만 쓸 수 있습니다.`
  }
  return null
}

/** 서버에 보내기 전 항상 거치는 정규화. 대소문자 차이로 다른 계정이 되는 걸 막습니다. */
const normalize = (loginId: string) => loginId.trim().toLowerCase()

/**
 * 백엔드 인증 응답.
 * TODO(api.md): 필드명 미확정. 서버(F4)는 DB 컬럼과 같은 `username` 을 쓰고,
 * 프론트 내부 타입은 `loginId` 입니다. 변환은 toSession() 한 곳에서만 합니다.
 */
interface AuthResponse {
  accessToken: string
  user: { userId: string; username: string }
}

function toSession(res: AuthResponse): Session {
  return {
    user: { userId: res.user.userId, loginId: res.user.username },
    accessToken: res.accessToken,
  }
}

// ── 세션 보관 ────────────────────────────────────────
// supabase-js 가 하던 일입니다. 이제 우리가 합니다.

const SESSION_KEY = 'whenwe.session'

const listeners = new Set<(session: Session | null) => void>()

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    // 저장된 값이 깨졌으면 로그아웃 상태와 같게 취급합니다.
    return null
  }
}

/** 세션을 저장(또는 삭제)하고 구독자에게 알립니다. 세션이 바뀌는 유일한 통로입니다. */
function setStoredSession(session: Session | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
  listeners.forEach((l) => l(session))
}

export const authApi: AuthApi = {
  async signIn(loginId, password) {
    // TODO(api.md): 경로 미확정
    const res = await apiClient.post<AuthResponse>('/api/auth/login', {
      username: normalize(loginId),
      password,
    })

    const session = toSession(res)
    setStoredSession(session)
    return session
  },

  async signUp(loginId, password) {
    const id = normalize(loginId)

    // 서버도 검사하지만, 왕복 한 번을 아끼고 화면 문구를 우리가 통제합니다.
    const invalid = validateLoginId(id)
    if (invalid) {
      throw new ApiError(400, { code: 'INVALID_LOGIN_ID', message: invalid })
    }

    // TODO(api.md): 경로 미확정 · 아이디 중복(409) code 미확정
    // 승인 절차가 있으면 서버가 accessToken 없이 응답할 수 있습니다.
    const res = await apiClient.post<AuthResponse | null>('/api/auth/signup', {
      username: id,
      password,
    })

    if (!res?.accessToken) return { session: null }

    const session = toSession(res)
    setStoredSession(session)
    return { session }
  },

  async signOut() {
    try {
      // TODO(api.md): 경로 미확정
      await apiClient.post('/api/auth/logout')
    } catch {
      // 서버 로그아웃이 실패해도 이 브라우저에서는 반드시 로그아웃되어야 합니다.
    } finally {
      setStoredSession(null)
    }
  },

  async getSession() {
    // TODO(F4): 지금은 저장된 토큰을 그대로 믿습니다. 만료 여부를 알 방법이 없어서,
    // 만료된 토큰이면 다음 API 호출이 401 로 실패합니다.
    // 토큰 갱신 정책(refresh token 전달 방식·갱신 엔드포인트)이 정해지면
    // 여기서 갱신을 시도하도록 바꿉니다.
    return readStoredSession()
  },

  onSessionChange(listener) {
    listeners.add(listener)

    // 다른 탭에서 로그인·로그아웃하면 이 탭도 따라가야 합니다.
    // storage 이벤트는 "다른 탭"에서만 발생하므로 내 탭 알림과 겹치지 않습니다.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESSION_KEY) return
      listener(readStoredSession())
    }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  },
}
