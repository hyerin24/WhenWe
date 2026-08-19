import { LmsAuthError, LmsResponseFormatError } from './lmsErrors.js'

const LMS_ORIGIN = 'https://lms.kyonggi.ac.kr'

/**
 * 대상 월에 속하는 것이 확실한 유닉스 타임스탬프(초)를 구한다.
 * LMS Calendar URL의 `time` 파라미터가 이 값이다.
 *
 * 월 1일 00:00 KST로 계산했더니 서버가 이 값을 KST가 아닌 다른 시간대로 해석해서
 * 하루 전(=이전 달)으로 인식하는 문제가 실측으로 확인됐다
 * (2026-07 목표로 계산한 값을 요청했더니 실제로는 "2026년 6월"이 렌더링됨).
 * 그래서 시간대 차이에 영향받지 않도록 월 중순(15일)을 기준으로 잡는다.
 * (검증: 2026-07-15 12:00 UTC 기준 값을 요청 -> 실제 응답 "2026년 7월" 확인됨)
 *
 * @param {number} year
 * @param {number} month 1~12
 */
function getMidMonthUnixSeconds(year, month) {
  return Math.floor(Date.UTC(year, month - 1, 15, 12, 0, 0) / 1000)
}

/**
 * 사용자 브라우저에서 실행되어, 이미 로그인된 본인의 경기대학교 LMS 세션으로
 * Calendar HTML을 가져온다. (F1 — docs/FEATURES.md 참고)
 *
 * 서버가 대신 호출하지 않는다. 반드시 사용자 브라우저에서, credentials 포함 fetch로 실행한다.
 *
 * @param {{ year: number, month: number, courseId?: number }} params
 * @returns {Promise<{ html: string, fetchedAt: string, range: { year: number, month: number } }>}
 * @throws {LmsAuthError} 미로그인(게스트 상태) — 세션 만료로 이렇게 된 것인지는 이 함수만으로 알 수 없다.
 *   "직전까지 로그인돼 있었는지"를 아는 건 호출 쪽이므로, 필요하면 호출 쪽에서
 *   LmsAuthError를 LmsSessionExpiredError로 다시 던지는 방식으로 구분한다.
 * @throws {LmsResponseFormatError}
 */
export async function fetchLmsCalendarHtml({ year, month, courseId = 1 }) {
  const time = getMidMonthUnixSeconds(year, month)
  const url = `${LMS_ORIGIN}/calendar/view.php?view=month&course=${courseId}&time=${time}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new LmsResponseFormatError(`예상치 못한 응답 상태: ${response.status}`)
  }

  const html = await response.text()

  // 실측 확인됨: 미로그인 상태에서도 200 OK + <body id="page-calendar-view">가 그대로 내려온다
  // (리다이렉트도 안 되고 로그인 폼도 안 나옴 — 개인 일정 없는 게스트용 캘린더가 보임).
  // 대신 Moodle이 body class에 붙이는 "notloggedin" 마커로 구분한다.
  // 주의: 이 마커만으로는 "한 번도 로그인 안 함"과 "세션 만료로 풀림"을 구분 못한다.
  // 구분하려면 호출 쪽에서 "직전까지 로그인 상태였는지" 별도로 기억해야 한다.
  if (/<body[^>]*class="[^"]*\bnotloggedin\b[^"]*"/.test(html)) {
    throw new LmsAuthError()
  }

  // 캘린더 페이지라면 있어야 할 최소 마커. 없으면 LMS 쪽 마크업이 바뀐 것으로 본다.
  if (!html.includes('id="page-calendar-view"')) {
    throw new LmsResponseFormatError()
  }

  return {
    html,
    fetchedAt: new Date().toISOString(),
    range: { year, month },
  }
}
