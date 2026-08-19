import { Spinner } from './Spinner'

/**
 * 세션 복원처럼 화면 전체가 결정을 기다릴 때 씁니다.
 * null 을 반환하면 잠깐 흰 화면이 되어 "멈춘 것"처럼 보입니다.
 */
export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}
