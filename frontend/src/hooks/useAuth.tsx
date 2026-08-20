/**
 * ★ 상태관리 이음매 (Role 5).
 *
 * 컴포넌트는 src/api/ 를 직접 부르지 않고 이 훅만 씁니다(규칙 1).
 * 서버 상태관리를 나중에 TanStack Query / Zustand 중 무엇으로 정하든
 * 바뀌는 곳은 이 파일 안뿐입니다.
 *
 * 로그인 상태는 화면 전역이 공유하므로 Context 로 둡니다.
 * (전역 상태 라이브러리를 넣지 않습니다 — 아직 미결정이고, 지금은 필요도 없습니다)
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { auth, setAccessToken, LOGIN_ID_RULE, MIN_PASSWORD_LENGTH } from '@/api'
import type { AuthUser } from '@/types/api'

interface AuthContextValue {
  user: AuthUser | null
  /**
   * 현재 세션의 Supabase access token.
   * LMS 탭 콘솔에서 F2 sendLmsSchedules() 를 실행할 때 붙여넣기용으로만 노출합니다
   * (frontend/src/lms/README.md — 시연 절차). 그 외 컴포넌트는 이 값으로 직접 fetch 하지 않습니다.
   */
  accessToken: string | null
  /** 새로고침 직후 저장된 세션을 복원하는 중 */
  isLoading: boolean
  signIn: (loginId: string, password: string) => Promise<void>
  /** 가입 성공 시 true 를 돌려주면 아직 로그인되지 않았다는 뜻입니다(세션 없음). */
  signUp: (loginId: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  isSigningIn: boolean
  signInError: Error | null
  isSigningUp: boolean
  signUpError: Error | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<Error | null>(null)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [signUpError, setSignUpError] = useState<Error | null>(null)

  // 새로고침해도 로그인이 풀리지 않도록 세션을 복원하고,
  // 그 뒤로는 세션 변화(토큰 자동 갱신 · 다른 탭에서의 로그아웃)를 계속 따라갑니다.
  useEffect(() => {
    let cancelled = false

    // 토큰이 갱신될 때마다 client.ts 의 Bearer 토큰을 바꿔줍니다.
    // 이게 없으면 탭을 1시간 켜둔 뒤 모든 요청이 401 이 됩니다.
    const unsubscribe = auth.onSessionChange((session) => {
      if (cancelled) return
      setAccessToken(session?.accessToken ?? null)
      setAccessTokenState(session?.accessToken ?? null)
      setUser(session?.user ?? null)
    })

    auth
      .getSession()
      .then((session) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        setAccessToken(session?.accessToken ?? null)
        setAccessTokenState(session?.accessToken ?? null)
      })
      .catch(() => {
        // 세션 복원 실패는 "로그아웃 상태"와 같습니다. 화면에 에러를 띄우지 않습니다.
        if (!cancelled) {
          setUser(null)
          setAccessTokenState(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (loginId: string, password: string) => {
    setIsSigningIn(true)
    setSignInError(null)
    try {
      const session = await auth.signIn(loginId, password)
      setAccessToken(session.accessToken)
      setAccessTokenState(session.accessToken)
      setUser(session.user)
    } catch (e) {
      const error = e instanceof Error ? e : new Error('로그인에 실패했습니다.')
      setSignInError(error)
      throw error
    } finally {
      setIsSigningIn(false)
    }
  }, [])

  const signUp = useCallback(async (loginId: string, password: string) => {
    setIsSigningUp(true)
    setSignUpError(null)
    try {
      const { session } = await auth.signUp(loginId, password)
      if (!session) return true // 별도 승인 필요 — 아직 로그인 상태가 아닙니다
      setAccessToken(session.accessToken)
      setAccessTokenState(session.accessToken)
      setUser(session.user)
      return false
    } catch (e) {
      const error = e instanceof Error ? e : new Error('회원가입에 실패했습니다.')
      setSignUpError(error)
      throw error
    } finally {
      setIsSigningUp(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
    setAccessToken(null)
    setAccessTokenState(null)
    setUser(null)
    setSignInError(null)
    setSignUpError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      signIn,
      signUp,
      signOut,
      isSigningIn,
      signInError,
      isSigningUp,
      signUpError,
    }),
    [user, accessToken, isLoading, signIn, signUp, signOut, isSigningIn, signInError, isSigningUp, signUpError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** 회원가입 폼이 쓰는 규칙. 원본은 api/auth.ts 한 곳입니다. */
export { MIN_PASSWORD_LENGTH, LOGIN_ID_RULE }

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 는 <AuthProvider> 안에서만 쓸 수 있습니다.')
  return ctx
}
