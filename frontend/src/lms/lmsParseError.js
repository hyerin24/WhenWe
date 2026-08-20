/**
 * F2 · Calendar HTML 파싱 — 에러 타입
 *
 * F1(수집)의 에러(`lmsErrors.js` — 미로그인 / 세션 만료 / 응답 형식)와 구분한다.
 * F1을 통과한 HTML인데도 캘린더 구조를 찾지 못한 경우에만 이 에러를 던진다.
 *
 * TODO(#3 머지 후): `lmsErrors.js`로 합쳐도 된다. 지금은 F1 파일과 충돌하지 않도록 분리해 둔다.
 */

/** 캘린더 표/일정 목록 자체를 찾을 수 없음 (LMS 마크업 변경 등) */
export class LmsParseError extends Error {
  constructor(message = 'LMS Calendar HTML에서 일정 표를 찾지 못했습니다.') {
    super(message)
    this.name = 'LmsParseError'
  }
}
