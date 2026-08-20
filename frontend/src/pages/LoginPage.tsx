/** 로그인 화면 (Role 5). */
import { Navigate } from 'react-router-dom'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { LoginForm } from '@/features/auth/LoginForm'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <FullPageSpinner />
  if (user) return <Navigate to="/teams" replace />

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">WhenWe</h1>
      <p className="mb-6 text-sm text-slate-500">팀원 모두가 가능한 시간을 찾아줍니다.</p>
      <LoginForm />
    </main>
  )
}
