/**
 * Mock 인증 (Role 5). .env 없이 clone 직후 바로 돌려보기 위한 가짜 구현입니다.
 *
 * 이메일·전화번호는 받지 않습니다. 아이디와 비밀번호만 씁니다.
 *
 * 이 파일을 직접 import 하는 곳은 src/api/index.ts 뿐입니다.
 * (같은 mock 레이어인 teams.mock.ts 는 현재 로그인 사용자를 알기 위해 예외적으로 참조합니다)
 */
import { MIN_PASSWORD_LENGTH, validateLoginId } from '../auth'
import type { AuthApi } from '../auth'
import { ApiError } from '../client'
import type { Session } from '@/types/api'

/** 로딩 UI 가 실제로 보이도록 약간의 지연을 줍니다. */
export const MOCK_LATENCY_MS = 350
export const delay = (ms = MOCK_LATENCY_MS) => new Promise((r) => setTimeout(r, ms))

interface MockAccount {
  loginId: string
  password: string
  userId: string
  note: string
}

/** 로그인 화면에 그대로 안내되는 테스트 계정입니다. 실제 비밀번호가 아닙니다. */
export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  { loginId: 'demo', password: 'whenwe1234', userId: 'u_demo', note: '팀 2개' },
  { loginId: 'newbie', password: 'whenwe1234', userId: 'u_newbie', note: '팀 없음(빈 목록)' },
]

/** 회원가입으로 늘어나는 계정 목록. 새로고침하면 위 두 개로 돌아갑니다. */
const registered: MockAccount[] = [...MOCK_ACCOUNTS]
let nextUserSeq = 0

const SESSION_KEY = 'whenwe.mock.session'

/** 현재 로그인한 mock 사용자. teams.mock.ts 가 사용자별 데이터를 고를 때 참조합니다. */
let currentSession: Session | null = readStoredSession()

export function getMockUserId(): string | null {
  return currentSession?.user.userId ?? null
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function startSession(account: MockAccount): Session {
  const session: Session = {
    user: { userId: account.userId, loginId: account.loginId },
    accessToken: `mock-token-${account.userId}`,
  }
  currentSession = session
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export const mockAuthApi: AuthApi = {
  async signIn(loginId, password) {
    await delay()

    const account = registered.find((a) => a.loginId === loginId.trim().toLowerCase())
    if (!account || account.password !== password) {
      throw new ApiError(401, {
        code: 'INVALID_CREDENTIALS',
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      })
    }

    return startSession(account)
  },

  async signUp(loginId, password) {
    await delay()

    const id = loginId.trim().toLowerCase()

    const invalid = validateLoginId(id)
    if (invalid) {
      throw new ApiError(400, { code: 'INVALID_LOGIN_ID', message: invalid })
    }
    if (registered.some((a) => a.loginId === id)) {
      throw new ApiError(409, { code: 'LOGIN_ID_ALREADY_EXISTS', message: '이미 사용 중인 아이디입니다.' })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ApiError(400, {
        code: 'WEAK_PASSWORD',
        message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
      })
    }

    const account: MockAccount = { loginId: id, password, userId: `u_new_${++nextUserSeq}`, note: '가입한 계정' }
    registered.push(account)

    // mock 은 승인 단계가 없으므로 가입 즉시 로그인된 세션을 돌려줍니다.
    return { session: startSession(account) }
  },

  // mock 은 토큰이 만료되지 않으므로 알릴 변화가 없습니다. 계약만 맞춥니다.
  onSessionChange() {
    return () => {}
  },

  async signOut() {
    await delay(100)
    currentSession = null
    localStorage.removeItem(SESSION_KEY)
  },

  async getSession() {
    await delay(100)
    currentSession = readStoredSession()
    return currentSession
  },
}
