import { getUserClient } from '../lib/supabase.js';

// 정제 완료된 일정 배열을 본인 schedules 에 저장/갱신하는 공통 로직입니다.
//
// HTTP 와 무관하고, F3 의 정제 모듈(scheduleRefiner.js, 아직 미구현)을
// import 하지도 않습니다 — 이 파일은 "저장"만 책임지는 독립된 유닛입니다.
// 정제(F3)와 저장(F4)을 잇는 오케스트레이션은 나중에 별도 라우트가
// refineSchedules() → importSchedules() 순서로 호출하는 방식으로 담당합니다.
//
// getUserClient(accessToken) 만 사용합니다. getAdminClient() 를 쓰지 않는 이유는
// RLS 의 "본인만 INSERT/UPDATE" 를 다시 한번 강제하기 위해서입니다 — 이 코드가
// user_id 를 잘못 넣는 버그가 있어도 DB 가 막아줍니다.

const ALLOWED_TYPES = new Set(['assignment', 'exam', 'class', 'other', 'unknown']);
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isValidIsoUtcOrNull(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  if (!ISO_UTC_RE.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function isValidItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim().length === 0) return false;
  if (typeof item.title !== 'string' || item.title.trim().length === 0) return false;
  if (typeof item.type !== 'string' || !ALLOWED_TYPES.has(item.type)) return false;
  if (!isValidIsoUtcOrNull(item.startAt)) return false;
  if (!isValidIsoUtcOrNull(item.endAt)) return false;
  if (typeof item.allDay !== 'boolean') return false;
  if (item.courseName !== null && item.courseName !== undefined && typeof item.courseName !== 'string') return false;
  if (item.source !== 'lms') return false;
  return true;
}

/**
 * 정제된 일정 배열을 인증된 사용자 본인의 schedules 에 UPSERT 합니다.
 *
 * @param {object} params
 * @param {string} params.userId       schedules.user_id 로 쓰일 값. 항상 인증된
 *                                     사용자의 id 여야 합니다 — 호출자가 요청 body 의
 *                                     userId 를 여기로 넘기지 않도록 주의하세요.
 * @param {string} params.accessToken  getUserClient 에 실어 보낼 Supabase access token.
 * @param {unknown} params.items       F3 확정 스키마의 일정 배열 (검증 전 원본).
 *
 * @returns {Promise<
 *   | { ok: true, importedCount: number }
 *   | { ok: false, code: 'INVALID_SCHEDULES' | 'INTERNAL_ERROR', message: string }
 * >}
 * 예외를 던지지 않고 결과 객체로 성공/실패를 구분합니다 — HTTP 상태 코드로
 * 바꾸는 것은 호출자(라우트 또는 F3)의 책임입니다.
 */
export async function importSchedules({ userId, accessToken, items }) {
  if (!Array.isArray(items)) {
    return { ok: false, code: 'INVALID_SCHEDULES', message: '일정 데이터 형식이 올바르지 않습니다.' };
  }

  // 빈 배열은 유효한 no-op 으로 허용합니다 — 그 학기에 수집된 일정이 0건인
  // 정상적인 경우와 구분할 필요가 없어, 에러로 만들면 F2/F3 쪽 분기만 늘어납니다.
  if (items.length === 0) {
    return { ok: true, importedCount: 0 };
  }

  if (!items.every(isValidItem)) {
    // 개인 일정 제목이 섞여 있을 수 있으므로 어떤 항목이 왜 틀렸는지 밝히지 않습니다.
    return { ok: false, code: 'INVALID_SCHEDULES', message: '일정 데이터 형식이 올바르지 않습니다.' };
  }

  // 같은 배열 안에 같은 id(F3 의 source_event_id)가 중복되면
  // Postgres 가 "ON CONFLICT DO UPDATE command cannot affect row a second time"
  // 로 요청 전체를 실패시킵니다. 나중 값을 남기고 이전 값을 버려 배치 전체가
  // 죽는 것을 막습니다.
  const dedup = new Map();
  for (const item of items) dedup.set(item.id, item);
  const uniqueItems = [...dedup.values()];

  // 호출자가 준 userId 만 씁니다 — items 안에는 user 식별 정보가 없습니다.
  const rows = uniqueItems.map((item) => ({
    user_id: userId,
    source_event_id: item.id,
    title: item.title,
    type: item.type,
    starts_at: item.startAt ?? null,
    ends_at: item.endAt ?? null,
    all_day: item.allDay,
    course_name: item.courseName ?? null,
    source: item.source,
  }));

  const client = getUserClient(accessToken);
  const { data, error } = await client
    .from('schedules')
    .upsert(rows, { onConflict: 'user_id,source_event_id' })
    .select('source_event_id');

  if (error) {
    // 개인 일정 원문(제목 등)을 로그에 남기지 않습니다 — 코드와 건수만 남깁니다.
    console.error('schedules upsert failed', { code: error.code, attempted: rows.length });
    return { ok: false, code: 'INTERNAL_ERROR', message: '일정을 저장하지 못했습니다.' };
  }

  return { ok: true, importedCount: data.length };
}
