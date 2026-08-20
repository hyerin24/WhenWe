/**
 * 라우터 정의만 둡니다. 여기에 로직을 넣지 않습니다.
 * (공용 파일이라 충돌이 나기 쉬운데, 라우트 한 줄씩이면 3초 안에 풉니다)
 */
import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { HeatmapPage } from '@/pages/HeatmapPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { useAuth } from '@/hooks/useAuth'

/** 로그인 여부 분기. 추상화하지 않고 한 곳에서만 씁니다. */
function RequireAuth({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/teams" element={<RequireAuth><TeamsPage /></RequireAuth>} />
        <Route path="/heatmap" element={<RequireAuth><HeatmapPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/teams" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
