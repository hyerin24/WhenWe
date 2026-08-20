/**
 * 자동 생성 파일 — 직접 고치지 마세요.
 * 원본: frontend/src/lms/*.js (F1·F2). 이 파일을 다시 만들려면
 * `node extension/scripts/build-lms-bundle.js` 를 실행하세요.
 */

/* ── lmsErrors.js (원본 그대로, import/export만 제거) ── */
/**
 * F1 · LMS Calendar HTML 수집 — 에러 타입
 *
 * fetchLmsCalendarHtml()이 실패 케이스를 값이 아니라 타입으로 구분해 던진다.
 * F2(파싱)는 이 타입을 보고 재로그인 안내 / 재시도 등을 다르게 처리한다.
 */

/** 로그인되어 있지 않음 (세션 쿠키 자체가 없거나 만료 전부터 미로그인) */
class LmsAuthError extends Error {
  constructor(message = 'LMS에 로그인되어 있지 않습니다.') {
    super(message)
    this.name = 'LmsAuthError'
  }
}

/** 로그인은 했었지만 세션이 만료되어 로그인 페이지로 리다이렉트됨 */
class LmsSessionExpiredError extends Error {
  constructor(message = 'LMS 세션이 만료되었습니다.') {
    super(message)
    this.name = 'LmsSessionExpiredError'
  }
}

/** 응답은 왔지만 예상한 Calendar 페이지 구조가 아님 (LMS 쪽 마크업 변경 등) */
class LmsResponseFormatError extends Error {
  constructor(message = 'LMS Calendar 응답 형식이 예상과 다릅니다.') {
    super(message)
    this.name = 'LmsResponseFormatError'
  }
}


/* ── lmsParseError.js (원본 그대로, import/export만 제거) ── */
/**
 * F2 · Calendar HTML 파싱 — 에러 타입
 *
 * F1(수집)의 에러(`lmsErrors.js` — 미로그인 / 세션 만료 / 응답 형식)와 구분한다.
 * F1을 통과한 HTML인데도 캘린더 구조를 찾지 못한 경우에만 이 에러를 던진다.
 *
 * TODO(#3 머지 후): `lmsErrors.js`로 합쳐도 된다. 지금은 F1 파일과 충돌하지 않도록 분리해 둔다.
 */

/** 캘린더 표/일정 목록 자체를 찾을 수 없음 (LMS 마크업 변경 등) */
class LmsParseError extends Error {
  constructor(message = 'LMS Calendar HTML에서 일정 표를 찾지 못했습니다.') {
    super(message)
    this.name = 'LmsParseError'
  }
}


/* ── classifyLmsEvent.js (원본 그대로, import/export만 제거) ── */
/**
 * F2 · 일정 종류(과제/시험/수업) 분류
 *
 * 판단 근거를 확실한 것부터 순서대로 본다.
 *   1. Moodle 모듈명 — 아이콘 이미지 주소나 `/mod/<모듈>/view.php` 링크에서 나온다. 가장 정확하다
 *   2. 아이콘 title — LMS가 한국어로 붙여 준 이름("과제", "퀴즈", "설문조사")
 *   3. 제목 키워드 — 위 둘이 없는 월(month) 뷰에서 쓰는 마지막 수단
 *
 * 어느 것으로도 판단이 안 되면 임의로 찍지 않고 `'unknown'`을 준다.
 * (FEATURES F2 완료 조건 — "비어 있으면 비었다고 표시")
 *
 * 정제 단계(F3)가 다시 분류할 수 있도록 `module`도 같이 넘긴다.
 */

/** 최종 분류값. 서버(F3)와 합의 전이므로 이 목록이 바뀔 수 있다. */
const EVENT_KINDS = Object.freeze({
  ASSIGNMENT: 'assignment', // 과제
  EXAM: 'exam', // 시험 · 퀴즈
  CLASS: 'class', // 수업 · 출석 · 강의 자료
  OTHER: 'other', // 설문 등 위 셋에 안 들어가는 LMS 활동
  UNKNOWN: 'unknown', // 판단 근거 없음
})

