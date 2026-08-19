/**
 * F3 정제 로직
 * F2가 보낸 raw LMS 일정 데이터를 공통 스키마로 정제한다.
 * DB 저장(import)은 하지 않는다 — 그건 scheduleImporter.js의 역할.
 */

/**
 * sourceEventId가 없을 때 사용할 대체 ID를 만든다.
 * 같은 날짜 + 같은 제목이면 같은 일정으로 본다.
 */
function makeFallbackId(rawItem) {
  const datePart = rawItem.dateKst || 'unknown-date';
  const titlePart = (rawItem.title || 'unknown-title').trim();
  return `fallback__${datePart}__${titlePart}`;
}

/**
 * 정제 결과에서 내부 처리용 필드(_hasTime)를 제거한다.
 */
function stripInternalFields(item) {
  const { _hasTime, ...rest } = item;
  return rest;
}

/**
 * 항목 하나를 F2 raw 형태 → F3 공통 스키마로 변환
 * (중복 제거 우선순위 판단을 위해 _hasTime을 임시로 같이 담는다. 최종 출력 전에 제거됨)
 */
export function normalizeItem(rawItem) {
  const id = rawItem.sourceEventId || makeFallbackId(rawItem);
  return {
    id,
    title: rawItem.title,
    type: rawItem.kind,
    startAt: rawItem.startAt,   // F2 값 그대로 사용. 임의로 00:00 채우지 않는다.
    endAt: rawItem.endAt,
    allDay: !rawItem.hasTime,
    courseName: rawItem.courseName,
    source: "lms",
    _hasTime: Boolean(rawItem.hasTime)
  };
}

/**
 * 같은 id를 가진 항목이 여러 개면 하나만 남긴다.
 * 우선순위: 시각이 있는(hasTime=true) 쪽을 남긴다.
 */
export function removeDuplicates(items) {
  const seen = new Map();

  for (const item of items) {
    const existing = seen.get(item.id);

    if (!existing) {
      seen.set(item.id, item);
      continue;
    }

    // 기존 것이 시각 없음이고, 새 것이 시각 있음이면 새 것으로 교체
    if (item._hasTime && !existing._hasTime) {
      seen.set(item.id, item);
    }
    // 그 외 경우엔 기존 값 유지
  }

  return [...seen.values()].map(stripInternalFields);
}

/**
 * F2 파싱 결과를 받아 정제된 items 배열만 반환한다.
 * importer/DB 호출 없음.
 *
 * @param {object} f2Result - F2의 파싱 결과 ({ items: [...] } 형태)
 * @returns {Array<object>} 정제된 일정 items 배열
 */
export function refineSchedules(f2Result) {
  const rawItems = f2Result.items || [];
  const normalized = rawItems.map(normalizeItem);
  const cleaned = removeDuplicates(normalized);
  return cleaned;
}