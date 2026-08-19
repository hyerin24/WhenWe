/**
 * 인증 API (Role 5). Supabase Auth 를 씁니다.
 *
 * ⚠️ 로그인은 이메일이 아니라 **서비스 고유 아이디(loginId)** 로 합니다.
 *
 * 그런데 Supabase Auth 의 비밀번호 로그인은 이메일 또는 전화번호만 받습니다.
 * 그래서 loginId 를 내부 전용 이메일(`<loginId>@whenwe.local`)로 바꿔 Supabase 에 넘깁니다.
 * 이 이메일은 화면에 절대 보이지 않고, 메일이 발송되지도 않습니다.
 *
 * TODO(F4): 이 매핑 방식은 프론트가 임시로 정한 안입니다. 백엔드가 아이디→계정 조회를
 * 서버에서 처리하기로 하면 여기만 바꾸면 됩니다. 훅·컴포넌트는 그대로입니다.
 *
 * 이 파일을 컴포넌트가 직접 import 하지 않습니다. src/api/index.ts 만 씁니다.
 */
import { requireSupabase, supabase } from '@/lib/supabase'
import type { AuthUser, Session } from '@/types/api'
import { ApiError } from './client'

/**
 * 회원가입 결과.
 * Supabase 프로젝트에서 이메일 확인이 켜져 있으면 가입 직후 세션이 없습니다.
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
   *
   * Supabase 는 액세스 토큰(기본 1시간)을 백그라운드에서 자동 갱신합니다.
   * 이걸 구독하지 않으면 탭을 오래 켜뒀을 때 만료된 토큰으로 계속 요청해
   * 모든 API 가 401 이 됩니다. 다른 탭에서의 로그인·로그아웃도 여기로 들어옵니다.
   */
  onSessionChange(listener: (session: Session | null) => void): () => void
}

/** Supabase 기본 정책과 맞춥니다. 여기만 고치면 mock·실제·화면 안내가 같이 바뀝니다. */
export const MIN_PASSWORD_LENGTH = 6

/** 아이디 규칙. 화면 안내문과 검사에 같은 값을 씁니다. */
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

/**
 * Supabase 에 넘길 내부 전용 이메일. 화면에 노출되지 않고 메일도 가지 않습니다.
 * TODO(F4): 백엔드와 합의되면 방식이 바뀔 수 있습니다.
 */
const INTERNAL_EMAIL_DOMAIN = 'whenwe.local'
const toInternalEmail = (loginId: string) => `${loginId.trim().toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`

interface SupabaseUserLike {
  id: string
  email?: string
  user_metadata?: { loginId?: string }
}

function toAuthUser(user: SupabaseUserLike): AuthUser {
  // metadata 의 loginId 가 우선. 없으면 내부 이메일에서 아이디를 되돌립니다.
  const loginId = user.user_metadata?.loginId ?? (user.email ?? '').split('@')[0]
  return { userId: user.id, loginId }
}

export const authApi: AuthApi = {
  async signIn(loginId, password) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: toInternalEmail(loginId),
      password,
    })

    if (error || !data.session) {
      // Supabase 에러를 프론트 공통 에러 모양({ code, message })으로 통일합니다.
      // 원문을 그대로 보여주면 내부 이메일 주소가 화면에 드러납니다.
      throw new ApiError(401, {
        code: 'INVALID_CREDENTIALS',
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      })
    }

    return { user: toAuthUser(data.session.user), accessToken: data.session.access_token }
  },

  async signUp(loginId, password) {
    const invalid = validateLoginId(loginId)
    if (invalid) {
      throw new ApiError(400, { code: 'INVALID_LOGIN_ID', message: invalid })
    }

    const { data, error } = await requireSupabase().auth.signUp({
      email: toInternalEmail(loginId),
      password,
      options: { data: { loginId: loginId.trim().toLowerCase() } },
    })

    if (error) {
      const alreadyExists = error.status === 422 || /already registered/i.test(error.message)
      throw new ApiError(alreadyExists ? 409 : 400, {
        code: alreadyExists ? 'LOGIN_ID_ALREADY_EXISTS' : 'SIGNUP_FAILED',
        // 원문에 내부 이메일이 섞일 수 있어 중복만 우리 문구로 바꿉니다.
        message: alreadyExists ? '이미 사용 중인 아이디입니다.' : error.message,
      })
    }

    if (!data.session) return { session: null }

    return {
      session: { user: toAuthUser(data.session.user), accessToken: data.session.access_token },
    }
  },

  async signOut() {
    await requireSupabase().auth.signOut()
  },

  async getSession() {
    const { data } = await requireSupabase().auth.getSession()
    if (!data.session) return null
    return { user: toAuthUser(data.session.user), accessToken: data.session.access_token }
  },

  onSessionChange(listener) {
    // 설정이 없으면 구독할 대상도 없습니다. 여기서 던지면 앱이 통째로 죽습니다.
    if (!supabase) return () => {}

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(
        session
          ? { user: toAuthUser(session.user), accessToken: session.access_token }
          : null,
      )
    })
    return () => data.subscription.unsubscribe()
  },
}
