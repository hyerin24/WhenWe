/**
 * ISO 8601 UTC ↔ 로컬 표시 변환을 이 파일 하나에 가둡니다.
 *
 * api.md 확정 규칙: 저장·전송은 UTC, 표시용 타임존 변환은 프론트 책임.
 * 히트맵(날짜×시간 슬롯)이 이 변환을 화면 전역에 퍼뜨리므로, 여기 밖에서
 * new Date(...).getHours() 같은 계산을 직접 하지 않습니다.
 * (그러면 9시간 오프셋 버그가 각자 코드에 따로 박힙니다)
 *
 * 우선 네이티브 Date/Intl 로 시작합니다. 슬롯 계산이 지저분해지면 그때 date-fns 를 넣습니다.
 */

/** "2026-08-19T09:00:00Z" → "2026. 8. 19." (브라우저 로컬 타임존) */
export function formatDate(isoUtc: string): string {
  return new Date(isoUtc).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** "2026-08-19T00:00:00Z" → "09:00" (KST 기준). 히트맵 슬롯 라벨용. */
export function formatTime(isoUtc: string): string {
  return new Date(isoUtc).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "2026-08-19T09:00:00Z" → "2026. 8. 19. 18:00" */
export function formatDateTime(isoUtc: string): string {
  return `${formatDate(isoUtc)} ${formatTime(isoUtc)}`
}

/** 현재 시각을 ISO 8601 UTC 문자열로. 서버로 보낼 값은 항상 이걸 씁니다. */
export function nowUtc(): string {
  return new Date().toISOString()
}
