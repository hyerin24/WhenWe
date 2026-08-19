# frontend/src/lms

LMS 일정 수집 모듈입니다. **전부 사용자 브라우저에서 실행됩니다.**
서버는 여기서 만든 **일정 JSON만** 받습니다 — LMS 세션·쿠키·학교 ID/PW는 브라우저를 떠나지 않습니다.

```text
F1  fetchLmsCalendarHtml()   Calendar HTML 확보      (#3)
 →  F2  parseLmsCalendarHtml()   일정 항목 추출       (#4)
 →  F2  sendLmsSchedules()       서버로 전송          (#4)
 →  F3  서버에서 정제                                  (#5)
```

| 파일 | 담당 | 하는 일 |
|---|---|---|
| `fetchLmsCalendarHtml.js` · `lmsErrors.js` | F1 (#3) | 월 단위로 Calendar HTML 가져오기 |
| `parseLmsCalendarHtml.js` | F2 (#4) | HTML → 일정 JSON · 실패 건수 집계 |
| `classifyLmsEvent.js` | F2 (#4) | 일정 종류(과제/시험/수업) 분류 |
| `sendLmsSchedules.js` | F2 (#4) | 일정 JSON을 서버로 POST |
| `lmsParseError.js` | F2 (#4) | 파싱 단계 에러 |

## 쓰는 법

```js
import { fetchLmsCalendarHtml } from './fetchLmsCalendarHtml.js'
import { parseLmsCalendarHtml, parseLmsDayHtml, mergeParsedCalendars } from './parseLmsCalendarHtml.js'
import { sendLmsSchedules } from './sendLmsSchedules.js'

// 한 달치
const parsed = parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year: 2026, month: 7 }))

// 한 학기치 (F1은 월 단위라 여러 번 부른다)
const months = []
for (const month of [3, 4, 5, 6]) {
  months.push(parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year: 2026, month })))
}
await sendLmsSchedules(mergeParsedCalendars(months), { accessToken })
```

`parseLmsCalendarHtml()`은 F1의 반환값 `{ html, fetchedAt, range }`를 그대로 받습니다.
HTML 문자열만 넘겨도 되고, 그때는 연·월을 `summary="2026년 7월 캘린더"`에서 스스로 읽습니다.

### 시각(시:분)이 필요하면

**LMS 월 뷰 HTML에는 시각이 아예 없습니다.** 날짜까지만 있습니다.
그래서 월 뷰 항목은 `startAt: null`, `hasTime: false`로 나옵니다. (없는 시각을 00:00으로 채우지 않습니다 —
F3·F7이 진짜 자정 마감과 구분하지 못하게 됩니다.)

시:분은 **일 뷰**(`view=day`)에 있습니다. 과목명·모듈 아이콘도 여기 있습니다.

```js
const day = parseLmsDayHtml(dayHtml)                  // 일 뷰 HTML
const all = mergeParsedCalendars([parsed, day])       // 시각 있는 쪽이 이긴다
```

> 일 뷰 HTML을 가져오려면 F1의 fetch가 `view=day`도 지원해야 합니다. **#3과 협의 필요** —
> 현재 `fetchLmsCalendarHtml()`은 `view=month`로 고정되어 있습니다.

## 출력 형태

`docs/api.md`의 [POST /api/lms/schedules `DRAFT`](../../../docs/api.md#post-apilmsschedules---draft)와 같습니다.
**경로·필드는 역할 3·4와 합의 전(DRAFT)입니다.**

파싱하지 못한 항목은 조용히 버리지 않고 `parseFailures`에 **사유·날짜·순번만** 남깁니다.
LMS가 날짜 칸에 표시하는 개수(`title="5 일정"`)와 실제로 뽑은 개수가 다르면
그 차이도 `DAY_COUNT_MISMATCH`로 집계됩니다 — 마크업이 바뀌어 항목이 사라지면 건수로 드러납니다.

**실패 항목의 원문(HTML·제목)은 어디에도 남기지 않습니다.**

## 확인 방법

빌드 세팅이 아직 없으므로, 로그인된 LMS 탭의 개발자 도구 콘솔에서 확인합니다.

```js
const parsed = parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year: 2026, month: 7 }))
console.log(parsed.itemCount, parsed.parseFailedCount)
console.table(parsed.items.map(({ dateKst, kind, hasTime }) => ({ dateKst, kind, hasTime })))
```

- `itemCount`가 LMS 캘린더 화면에 보이는 일정 개수와 같은지
- `parseFailedCount`가 0인지 (0이 아니면 `parseFailures`의 `reason`을 확인)

> ⚠️ **가져온 HTML·일정을 저장소에 커밋하지 마세요.** 개인 일정이 들어 있습니다.
> 저장해야 하면 `*.local.html`로 저장합니다 ([.gitignore](../../../.gitignore)).
