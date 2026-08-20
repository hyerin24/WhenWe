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
export const EVENT_KINDS = Object.freeze({
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
export function moduleFromIconSrc(src) {
  if (!src) return null
  const themed = src.match(/\/theme\/image\.php\/[^/]+\/([a-z0-9_]+)\/\d+\/icon/i)
  if (themed) return themed[1].toLowerCase()
  const pix = src.match(/\/pix\/mod\/([a-z0-9_]+)\//i)
  if (pix) return pix[1].toLowerCase()
  return null
}

/** `/mod/<모듈>/view.php?id=...` 링크에서 모듈명을 뽑는다. */
export function moduleFromModuleUrl(url) {
  if (!url) return null
  const matched = url.match(/\/mod\/([a-z0-9_]+)\/[a-z0-9_]+\.php/i)
  return matched ? matched[1].toLowerCase() : null
}

/**
 * @param {{ module?: string|null, iconLabel?: string|null, title?: string|null }} hints
 * @returns {string} EVENT_KINDS 중 하나
 */
export function classifyLmsEvent({ module = null, iconLabel = null, title = null } = {}) {
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
