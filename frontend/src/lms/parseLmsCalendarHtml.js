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

import { LmsParseError } from './lmsParseError.js'
import {
  classifyLmsEvent,
  moduleFromIconSrc,
  moduleFromModuleUrl,
} from './classifyLmsEvent.js'

const LMS_HOST = 'lms.kyonggi.ac.kr'
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 파싱 실패 사유. 실패 항목의 **원문은 남기지 않고** 위치와 사유만 남긴다. */
export const PARSE_FAILURE_REASONS = Object.freeze({
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
export function parseLmsCalendarHtml(input) {
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
export function parseLmsDayHtml(input) {
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
export function mergeParsedCalendars(results) {
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
