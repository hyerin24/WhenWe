/**
 * F3 정제 로직
 * F2가 보낸 raw LMS 일정 데이터를 공통 스키마로 정제한다.
 * DB 저장(import)은 하지 않는다 — 그건 scheduleImporter.js의 역할.
 */

/**
 * 항목 하나를 F2 raw 형태 → F3 공통 스키마로 변환
 */
function normalizeItem(rawItem) {
  return {
    id: rawItem.sourceEventId,
    title: rawItem.title,
    type: rawItem.kind,
    startAt: rawItem.startAt,
    endAt: rawItem.endAt,
    allDay: !rawItem.hasTime,
    courseName: rawItem.courseName,
    source: "lms"
  };
}

/**
 * 같은 id(sourceEventId)를 가진 항목이 여러 개면 하나만 남긴다
 */
function removeDuplicates(items) {
  const seen = new Map();
  for (const item of items) {
    seen.set(item.id, item);
  }
  return [...seen.values()];
}

/**
 * F2 파싱 결과를 받아 정제된 items 배열만 반환한다.
 * importer/DB 호출 없음.
 *
 * @param {object} f2Result - F2의 파싱 결과 ({ items: [...] } 형태)
 * @returns {Array<object>} 정제된 일정 items 배열
 */
function refineSchedules(f2Result) {
  const rawItems = f2Result.items || [];
  const normalized = rawItems.map(normalizeItem);
  const cleaned = removeDuplicates(normalized);
  return cleaned;
}

module.exports = { refineSchedules, normalizeItem, removeDuplicates };