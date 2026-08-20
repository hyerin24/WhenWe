# extension/ — WhenWe LMS 연동 (Chrome 확장프로그램)

TeamsPage의 "LMS 연동하기" 버튼이 실제로 동작하게 하는 최소 구성 Manifest V3 확장프로그램입니다.
**F1·F2 로직을 새로 만들지 않습니다** — `frontend/src/lms/*.js` 원본을 그대로 재사용합니다
(자동 생성 번들: `lib/lms-bundle.generated.js`, 빌드: `node extension/scripts/build-lms-bundle.js`).

## 왜 확장프로그램인가

WhenWe 화면(`when-we.vercel.app`)은 브라우저 same-origin 정책 때문에 `lms.kyonggi.ac.kr`의 로그인
세션으로 직접 fetch할 수 없습니다 (`frontend/src/lms/README.md` 참고). 확장프로그램의 content script는
LMS 탭 **안에서** 실행되므로 이 제약 없이 F1(`fetchLmsCalendarHtml`)을 실행할 수 있습니다.
WhenWe는 LMS DOM·쿠키에 직접 접근하지 않고, 확장프로그램이 수집한 **일정 JSON 결과만** 전달받습니다.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `manifest.json` | MV3 선언. host_permissions는 `lms.kyonggi.ac.kr`·`when-we.vercel.app`·`when-we-backend.vercel.app` 세 개뿐, `<all_urls>` 없음 |
| `background.js` | 서비스 워커. LMS 탭을 찾거나 열고, 수집 시작/재시도/결과 중계를 담당. accessToken은 진행 중인 작업 동안만 메모리에 보관 |
| `content-lms.js` | LMS 탭에 주입. `lib/lms-bundle.generated.js`의 F1·F2를 그대로 호출 |
| `content-whenwe.js` | WhenWe 탭에 주입. 페이지의 `window.postMessage` ↔ `chrome.runtime` 메시지를 중계 |
| `lib/lms-bundle.generated.js` | **자동 생성** — 직접 고치지 마세요. `frontend/src/lms/*.js`를 그대로 합친 것 |
| `scripts/build-lms-bundle.js` | 위 번들을 만드는 스크립트. F1·F2 원본이 바뀌면 다시 실행 |

## 설치 방법 (개발자 모드)

1. `node extension/scripts/build-lms-bundle.js` 실행 (frontend/src/lms 원본이 바뀔 때마다 다시 실행)
2. Chrome 주소창에 `chrome://extensions` 입력
3. 우측 상단 **개발자 모드** 켜기
4. **압축해제된 확장 프로그램을 로드합니다** 클릭 → 이 저장소의 `extension/` 폴더 선택
5. 목록에 "WhenWe LMS 연동"이 뜨면 설치 완료

## 사용 흐름

```
WhenWe(팀 화면) "LMS 연동하기" 클릭
 → content-whenwe.js 가 background 로 시작 메시지 전달 (accessToken 포함)
 → background 가 LMS 탭을 찾거나 새로 엶
 → content-lms.js 가 F1 fetchLmsCalendarHtml() 실행
    - 로그인 안 되어 있으면(LmsAuthError/LmsSessionExpiredError) "로그인 대기" 상태만 알리고 끝
    - background 는 그 탭이 다시 로드될 때(로그인 후 리다이렉트 등) 자동으로 재시도한다
      (setInterval 폴링이 아니라 tabs.onUpdated 이벤트 기반, 최대 8회)
 → 로그인된 상태면 F2 parseLmsCalendarHtml() → sendLmsSchedules() 로 backend 에 바로 전송
 → backend: F3 refineSchedules() → F4 importSchedules() → { importedCount } 응답
 → content-lms.js → background → content-whenwe.js → WhenWe 화면에 결과 표시
```

## 보안

- Supabase Secret Key는 어디에도 없습니다 — 이 확장프로그램은 WhenWe 사용자의 **Supabase access token**만 다룹니다.
- LMS 쿠키·세션 ID·경기대 ID/PW는 읽거나 전송하지 않습니다 — F1은 브라우저의 `credentials: 'include'` fetch로
  LMS 세션을 그 탭 안에서만 쓰고, 서버로 넘어가는 것은 일정 JSON뿐입니다 (`frontend/src/lms/README.md`와 동일한 원칙).
- accessToken은 `background.js`의 지역 변수에만 담기고, 작업이 끝나거나 실패하면 즉시 버려집니다.
  `chrome.storage`·`localStorage`에 저장하지 않고, `console.log`로 출력하지 않습니다.
- 일정 제목·LMS HTML 원문도 콘솔에 남기지 않습니다.

## 현재 범위 (MVP)

- **월(month) 뷰만 수집합니다.** 일(day) 뷰(시각·과목명)는 이번 작업에서 확장하지 않았습니다 — F1이 아직
  `view=day`를 지원하지 않기 때문입니다 (`frontend/src/lms/README.md` 참고).
- 한 번에 **현재 달(KST 기준)만** 가져옵니다. 여러 달을 모아 보내려면(`mergeParsedCalendars`) 추후 확장이 필요합니다.
- 동시에 하나의 수집 작업만 지원합니다 (`background.js`의 `job` 전역 하나).

## 개발자용 대체 방법 (확장프로그램 없이 확인)

확장프로그램을 설치하지 않고 F1·F2를 확인하려면 `frontend/src/lms/README.md`의
["확인 방법"](../frontend/src/lms/README.md#확인-방법) — LMS 탭 콘솔에 직접 붙여넣는 방법을 그대로 씁니다.
TeamsPage의 "개발자용 대체 방법" 접이식 패널에도 같은 안내가 있습니다.