const MODULE_KIND = {
  assign: EVENT_KINDS.ASSIGNMENT,
  assignment: EVENT_KINDS.ASSIGNMENT,
  turnitintooltwo: EVENT_KINDS.ASSIGNMENT,
  quiz: EVENT_KINDS.EXAM,
  attendance: EVENT_KINDS.CLASS,
  ubattendance: EVENT_KINDS.CLASS,
  lesson: EVENT_KINDS.CLASS,
  scorm: EVENT_KINDS.CLASS,
  vod: EVENT_KINDS.CLASS,
  zoom: EVENT_KINDS.CLASS,
  lti: EVENT_KINDS.CLASS,
  feedback: EVENT_KINDS.OTHER,
  choice: EVENT_KINDS.OTHER,
  questionnaire: EVENT_KINDS.OTHER,
  survey: EVENT_KINDS.OTHER,
}

const ICON_LABEL_KIND = [
  [/과제|레포트|리포트/, EVENT_KINDS.ASSIGNMENT],
  [/퀴즈|시험/, EVENT_KINDS.EXAM],
  [/출석|강의|동영상|학습/, EVENT_KINDS.CLASS],
  [/설문/, EVENT_KINDS.OTHER],
]

const TITLE_KIND = [
  // 설문을 먼저 걸러낸다. "블렌디드러닝 **수업** 만족도조사" 같은 제목이 '수업'으로 잡히면 안 된다.
  [/설문|만족도\s*조사|\bsurvey\b|\bfeedback\b/i, EVENT_KINDS.OTHER],
  [/중간고사|기말고사|시험|퀴즈|\bexam\b|\bquiz\b/i, EVENT_KINDS.EXAM],
  [/과제|레포트|리포트|보고서|제출\s*마감|\bassignment\b|\bhomework\b/i, EVENT_KINDS.ASSIGNMENT],
  [/수업|강의|출석|보강|휴강|특강|\bclass\b|\blecture\b/i, EVENT_KINDS.CLASS],
]

/**
 * 아이콘 이미지 주소에서 Moodle 모듈명을 뽑는다.
 * 경기대 LMS(coursemos 테마)는 `/theme/image.php/<테마>/<모듈>/<rev>/icon` 형태이고,
 * 기본 Moodle 테마는 `/pix/mod/<모듈>/icon` 형태다. 둘 다 받는다.
 */
