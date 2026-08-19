/**
 * 회원가입 폼 (Role 5).
 *
 * 이메일·전화번호는 받지 않습니다. 서비스 고유 아이디와 비밀번호만 받습니다.
 * 컴포넌트는 src/api/ 를 직접 부르지 않습니다 — useAuth 만 씁니다(규칙 1).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/Button'
import { ErrorBox } from '@/components/ErrorBox'
import { Field } from '@/components/Field'
import { LOGIN_ID_RULE, MIN_PASSWORD_LENGTH, useAuth } from '@/hooks/useAuth'

export function SignUpForm() {
  const { signUp, isSigningUp, signUpError } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [localError, setLocalError] = useState<Error | null>(null)
  const [needsApproval, setNeedsApproval] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)

    // 서버에 보내기 전에 걸러지는 것만 여기서 봅니다. 아이디 규칙은 서버가 최종 판정합니다.
    if (password !== passwordConfirm) {
      setLocalError(new Error('비밀번호가 서로 다릅니다.'))
      return
    }

    try {
      // 세션이 바로 생기면 App 라우터가 /teams 로 보냅니다.
      setNeedsApproval(await signUp(loginId, password))
    } catch {
      // 실패는 signUpError 로 화면에 표시됩니다.
    }
  }

  if (needsApproval) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
        <strong className="font-mono">{loginId}</strong> 계정이 만들어졌습니다. 로그인해주세요.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="아이디"
        id="signup-login-id"
        autoComplete="username"
        required
        minLength={LOGIN_ID_RULE.min}
        maxLength={LOGIN_ID_RULE.max}
        value={loginId}
        // 대소문자 구분으로 헷갈리지 않도록 입력 단계에서 소문자로 통일합니다.
        onChange={(e) => setLoginId(e.target.value.toLowerCase())}
        placeholder="whenwe_user"
        className="font-mono"
      />
      <p className="-mt-2 text-xs text-slate-500">{LOGIN_ID_RULE.description}</p>

      <Field
        label={`비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
        id="signup-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="비밀번호 확인"
        id="signup-password-confirm"
        type="password"
        autoComplete="new-password"
        required
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      />

      <ErrorBox error={localError ?? signUpError} />

      <Button type="submit" disabled={isSigningUp} className="w-full">
        {isSigningUp ? '가입하는 중…' : '회원가입'}
      </Button>
    </form>
  )
}
