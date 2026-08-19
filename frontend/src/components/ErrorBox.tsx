/**
 * 에러 표시. api.md 의 공통 에러 구조({ code, message })에서 message 만 보여줍니다.
 * code 는 분기용이라 사용자에게 노출하지 않습니다.
 */
export function ErrorBox({ error }: { error: Error | null }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error.message}
    </p>
  )
}