function moduleFromIconSrc(src) {
  if (!src) return null
  const themed = src.match(/\/theme\/image\.php\/[^/]+\/([a-z0-9_]+)\/\d+\/icon/i)
  if (themed) return themed[1].toLowerCase()
  const pix = src.match(/\/pix\/mod\/([a-z0-9_]+)\//i)
  if (pix) return pix[1].toLowerCase()
  return null
}

/** `/mod/<모듈>/view.php?id=...` 링크에서 모듈명을 뽑는다. */
function moduleFromModuleUrl(url) {
  if (!url) return null
  const matched = url.match(/\/mod\/([a-z0-9_]+)\/[a-z0-9_]+\.php/i)
  return matched ? matched[1].toLowerCase() : null
}

/**
 * @param {{ module?: string|null, iconLabel?: string|null, title?: string|null }} hints
 * @returns {string} EVENT_KINDS 중 하나
 */
function classifyLmsEvent({ module = null, iconLabel = null, title = null } = {}) {
  if (module && MODULE_KIND[module]) return MODULE_KIND[module]

  if (iconLabel) {
    for (const [pattern, kind] of ICON_LABEL_KIND) {
      if (pattern.test(iconLabel)) return kind
    }
  }

  if (title) {
    for (const [pattern, kind] of TITLE_KIND) {
      if (pattern.test(title)) return kind
    }
  }

  return EVENT_KINDS.UNKNOWN
}


/* ── fetchLmsCalendarHtml.js (원본 그대로, import/export만 제거) ── */

const LMS_ORIGIN = 'https://lms.kyonggi.ac.kr'

// Moodle 응답만으로는 "한 번도 로그인 안 함"과 "로그인했다가 풀림"을 구분할 수 없어서
// (둘 다 notloggedin으로 동일하게 나옴), 브라우저에 "직전에 로그인 성공한 적 있는지"를
// 따로 기록해두고 그걸로 구분한다.
const WAS_AUTHENTICATED_KEY = 'lms:wasAuthenticated'

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

function wasPreviouslyAuthenticated() {
  return localStorage.getItem(WAS_AUTHENTICATED_KEY) === 'true'
}

function markAuthenticated() {
  localStorage.setItem(WAS_AUTHENTICATED_KEY, 'true')
}

function clearAuthenticatedFlag() {
  localStorage.removeItem(WAS_AUTHENTICATED_KEY)
}

/**
 * 사용자 브라우저에서 실행되어, 이미 로그인된 본인의 경기대학교 LMS 세션으로
 * Calendar HTML을 가져온다. (F1 — docs/FEATURES.md 참고)
 *
 * 서버가 대신 호출하지 않는다. 반드시 사용자 브라우저에서, credentials 포함 fetch로 실행한다.
 *
 * @param {{ year: number, month: number, courseId?: number }} params
 * @returns {Promise<{ html: string, fetchedAt: string, range: { year: number, month: number } }>}
 * @throws {LmsAuthError} 한 번도 로그인한 적 없음
 * @throws {LmsSessionExpiredError} 로그인했다가 세션이 풀림 (localStorage 기록 기준)
 * @throws {LmsResponseFormatError}
 */
async function fetchLmsCalendarHtml({ year, month, courseId = 1 }) {
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
  if (/<body[^>]*class="[^"]*\bnotloggedin\b[^"]*"/.test(html)) {
    if (wasPreviouslyAuthenticated()) {
      clearAuthenticatedFlag()
      throw new LmsSessionExpiredError()
    }
    throw new LmsAuthError()
  }

  // 캘린더 페이지라면 있어야 할 최소 마커. 없으면 LMS 쪽 마크업이 바뀐 것으로 본다.
  if (!html.includes('id="page-calendar-view"')) {
    throw new LmsResponseFormatError()
  }

  markAuthenticated()

  return {
    html,
    fetchedAt: new Date().toISOString(),
    range: { year, month },
  }
}


/* ── parseLmsCalendarHtml.js (원본 그대로, import/export만 제거) ── */
/**
 * F2 · Calendar HTML 파싱 · 일정 항목 추출
 *
 * F1(`fetchLmsCalendarHtml.js`)이 확보한 HTML에서 일정 항목을 뽑아 **일정 JSON**을 만든다.
 * 정제(중복 제거 · 공통 스키마 변환)는 하지 않는다 — 서버(F3)의 몫이다.
 *
 * 실행 위치는 **사용자 브라우저**다. `DOMParser`를 쓰므로 서버(Node)에서는 동작하지 않는다.
 *
 * 실제 마크업 (경기대 LMS · Moodle coursemos 테마, 2026-08 실측)
 *
 *   [월 뷰] view=month
 *   <table class="calendarmonth calendartable" summary="2026년 7월 캘린더">
 *     <td class="day nottoday cell c2">
 *       <div class="day"><a title="5 일정" href="...view=day&course=1&time=1782831600">1</a></div>
 *       <ul class="events-new">
 *         <li class="calendar_event_global"><a href="...#event_521535">제목</a></li>
 *       </ul>
 *     </td>
 *
 *   [일 뷰] view=day — 월 뷰에 없는 **시각 · 과목명 · 모듈 아이콘**이 여기에 있다
 *   <div class="eventlist">
 *     <div class="event" id="event_521535">
 *       <img class="icon" src=".../coursemosv2/feedback/.../icon" title="설문조사" />
 *       <h3 class="referer"><a href=".../mod/feedback/view.php?id=1081970">제목</a></h3>
 *       <span class="date"><span class="dimmed_text">00:00</span></span>
 *       <div class="course"><a href=".../course/view.php?id=1">과목명</a></div>
 *
 * 월 뷰에는 시각이 아예 없다. 그래서 `startAt` / `endAt`은 `null`, `hasTime: false`로 두고,
 * 시각이 필요하면 같은 날짜의 일 뷰 HTML을 `parseLmsDayHtml()`에 넣어 채운다.
 * (없는 시각을 00:00으로 채워 넣지 않는다 — F3·F7이 진짜 자정 마감과 구분하지 못하게 된다)
 */


const LMS_HOST = 'lms.kyonggi.ac.kr'
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 파싱 실패 사유. 실패 항목의 **원문은 남기지 않고** 위치와 사유만 남긴다. */
const PARSE_FAILURE_REASONS = Object.freeze({
  MISSING_TITLE: 'MISSING_TITLE', // 항목은 있는데 제목을 못 읽음
  MISSING_DATE: 'MISSING_DATE', // 날짜 칸을 못 읽음
  DAY_COUNT_MISMATCH: 'DAY_COUNT_MISMATCH', // LMS가 표시한 개수보다 적게 뽑힘
})

function requireDomParser() {
  if (typeof DOMParser === 'undefined') {
    throw new LmsParseError(
      'DOMParser를 쓸 수 없습니다. 이 파싱은 사용자 브라우저에서 실행해야 합니다.',
    )
  }
}

function toDocument(html) {
  requireDomParser()
  if (typeof html !== 'string' || html.trim() === '') {
    throw new LmsParseError('파싱할 HTML이 비어 있습니다.')
  }
  return new DOMParser().parseFromString(html, 'text/html')
}

/** F1의 반환값 `{ html, fetchedAt, range }`도, HTML 문자열도 그대로 받는다. */
function normalizeInput(input) {
  if (typeof input === 'string') return { html: input, fetchedAt: null, range: null }
  if (input && typeof input.html === 'string') {
    return {
      html: input.html,
      fetchedAt: input.fetchedAt ?? null,
      range: input.range ?? null,
    }
  }
  throw new LmsParseError('파싱 입력이 올바르지 않습니다. { html } 또는 HTML 문자열이 필요합니다.')
}

function text(node) {
  return node ? node.textContent.replace(/\s+/g, ' ').trim() : ''
}

/** LMS의 하루 시작(KST 자정) 유닉스 초 → `YYYY-MM-DD` */
function kstDateFromUnixSeconds(seconds) {
  if (!Number.isFinite(seconds)) return null
  return new Date(seconds * 1000 + KST_OFFSET_MS).toISOString().slice(0, 10)
}

function unixSecondsFromHref(href) {
  const matched = href && href.match(/[?&]time=(\d+)/)
  return matched ? Number(matched[1]) : NaN
}

function eventIdFromHref(href) {
  const matched = href && href.match(/#event_(\d+)/)
  return matched ? matched[1] : null
}

/** `YYYY-MM-DD` + `HH:MM`(KST) → ISO 8601 UTC 문자열 (docs/api.md 공통 규칙) */
function toUtcIso(dateKst, time) {
  if (!dateKst || !time) return null
  const parsed = new Date(`${dateKst}T${time}:00+09:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().replace('.000Z', 'Z')
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

/**
 * 이 표가 몇 년 몇 월인지 정한다.
 * `summary="2026년 7월 캘린더"` → 이전 달 링크의 `time` → 호출자가 넘긴 range 순으로 본다.
 */
function resolveMonth(table, range) {
  const summary = table.getAttribute('summary') || ''
  const fromSummary = summary.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/)
  if (fromSummary) {
    return { year: Number(fromSummary[1]), month: Number(fromSummary[2]) }
  }

  const previous = table.ownerDocument.querySelector('a.arrow_link.previous[href*="time="]')
  const previousDate = kstDateFromUnixSeconds(
    unixSecondsFromHref(previous && previous.getAttribute('href')),
  )
  if (previousDate) {
    const [year, month] = previousDate.split('-').map(Number)
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  }

  if (range && Number.isFinite(Number(range.year)) && Number.isFinite(Number(range.month))) {
    return { year: Number(range.year), month: Number(range.month) }
  }
  return null
}

/** 날짜 칸(td)에서 그 날의 `YYYY-MM-DD`를 구한다. */
function resolveCellDate(cell, month) {
  const dayLink = cell.querySelector('div.day a[href*="time="]')
  const fromLink = kstDateFromUnixSeconds(
    unixSecondsFromHref(dayLink && dayLink.getAttribute('href')),
  )
  if (fromLink) return fromLink

  const dayNumber = Number((text(cell.querySelector('div.day')).match(/\d+/) || [])[0])
  if (month && Number.isFinite(dayNumber) && dayNumber > 0) {
    return `${month.year}-${pad2(month.month)}-${pad2(dayNumber)}`
  }
  return null
}

/** LMS가 날짜 칸에 적어 둔 일정 개수(`title="5 일정"`). 뽑은 개수와 대조하는 데 쓴다. */
function expectedCountOfCell(cell) {
  const dayLink = cell.querySelector('div.day a[title]')
  const title = dayLink ? dayLink.getAttribute('title') || '' : ''
  const matched = title.match(/^(\d+)\s*(일정|events?)/i)
  return matched ? Number(matched[1]) : null
}

function scopeOfListItem(item) {
  const matched = (item.className || '').match(/calendar_event_([a-z]+)/i)
  return matched ? matched[1].toLowerCase() : 'unknown'
}

/**
 * 날짜 칸의 `<li>` 중 **진짜 일정인 것만** 고른다.
 * Moodle은 같은 칸에 "진행 중인 일정" 같은 안내용 `<li>`(`ul.events-underway`)도 넣는데,
 * 그건 일정 항목이 아니므로 건수에 넣으면 LMS 화면 개수와 어긋난다.
 */
function eventListItemsOfCell(cell) {
  return [...cell.querySelectorAll('ul li')].filter(
    (item) =>
      /calendar_event_/i.test(item.className || '') ||
      item.querySelector('a[href*="#event_"]') !== null,
  )
}

/**
 * 월(month) 뷰 HTML → 일정 JSON.
 *
 * @param {{ html: string, fetchedAt?: string, range?: { year: number, month: number } }|string} input
 *        F1 `fetchLmsCalendarHtml()`의 반환값을 그대로 넣으면 된다.
 * @returns {{
 *   items: Array<object>, itemCount: number,
 *   parseFailedCount: number,
 *   parseFailures: Array<{ reason: string, dateKst: string|null, index: number|null }>,
 *   view: 'month', range: { year: number, month: number }|null,
 *   collectedAt: string|null, source: string
 * }}
 * @throws {LmsParseError} 캘린더 표 자체를 찾지 못한 경우
 */
function parseLmsCalendarHtml(input) {
  const { html, fetchedAt, range } = normalizeInput(input)
  const doc = toDocument(html)

  const table = doc.querySelector('table.calendarmonth')
  if (!table) {
    throw new LmsParseError('월 캘린더 표(table.calendarmonth)를 찾지 못했습니다.')
  }

  const month = resolveMonth(table, range)
  const items = []
  const failures = []

  for (const cell of table.querySelectorAll('td.day')) {
    const listItems = eventListItemsOfCell(cell)
    if (listItems.length === 0) continue

    const dateKst = resolveCellDate(cell, month)

    listItems.forEach((listItem, index) => {
      const link = listItem.querySelector('a[href]')
      const title = text(link) || text(listItem)
      if (!title) {
        failures.push({ reason: PARSE_FAILURE_REASONS.MISSING_TITLE, dateKst, index })
        return
      }
      if (!dateKst) {
        failures.push({ reason: PARSE_FAILURE_REASONS.MISSING_DATE, dateKst: null, index })
        return
      }

      const href = link ? link.getAttribute('href') : null
      const icon = listItem.querySelector('img')
      const module = moduleFromIconSrc(icon && icon.getAttribute('src'))
      const iconLabel = icon ? icon.getAttribute('title') || icon.getAttribute('alt') : null

      items.push({
        sourceEventId: eventIdFromHref(href),
        title,
        dateKst,
        startAt: null, // 월 뷰에는 시각이 없다. 일 뷰(parseLmsDayHtml)로 채운다
        endAt: null,
        hasTime: false,
        kind: classifyLmsEvent({ module, iconLabel, title }),
        module,
        scope: scopeOfListItem(listItem),
        courseName: null,
        sourceUrl: href || null,
      })
    })

    // LMS 화면이 "N 일정"이라고 적어 둔 개수와 실제로 뽑은 개수를 대조한다.
    // (FEATURES F2 완료 조건 — "항목 수가 LMS 화면의 개수와 일치")
    const expected = expectedCountOfCell(cell)
    const parsed = listItems.length
    if (expected !== null && expected > parsed) {
      for (let i = parsed; i < expected; i += 1) {
        failures.push({ reason: PARSE_FAILURE_REASONS.DAY_COUNT_MISMATCH, dateKst, index: i })
      }
    }
  }

  return {
    items,
    itemCount: items.length,
    parseFailedCount: failures.length,
    parseFailures: failures,
    view: 'month',
    range: month,
    collectedAt: fetchedAt,
    source: LMS_HOST,
  }
}

/** 일 뷰 제목줄의 `2026년 7월 01일(수요일)`에서 날짜를 읽는다. */
function resolveDayDate(doc) {
  const current = text(doc.querySelector('.calendar-controls .current'))
  const matched = current.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (matched) {
    return `${matched[1]}-${pad2(matched[2])}-${pad2(matched[3])}`
  }

  // 제목줄을 못 읽으면 "이전 날" 링크의 시각 + 하루로 되짚는다.
  const previous = doc.querySelector('a.arrow_link.previous[href*="time="]')
  const previousSeconds = unixSecondsFromHref(previous && previous.getAttribute('href'))
  return kstDateFromUnixSeconds(previousSeconds + 24 * 60 * 60)
}

/** `00:00`, `10:00 » 12:00` → `{ start: '10:00', end: '12:00' }` */
function parseTimeRange(raw) {
  const times = raw.match(/\d{1,2}:\d{2}/g) || []
  return {
    start: times[0] ? times[0].padStart(5, '0') : null,
    end: times[1] ? times[1].padStart(5, '0') : null,
  }
}

/**
 * 일(day) 뷰 HTML → 일정 JSON. 월 뷰에 없는 **시각 · 과목명 · 모듈**이 채워진다.
 * 설명(description)은 개인 정보가 섞일 수 있어 **읽지 않는다.**
 *
 * @param {{ html: string, fetchedAt?: string }|string} input
 * @returns {object} `parseLmsCalendarHtml()`과 같은 모양 (`view: 'day'`)
 * @throws {LmsParseError} 일정 목록 영역을 찾지 못한 경우
 */
function parseLmsDayHtml(input) {
  const { html, fetchedAt } = normalizeInput(input)
  const doc = toDocument(html)

  const list = doc.querySelector('div.eventlist')
  if (!list) {
    throw new LmsParseError('일 캘린더의 일정 목록(div.eventlist)을 찾지 못했습니다.')
  }

  const dateKst = resolveDayDate(doc)
  const items = []
  const failures = []

  list.querySelectorAll('div.event[id^="event_"]').forEach((event, index) => {
    const titleLink = event.querySelector('h3 a[href]') || event.querySelector('h3')
    const title = text(titleLink)
    if (!title) {
      failures.push({ reason: PARSE_FAILURE_REASONS.MISSING_TITLE, dateKst, index })
      return
    }
    if (!dateKst) {
      failures.push({ reason: PARSE_FAILURE_REASONS.MISSING_DATE, dateKst: null, index })
      return
    }

    const icon = event.querySelector('img.icon') || event.querySelector('img')
    const moduleLink = event.querySelector('h3 a[href]')
    const moduleUrl = moduleLink ? moduleLink.getAttribute('href') : null
    const module =
      moduleFromIconSrc(icon && icon.getAttribute('src')) || moduleFromModuleUrl(moduleUrl)
    const iconLabel = icon ? icon.getAttribute('title') || icon.getAttribute('alt') : null
    const { start, end } = parseTimeRange(text(event.querySelector('span.date')))

    items.push({
      sourceEventId: (event.getAttribute('id') || '').replace('event_', '') || null,
      title,
      dateKst,
      startAt: toUtcIso(dateKst, start),
      endAt: toUtcIso(dateKst, end),
      hasTime: Boolean(start),
      kind: classifyLmsEvent({ module, iconLabel, title }),
      module,
      scope: 'unknown', // 일 뷰 마크업에는 global/course/user 구분이 없다
      courseName: text(event.querySelector('div.course a')) || null,
      sourceUrl: moduleUrl,
    })
  })

  return {
    items,
    itemCount: items.length,
    parseFailedCount: failures.length,
    parseFailures: failures,
    view: 'day',
    range: dateKst
      ? { year: Number(dateKst.slice(0, 4)), month: Number(dateKst.slice(5, 7)) }
      : null,
    collectedAt: fetchedAt,
    source: LMS_HOST,
  }
}

/** 두 항목을 합치되, `null`·`'unknown'`이 이미 채워진 값을 덮어쓰지 않게 한다. */
function mergeItem(base, override) {
  const merged = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value !== null && value !== undefined && value !== 'unknown') merged[key] = value
  }
  return merged
}

/**
 * 여러 번 파싱한 결과를 서버로 한 번에 보낼 하나의 payload로 합친다.
 * (F1이 월 단위로 fetch하므로 한 학기를 모으려면 여러 번 파싱하게 된다)
 *
 * 같은 `sourceEventId`는 **시각이 있는 쪽을 남긴다.** 월 뷰 항목을 일 뷰 항목이 덮어쓴다.
 * 본격적인 중복 제거·정규화는 서버(F3)가 한다.
 *
 * @param {Array<object>} results `parseLmsCalendarHtml()` / `parseLmsDayHtml()`의 결과들
 */
function mergeParsedCalendars(results) {
  const byKey = new Map()
  const failures = []
  let collectedAt = null

  for (const result of results) {
    if (!result) continue
    failures.push(...(result.parseFailures || []))
    if (result.collectedAt && (!collectedAt || result.collectedAt > collectedAt)) {
      collectedAt = result.collectedAt
    }

    for (const item of result.items) {
      const key = item.sourceEventId || `${item.dateKst}|${item.title}`
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, item)
        continue
      }
      // 시각을 가진 쪽(일 뷰)이 이기고, 나머지 칸은 먼저 채워진 값을 지킨다.
      const [base, override] = item.hasTime && !existing.hasTime ? [existing, item] : [item, existing]
      byKey.set(key, mergeItem(base, override))
    }
  }

  const items = [...byKey.values()].sort(
    (a, b) => a.dateKst.localeCompare(b.dateKst) || a.title.localeCompare(b.title),
  )

  return {
    items,
    itemCount: items.length,
    parseFailedCount: failures.length,
    parseFailures: failures,
    collectedAt,
    source: LMS_HOST,
  }
}


/* ── sendLmsSchedules.js (원본 그대로, import/export만 제거) ── */
/**
 * F2 · 파싱한 일정 JSON을 WhenWe 서버로 보낸다.
 *
 * 브라우저를 떠나는 것은 **일정 데이터뿐**이다.
 * LMS 세션 · 쿠키 · 학교 ID/PW는 보내지 않는다 (CLAUDE.md Secret 결정).
 *
 * ⚠️ **엔드포인트와 요청 바디는 아직 합의 전(DRAFT)이다.**
 * `docs/api.md`의 "브라우저 수집 결과 전달 (F2 → F3·F4)" 칸이 비어 있다.
 * 역할 3·4와 합의되면 `DRAFT_ENDPOINT` 상수와 `docs/api.md`를 같이 고친다.
 */

const DRAFT_ENDPOINT = '/api/lms/schedules' // ⚠️ 임시값 — 역할 4와 합의 후 확정
const PAYLOAD_VERSION = 'lms-raw-1' // 서버가 형태 변경을 알아볼 수 있게 붙인다

/** 서버가 `{ code, message }`로 돌려준 에러. 프론트는 `code`로 분기한다 (docs/api.md 공통 규칙) */
class LmsSendError extends Error {
  constructor(message, { status = null, code = null } = {}) {
    super(message)
    this.name = 'LmsSendError'
    this.status = status
    this.code = code
  }
}

/**
 * 파싱 결과에서 **서버로 보낼 것만** 골라 요청 바디를 만든다.
 *
 * 목록은 `{ items: [...] }`로 감싸고 형제 필드를 붙인다 (docs/api.md 공통 규칙).
 * 파싱 실패는 **건수와 위치만** 보낸다. 실패 항목의 원문 HTML은 보내지 않는다.
 *
 * @param {object} parsed `parseLmsCalendarHtml()` · `parseLmsDayHtml()` · `mergeParsedCalendars()`의 결과
 */
function buildLmsSchedulePayload(parsed) {
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new LmsSendError('보낼 일정 데이터가 없습니다.')
  }

  return {
    items: parsed.items,
    payloadVersion: PAYLOAD_VERSION,
    source: parsed.source ?? 'lms.kyonggi.ac.kr',
    collectedAt: parsed.collectedAt ?? new Date().toISOString(),
    parseFailedCount: parsed.parseFailedCount ?? 0,
    parseFailures: parsed.parseFailures ?? [],
  }
}

/**
 * 일정 JSON을 서버로 POST한다.
 *
 * 사용자 식별은 **WhenWe 로그인 세션**으로 한다 (Supabase 액세스 토큰).
 * 서버는 토큰에서 얻은 `user.id`에 일정을 붙인다 — 브라우저가 userId를 보내지 않는다.
 *
 * @param {object} parsed 파싱 결과
 * @param {{ endpoint?: string, accessToken?: string|null, signal?: AbortSignal }} [options]
 * @returns {Promise<object>} 서버 응답 JSON
 * @throws {LmsSendError}
 */
async function sendLmsSchedules(parsed, options = {}) {
  const { endpoint = DRAFT_ENDPOINT, accessToken = null, signal } = options
  const body = buildLmsSchedulePayload(parsed)

  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    throw new LmsSendError('서버에 연결하지 못했습니다.', { code: 'NETWORK_ERROR' })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    // 서버 message를 그대로 쓴다. 여기서 LMS 원문이나 일정 제목을 덧붙이지 않는다.
    throw new LmsSendError(payload?.message || '일정 저장에 실패했습니다.', {
      status: response.status,
      code: payload?.code ?? null,
    })
  }

  return payload
}
