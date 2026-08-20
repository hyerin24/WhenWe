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

## 쓰는 법 (프론트 빌드 세팅이 끝난 뒤)

> ⚠️ **아직 `frontend`에 `package.json`·번들러가 없습니다.** 아래 `import`는 세팅이 올라온 뒤부터 동작합니다.
> **지금 당장 확인하려면 아래 [확인 방법](#확인-방법)의 콘솔 붙여넣기를 쓰세요.**

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

`docs/api.md`의 [POST /api/lms/schedules `합의완료`](../../../docs/api.md#post-apilmsschedules---합의완료)와 같습니다.
**F2·F3·F4 확인 완료(2026-08-20)** — 경로·필드가 확정되었습니다.

파싱하지 못한 항목은 조용히 버리지 않고 `parseFailures`에 **사유·날짜·순번만** 남깁니다.
LMS가 날짜 칸에 표시하는 개수(`title="5 일정"`)와 실제로 뽑은 개수가 다르면
그 차이도 `DAY_COUNT_MISMATCH`로 집계됩니다 — 마크업이 바뀌어 항목이 사라지면 건수로 드러납니다.

**실패 항목의 원문(HTML·제목)은 어디에도 남기지 않습니다.**

## 확인 방법

번들러가 없으니 **LMS 탭의 개발자 도구 콘솔에 코드를 직접 붙여넣어** 확인합니다.
fetch가 `credentials: 'include'`로 본인 세션을 쓰기 때문에, **반드시 `lms.kyonggi.ac.kr` 탭에서** 실행해야 합니다.
다른 사이트나 로컬 파일에서 실행하면 출처가 달라 요청이 막힙니다.

1. 크롬에서 **LMS에 로그인**하고 캘린더 페이지를 엽니다 — `https://lms.kyonggi.ac.kr/calendar/view.php?view=month&course=1`
2. `F12` → **Console** 탭. 처음이면 콘솔에 `allow pasting` 을 입력하고 Enter (크롬이 붙여넣기를 막아 둡니다)
3. 아래 파일 내용을 **이 순서로** 붙여넣습니다. 붙여넣을 때 각 파일 맨 위의 `import …` 줄은 지우고, `export ` 단어도 지웁니다 (콘솔은 모듈이 아닙니다)

   ```text
   lmsErrors.js → fetchLmsCalendarHtml.js → lmsParseError.js
   → classifyLmsEvent.js → parseLmsCalendarHtml.js → sendLmsSchedules.js
   ```

4. 그다음 확인할 달을 넣어 실행합니다

   ```js
   const parsed = parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year: 2026, month: 9 }))
   console.log(`추출 ${parsed.itemCount}건 · 실패 ${parsed.parseFailedCount}건`)
   console.table(parsed.items.map(({ dateKst, kind, hasTime, title }) => ({ dateKst, kind, hasTime, title })))
   ```

무엇을 보나:

- `itemCount`가 **LMS 캘린더 화면에 보이는 일정 개수와 같은지**
- `parseFailedCount`가 0인지 (0이 아니면 `parseFailures`의 `reason` 확인)
- 로그아웃 상태로 실행하면 빈 결과가 아니라 `LmsAuthError`가 나는지

시각까지 보려면 `parsed.items[0].sourceUrl`(일 뷰 링크)을 fetch해서 `parseLmsDayHtml()`에 넣고
`mergeParsedCalendars([parsed, day])`로 합칩니다.

> ⚠️ **가져온 HTML·일정을 저장소에 커밋하지 마세요.** 개인 일정이 들어 있습니다.
> 저장해야 하면 `*.local.html`로 저장합니다 ([.gitignore](../../../.gitignore)).

## 배포 환경에서 서버로 보내기

`sendLmsSchedules()`의 `DRAFT_ENDPOINT`(`/api/lms/schedules`, 상대경로)는 **LMS 탭에서 실행하면
`lms.kyonggi.ac.kr` 자신에게 요청이 갑니다.** 배포된 WhenWe 백엔드로 보내려면 `endpoint` 옵션에
**절대경로**를 명시적으로 넘겨야 합니다 (함수 자체는 이미 이 옵션을 지원하므로 코드 수정이 필요 없습니다).

```js
await sendLmsSchedules(parsed, {
  accessToken,                                          // WhenWe 로그인 세션의 access token
  endpoint: 'https://when-we-backend.vercel.app/api/lms/schedules',
})
```

- `accessToken`은 WhenWe(`https://when-we.vercel.app`)에 로그인한 뒤 **팀 화면의 "LMS 일정 가져오는 방법"**
  패널에서 복사할 수 있습니다 (`useAuth()`가 세션의 access token을 노출합니다). LMS 콘솔에는 이 토큰만 붙여넣고,
  학교 ID·PW·LMS 쿠키는 그대로 브라우저에 남습니다.
- 백엔드 CORS는 `https://when-we.vercel.app`과 `https://lms.kyonggi.ac.kr` 두 origin만 허용하도록 되어 있습니다
  (`CORS_ORIGIN` 환경변수, 콤마 구분). 다른 origin에서 호출하면 403 `CORS_NOT_ALLOWED`가 돌아옵니다.
- 성공하면 `{ importedCount }`가 응답으로 옵니다. 팀 Heatmap 화면에서 반영 여부를 확인합니다.

## 시연 절차 요약

1. `https://when-we.vercel.app`에서 로그인
2. 경기대 LMS에 로그인 (별도 탭)
3. LMS 탭 콘솔에서 [확인 방법](#확인-방법)대로 F1~F2 코드를 붙여넣어 `parsed` 생성
4. WhenWe 팀 화면에서 복사한 위 스니펫(accessToken·endpoint 포함)을 이어서 실행
5. `{ importedCount }` 응답 확인 → WhenWe Heatmap에서 반영 확인
