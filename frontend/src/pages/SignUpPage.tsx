/** 회원가입 화면 (Role 5). */
import { Link, Navigate } from 'react-router-dom'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { SignUpForm } from '@/features/auth/SignUpForm'
import { useAuth } from '@/hooks/useAuth'

export function SignUpPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <FullPageSpinner />
  if (user) return <Navigate to="/teams" replace />

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">회원가입</h1>
      <p className="mb-6 text-sm text-slate-500">WhenWe 계정을 만듭니다.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-medium text-slate-900 underline underline-offset-2">
          로그인
        </Link>
      </p>
    </main>
  )
}
