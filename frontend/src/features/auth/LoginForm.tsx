/**
 * 로그인 폼 (Role 5). 아이디 + 비밀번호만 받습니다.
 * 컴포넌트는 src/api/ 를 직접 부르지 않습니다 — useAuth 만 씁니다(규칙 1).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { ErrorBox } from '@/components/ErrorBox'
import { Field } from '@/components/Field'
import { useAuth } from '@/hooks/useAuth'
import { useMockHints } from '@/hooks/useMockHints'

export function LoginForm() {
  const { signIn, isSigningIn, signInError } = useAuth()
  const mockHints = useMockHints()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // 실패는 signInError 로 화면에 표시되므로 여기서는 삼킵니다.
    await signIn(loginId, password).catch(() => {})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="아이디"
        id="login-id"
        autoComplete="username"
        required
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)}
        placeholder="아이디를 입력하세요"
      />
      <Field
        label="비밀번호"
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <ErrorBox error={signInError} />

      <div className="space-y-2">
        <Button type="submit" disabled={isSigningIn} className="w-full">
          {isSigningIn ? '로그인 중…' : '로그인'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={isSigningIn}
          onClick={() => navigate('/signup')}
        >
          회원가입
        </Button>
      </div>

      {mockHints && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-medium">Mock 모드 테스트 계정 (비밀번호 whenwe1234)</p>
          <ul className="mt-1 space-y-0.5">
            {mockHints.accounts.map((a) => (
              <li key={a.loginId}>
                <button
                  type="button"
                  className="font-mono underline underline-offset-2"
                  onClick={() => {
                    setLoginId(a.loginId)
                    setPassword(a.password)
                  }}
                >
                  {a.loginId}
                </button>{' '}
                — {a.note}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-amber-700">아무 비밀번호나 넣으면 로그인 실패 화면을 볼 수 있습니다.</p>
        </div>
      )}
    </form>
  )
}
