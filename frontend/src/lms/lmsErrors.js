/**
 * F1 · LMS Calendar HTML 수집 — 에러 타입
 *
 * fetchLmsCalendarHtml()이 실패 케이스를 값이 아니라 타입으로 구분해 던진다.
 * F2(파싱)는 이 타입을 보고 재로그인 안내 / 재시도 등을 다르게 처리한다.
 */

/** 로그인되어 있지 않음 (세션 쿠키 자체가 없거나 만료 전부터 미로그인) */
export class LmsAuthError extends Error {
  constructor(message = 'LMS에 로그인되어 있지 않습니다.') {
    super(message)
    this.name = 'LmsAuthError'
  }
}

/** 로그인은 했었지만 세션이 만료되어 로그인 페이지로 리다이렉트됨 */
export class LmsSessionExpiredError extends Error {
  constructor(message = 'LMS 세션이 만료되었습니다.') {
    super(message)
    this.name = 'LmsSessionExpiredError'
  }
}

/** 응답은 왔지만 예상한 Calendar 페이지 구조가 아님 (LMS 쪽 마크업 변경 등) */
export class LmsResponseFormatError extends Error {
  constructor(message = 'LMS Calendar 응답 형식이 예상과 다릅니다.') {
    super(message)
    this.name = 'LmsResponseFormatError'
  }
}
