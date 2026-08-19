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
export class LmsSendError extends Error {
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
export function buildLmsSchedulePayload(parsed) {
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
export async function sendLmsSchedules(parsed, options = {}) {
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
