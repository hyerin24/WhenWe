# API 계약서

**이 문서가 Frontend와 Backend 사이의 계약입니다.**
응답 필드명이나 구조를 바꿔야 한다면 **코드보다 이 문서를 먼저 고치고**, PR에서 양쪽 담당자가 확인합니다.
문서 없이 응답을 바꾸면 프론트엔드가 조용히 깨지고, 원인을 찾는 데 2일 중 반나절이 날아갑니다.

**이 문서의 범위** — WhenWe **Frontend ↔ Backend** 사이의 API만 다룹니다.
브라우저가 경기대학교 LMS로 직접 보내는 요청(수집 단계)은 **이 문서의 대상이 아니고, 아래 공통 규칙도 적용되지 않습니다.**
어느 기능이 어떤 계약을 기다리는지는 [FEATURES.md](FEATURES.md)를 보세요.

> **현재 상태: 엔드포인트 미확정.**
> 아래 "공통 규칙"만 팀 합의로 확정된 사항이고, 개별 엔드포인트·Request·Response·Error Code는 **아직 아무것도 확정되지 않았습니다.**
> FE/BE 담당자가 합의한 것만 이 문서에 옮겨 적고, 합의 전 내용은 `DRAFT`로 표시해주세요.

---

## ✅ 확정된 공통 규칙

| 항목 | 규칙 |
|---|---|
| 요청/응답 형식 | `application/json` |
| 필드 네이밍 | **camelCase 고정** (`startAt`, `userId`) — DB가 snake_case여도 응답에서는 변환한다 |
| 날짜·시간 | **ISO 8601 문자열** (`2026-08-19T09:00:00Z`) — 저장·전송은 UTC, 표시용 타임존 변환은 프론트에서 |
| 인증 | Supabase Auth 사용 시 액세스 토큰을 `Authorization: Bearer <token>` 헤더로 전달 |
| 목록 응답 | 배열을 그대로 반환하지 않고 `{ "items": [...] }` 로 감싼다 (나중에 페이징 추가 가능) |
| 요청 바디 (목록) | **응답과 같은 모양으로 `{ "items": [...] }` 로 감싼다.** 배열을 그대로 보내지 않는다 — 나중에 형제 필드(수집 시각, 실패 건수 등)를 더할 수 있다 |
| 에러 응답 | 아래 공통 구조를 모든 에러에서 동일하게 사용한다 |

### 공통 에러 응답 구조 (확정)

프론트는 `code`로 분기하고, `message`를 사용자에게 보여줍니다.

```json
{
  "code": "SOME_ERROR_CODE",
  "message": "사용자에게 보여줄 설명"
}
```

| HTTP Status | 사용 상황 |
|---|---|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 요청 값이 잘못됨 (필수 항목 누락, 형식 오류) |
| 401 | 토큰 없음 · 만료 |
| 403 | 권한 없음 (다른 팀의 데이터 접근 등) |
| 404 | 대상 없음 |
| 409 | 중복 (이미 참여한 팀 등) |
| 500 | 서버 오류 |

> ⚠️ **에러 `message`에 아래를 절대 포함하지 마세요.** 화면·로그·스크린샷으로 유출됩니다.
>
> - **LMS 원문 HTML 조각** — 브라우저 수집 결과를 전달하는 API가 `400`을 반환할 때 가장 실리기 쉽습니다
> - **개인 일정 제목** (면담·재수강 과제 등) — 정제 실패 항목을 그대로 되돌려주지 마세요
> - iCal 구독 URL · 인증 토큰
>
> 무엇이 잘못됐는지 알려줘야 하면 **원문 대신 위치와 건수만** 보냅니다.
> 예: `3번째 항목의 시작 시각 형식이 올바르지 않습니다` (O) / `파싱 실패: <td class=...>` (X)

**구체적인 `code` 값은 아직 정해지지 않았습니다.** 엔드포인트를 구현하면서 사용한 code를 각 엔드포인트 항목에 함께 적어주세요.

---

## 🚧 엔드포인트 목록 (DRAFT — 미확정)

FE/BE가 합의한 것만 추가합니다. 구현을 시작하기 전에 이 표의 한 줄을 먼저 채우고, 프론트는 이걸 보고 Mock을 만듭니다.

| Method | Path | 설명 | 담당 | 상태 |
|---|---|---|---|---|
| POST | `/api/teams` | 팀 생성 (F4) | 역할 4 | `합의완료` |
| POST | `/api/teams/join` | 초대 코드로 팀 참가 (F4) | 역할 4 | `합의완료` |
| GET | `/api/teams` | 내가 속한 팀 목록 (F4 → F5) | 역할 4 | `합의완료` |
| GET | `/api/teams/:teamId` | 팀 기본 정보 조회 (F4 → F5) | 역할 4 | `합의완료` |
| POST | `/api/schedules/import` | 정제 완료 일정 저장/갱신 (F3 → F4) | 역할 3·4 | `DRAFT` |
| POST | `/api/lms/schedules` | 브라우저 수집 결과 전달 (F2 → F3·F4) | 역할 2·3·4 | `합의완료` |
| GET | `/api/teams/:teamId/schedules` | 팀 단위 일정 조회 (F4 → F6·F7) | 역할 4 | `합의완료` |
| GET | `/api/teams/{teamId}/heatmap` | 부담도·여유도 결과 조회 (F7 → F6) | 역할 6·7 | `합의완료` |

**`Method`·`Path`가 비어 있는 것은 아직 정해지지 않았다는 뜻입니다.**
위 항목들은 [FEATURES.md](FEATURES.md)가 등재를 요구하는 계약입니다. **상태가 `합의완료`로 표시된 항목만 확정된 명세이고, 나머지는 아직 확정된 것이 하나도 없습니다.** `합의 대기`·`DRAFT` 항목을 확정된 명세로 취급하지 마세요.

상태는 이 순서로 올립니다.

```text
합의 대기  →  DRAFT  →  합의완료  →  구현완료
(자리만 있음)  (초안 작성)  (양쪽 확인)   (동작 확인)
```

`DRAFT`로 올릴 때 `Method`·`Path`를 채우고, 아래 템플릿으로 상세 항목을 추가합니다.

---

## 엔드포인트 작성 템플릿

아래를 복사해 위 표에 대응하는 항목을 추가하세요.
`합의완료`로 바꾸기 전에는 **반드시 상단에 `DRAFT`를 남겨** 상대 담당자가 확정된 것으로 오해하지 않게 합니다.

````markdown
### METHOD /api/경로   `DRAFT`

한 줄 설명. / 담당: OOO / 합의: (합의한 사람 이름 · 날짜)

**인증** 필요 / 불필요

**Request**
```json
{
  "필드명": "타입 · 필수 여부 · 설명"
}
```

**Response 200**
```json
{
  "필드명": "값 예시"
}
```

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | | |
| 404 | | |
````

---

## 확정된 엔드포인트

## 공통 Team DTO

`POST /api/teams` · `GET /api/teams` · `GET /api/teams/:teamId` 는
**전부 같은 모양**으로 응답합니다 (목록은 이 DTO를 `items` 배열로 감쌉니다).

> ⚠️ **`POST /api/teams/join`은 이 DTO를 따르지 않습니다.** 별도 계약을 유지합니다 — 아래 참고. 그 응답 불일치는 프론트(F5)에서 처리하기로 합의했습니다.

```json
{
  "id": "uuid",
  "name": "string",
  "inviteCode": "string · 대문자+숫자 8자 (혼동 문자 제외)",
  "createdBy": "uuid · 생성자의 user id",
  "createdAt": "ISO 8601 UTC",
  "memberCount": 4
}
```

> **`memberCount`는 항상 `team_members`를 실시간 COUNT한 값입니다.** `teams` 테이블에 저장된 값이 아니고, Frontend가 보내는 값도 쓰지 않습니다.
>
> `inviteCode`는 F5 합의에 따라 **Team 타입에 필수 필드**입니다 — 이전 버전에서는 "최소 노출" 원칙으로 `GET /api/teams/:teamId` 응답에서 제외했지만, 실제 프론트 통합 결과 팀원 전원이 이 값을 필요로 해 포함하는 쪽으로 변경했습니다.

### POST /api/teams   `합의완료`

팀을 생성하고 생성자를 팀원으로 추가합니다. / 담당: 역할 4 / 합의: F5 확인 완료 (2026-08-19)

**인증** 필요 — `Authorization: Bearer <token>`

**Request**
```json
{
  "name": "string · 필수 · trim 후 1~50자"
}
```

**Response 201** — 공통 Team DTO. 생성 직후 `memberCount`는 항상 `1`입니다(생성자만 있는 상태를 실제로 다시 COUNT한 결과).

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_NAME` | `name`이 비어 있거나(trim 후) 50자를 초과 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 500 | `INTERNAL_ERROR` | 서버 오류 (invite_code 재시도 소진 포함) |

### POST /api/teams/join   `합의완료`

초대 코드로 기존 팀에 참가합니다. / 담당: 역할 4 / 합의: F5 확인 완료 (2026-08-19)

> **이 엔드포인트는 공통 Team DTO를 쓰지 않습니다.** 아래 자체 계약을 그대로 유지합니다 — 다른 팀 관련 응답과의 불일치는 프론트에서 처리하기로 F5와 합의했습니다.

**인증** 필요 — `Authorization: Bearer <token>`

**Request**
```json
{
  "inviteCode": "string · 필수 · trim 후 대문자 8자"
}
```

**Response 201**
```json
{
  "id": "uuid · 참가한 팀의 id",
  "name": "string · 팀 이름",
  "joinedAt": "ISO 8601 UTC"
}
```

> `inviteCode`는 요청자가 이미 알고 있는 값이라 응답에 다시 포함하지 않습니다.

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_INVITE_CODE` | `inviteCode`가 비어 있거나 형식(8자)에 맞지 않음 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 404 | `TEAM_NOT_FOUND` | 그 코드로 찾을 수 있는 팀이 없음 |
| 409 | `ALREADY_TEAM_MEMBER` | 이미 그 팀에 참가한 상태 (동시 요청으로 인한 DB 제약 위반도 이 코드로 변환) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### GET /api/teams   `합의완료`

**요청자가 속한 팀 목록**을 반환합니다. / 담당: 역할 4 / 합의: F5 확인 완료 (2026-08-19)

**인증** 필요 — `Authorization: Bearer <token>`

**Request** — 바디 없음.

**Response 200**
```json
{
  "items": [ /* 공통 Team DTO */ ]
}
```

- 속한 팀이 없으면 `{ "items": [] }`.
- **다른 사용자의 팀은 절대 포함되지 않습니다** — `team_members`를 `req.user.id`로 먼저 좁혀 팀 id 범위를 확정한 뒤에만 `teams`를 조회합니다.

**에러**

| Status | code | 상황 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |
````

### GET /api/teams/:teamId   `합의완료`

팀 기본 정보와 실제 팀원 수를 조회합니다. / 담당: 역할 4 / 합의: F5 확인 완료 (2026-08-19)

**인증** 필요 — `Authorization: Bearer <token>`

**Request** — 바디 없음.

**Response 200** — 공통 Team DTO.

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_TEAM_ID` | `teamId`가 UUID 형식이 아님 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 403 | `FORBIDDEN` | 요청자가 그 팀 소속이 아님 (팀이 존재하지 않는 경우도 이 코드로 응답) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### GET /api/teams/:teamId/schedules   `합의완료`

요청자가 속한 팀의 일정을 팀원 전체 범위로 조회합니다. Heatmap(F6)·부담도·여유도 계산(F7)용입니다. / 담당: 역할 4 / 합의: F6·F7 확인 완료 (2026-08-19, courseName 포함 재확인 2026-08-20)

**인증** 필요 — `Authorization: Bearer <token>`

**Request** — 바디 없음. 쿼리 파라미터로 기간을 필터링합니다.

| 파라미터 | 형식 | 필수 |
|---|---|---|
| `from` | ISO 8601 UTC (`Z` 고정, 예: `2026-08-18T00:00:00Z`) | `to`와 함께 생략 가능, 함께 주면 필수 |
| `to` | ISO 8601 UTC (`Z` 고정) | 위와 동일 |

- **`from`/`to`는 하나의 기간 계약**입니다. **둘 다 생략**하면 기존과 동일하게 **전체 기간**을 반환합니다(하위 호환). **한쪽만 주면 `400`** — 둘을 함께 요구하는 것이 F6/F7 쪽 구현도 단순합니다.
- **의미는 `[from, to)`** — `from` 포함, `to` 미포함.
- **`from >= to`면 `400`.**
- **일부만 겹쳐도 포함합니다.** 일정 구간 `[starts_at, ends_at]`이 조회 구간과 하나라도 겹치면 포함 — 조건은 `starts_at < to AND ends_at >= from`.
- **NULL 처리** — **F7과 최종 합의 완료** (2026-08-20):
  | `starts_at` | `ends_at` | 처리 |
  |---|---|---|
  | NULL | NULL | **제외** |
  | NULL | 있음 | `ends_at`을 단일 시점으로 간주 — `from <= ends_at < to`면 포함 |
  | 있음 | NULL | `starts_at`을 단일 시점으로 간주 — `from <= starts_at < to`면 포함 |
  | 있음 | 있음 | 위 겹침 조건 그대로 적용 |
- **`allDay=true`인 일정도 그대로 반환합니다.** 이 API는 값을 전달만 하고, 계산 시 `allDay` 처리(현재는 F7 계산 단계에서 제외)는 F4 책임이 아닙니다.

**Response 200**
```json
{
  "items": [
    {
      "userId": "uuid",
      "scheduleId": "uuid",
      "type": "assignment | exam | class | other | unknown",
      "startAt": "ISO 8601 UTC | null",
      "endAt": "ISO 8601 UTC | null",
      "allDay": false,
      "courseName": "string | null",
      "source": "lms"
    }
  ]
}
```

> **`title`은 이 응답에 절대 포함되지 않습니다.** 요청자 본인의 일정이든 다른 팀원의 일정이든 예외 없이 제외합니다 — SELECT 절에도 넣지 않고, 에러·로그에도 남기지 않습니다.
>
> **`courseName`은 F7 최종 확인에 따라 포함합니다** (2026-08-20) — 부담도·여유도 계산과 팀원 참고 표시에 필요하다고 확인되어, 개인 식별성이 낮은 이 필드만 다시 노출합니다. `title`과 달리 개인정보 최소화 대상에서 제외된 것이지, 예외 처리를 추가한 것이 아닙니다. `course_name`이 `NULL`이면 `courseName: null`을 그대로 반환합니다.

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_TEAM_ID` | `teamId`가 UUID 형식이 아님 |
| 400 | `INVALID_DATE_RANGE` | `from`/`to` 중 하나만 옴 · 형식이 ISO 8601 UTC(`Z`)가 아님 · `from >= to` |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 403 | `FORBIDDEN` | 요청자가 그 팀 소속이 아님 (팀이 존재하지 않는 경우도 이 코드로 응답 — 존재 여부를 구분해 알려주지 않음) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

---

## 합의완료 상세 — 부담도·여유도 결과 조회 (F7 → F6)

### GET /api/teams/{teamId}/heatmap   `합의완료`

팀 여유도(시간대별 가능 인원) 조회. / 담당: 역할 6·7 / 합의: 역할 6과 2026-08-19 합의

**인증** 필요

**Request**

`teamId`는 path parameter로 받는다 (query·body에 숨기지 않는다).

| 파라미터 | 위치 | 필수 | 설명 |
|---|---|---|---|
| `teamId` | path | 필수 | 조회할 팀 ID |
| `from` | query | 필수 | 조회 시작 날짜 (`YYYY-MM-DD`, **KST 기준**). 이 날짜부터 **7일치**를 반환한다 |

**타임존 원칙** (공통 규칙의 "저장·전송은 UTC" 예외 — 이 엔드포인트는 아래처럼 단계별로 다르게 다룬다)

| 단계 | 기준 |
|---|---|
| DB / 일정 원본 저장·전송 | UTC |
| F7 계산 내부 처리 | UTC → `Asia/Seoul`로 변환해서 계산 |
| 이 응답의 `date`·`hour` | **이미 KST로 집계된 값** (UTC가 아니다) |

**Response 200**
```json
{
  "items": [
    {
      "date": "2026-08-19",
      "hour": 14,
      "totalCount": 7,
      "availableCount": 3,
      "availabilityRate": 0.43,
      "members": [
        { "userId": "...", "displayName": "팀원1", "available": true }
      ]
    },
    {
      "date": "2026-08-19",
      "hour": 15,
      "totalCount": 7,
      "availableCount": null,
      "availabilityRate": null,
      "members": null
    }
  ],
  "dueAssignments": [
    {
      "date": "2026-08-19",
      "hour": 23,
      "userId": "...",
      "displayName": "팀원1",
      "courseName": "자료구조"
    }
  ]
}
```

| 필드 | 설명 |
|---|---|
| `date` | **KST 기준** 날짜 (`YYYY-MM-DD`) |
| `hour` | **KST 기준** 시각, 0~23 |
| `totalCount` | 팀 전체 인원 수. 데이터 유무와 무관하게 항상 값이 있다 |
| `availableCount` | 해당 시간대에 여유로운 인원 수. **그 시간대를 계산할 팀원 데이터 자체가 없으면 `null`** (7명 전원이 바빠서 0명인 것과 구분한다) |
| `availabilityRate` | `availableCount / totalCount`. `availableCount`가 `null`이면 `null` |
| `members` | 팀원별 상세. 최소 정보만: `userId`, `displayName`, `available`. `availableCount`가 `null`이면 마찬가지로 `null` |

**`items`와 `type: assignment` 일정의 관계 (합의된 A안)**

과제(assignment)는 `availableCount`·`availabilityRate`·`members`를 계산할 때 **점유 시간으로 세지 않는다.** 마감이 있다고 그 시간을 "불가능"으로 만들지 않는다 — 대신 참고 정보로만 별도로 보여준다.

| 필드 (`dueAssignments[]`) | 설명 |
|---|---|
| `date` | 마감일 (**KST**, `YYYY-MM-DD`) |
| `hour` | 마감 시각 (**KST**, 0~23). 정확한 시각을 모르면(day 뷰 미병합 등) `null` |
| `userId` / `displayName` | 마감이 있는 팀원. `members`와 같은 최소 정보 원칙 |
| `courseName` | 과목명만 노출한다. **과제 제목(원문)은 넣지 않는다** — F7 완료 조건 "응답·로그에 개인 일정 원문 미노출" 준수 |

> ⚠️ 이 `dueAssignments` 필드는 역할7이 추가 제안한 것으로, 아직 역할6과 화면에서 어떻게 쓸지는 논의 전입니다 (필드 자체는 쓰지 않아도 무방).

**에러**

| Status | code | 상황 |
|---|---|---|
| 401 | | 토큰 없음·만료 |
| 403 | | 팀 소속 아님 |
| 404 | | 팀 없음 |

### POST /api/schedules/import   `DRAFT`

F3가 정제 완료한 일정 배열을 로그인한 사용자 본인의 일정으로 저장·갱신합니다. / 담당: 역할 3·4 / 합의: (F2·F3 확인 대기)

**인증** 필요 — `Authorization: Bearer <token>`

**Request**
```json
{
  "items": [
    {
      "id": "string · 필수 · F3 의 source event id",
      "title": "string · 필수",
      "type": "assignment | exam | class | other | unknown · 필수",
      "startAt": "ISO 8601 UTC | null",
      "endAt": "ISO 8601 UTC | null",
      "allDay": "boolean · 필수",
      "courseName": "string | null",
      "source": "\"lms\" 고정"
    }
  ]
}
```

**Response 200**
```json
{
  "importedCount": 2
}
```

> DB 내부 uuid(`schedules.id`)를 노출할 필요가 없어 반환하지 않습니다. 목록이 아니라 처리 결과 요약이라 `{ "items": [...] }` 포맷은 쓰지 않았습니다 (요청 바디만 목록 포맷을 따릅니다).

**저장 규칙**

- `userId`는 요청에 받지 않습니다. **`schedules.user_id`는 항상 `Authorization` 토큰에서 검증된 사용자**입니다.
- 필드 매핑: `id`→`source_event_id`, `startAt`→`starts_at`, `endAt`→`ends_at`, `allDay`→`all_day`, `courseName`→`course_name`. 나머지는 이름만 snake_case로.
- **재수집 시 UPSERT** — conflict 기준은 `UNIQUE(user_id, source_event_id)`. 같은 일정이 다시 오면 새 행을 만들지 않고 `title`·`type`·`starts_at`·`ends_at`·`all_day`·`course_name`·`source`를 최신값으로 갱신합니다. **`created_at`은 갱신 대상에서 제외**되어 최초 저장 시각이 유지됩니다.
- `sourceUrl`·`module`·`scope`·LMS ID/PW/세션/원본 HTML은 **받지도 저장하지도 않습니다.**

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_SCHEDULES` | `items`가 배열이 아니거나, 항목 하나라도 형식에 맞지 않음 (개인 일정 제목이 섞여 있을 수 있어 어떤 항목이 틀렸는지는 알리지 않음) |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### POST /api/lms/schedules   `합의완료`

브라우저(F2)가 파싱한 LMS 일정 원문(raw) JSON을 받아, 서버에서 F3 정제 → F4 저장까지 한 번에 처리합니다. / 담당: 역할 2·3·4 / 합의: **F2·F3·F4 확인 완료** (2026-08-20)

**인증** 필요 — `Authorization: Bearer <Supabase access token>`
서버는 토큰에서 얻은 `user.id`에 일정을 붙입니다. 브라우저는 `userId`를 보내지 않습니다.

**처리 흐름**

```text
Request (F2 raw payload)
  → refineSchedules()   F3 — items 만 정제 · sourceEventId 없으면 fallback id 생성 · 중복 제거(시각 있는 쪽 우선)
  → importSchedules()   F4 — 인증된 사용자 본인 schedules 에 UPSERT
  → Response 200 { importedCount }
```

**Request** — F2 raw payload (최종 확정)

```json
{
  "items": [
    {
      "sourceEventId":   "string|null · LMS 이벤트 번호. 없으면 서버가 대체 id 생성",
      "title":           "string · 필수",
      "dateKst":         "string · 필수 · YYYY-MM-DD",
      "startAt":         "string|null · ISO 8601 UTC · 시각을 모르면 null",
      "endAt":           "string|null · ISO 8601 UTC",
      "hasTime":         "boolean · false면 시각 미상 (자정 아님 — 임의로 00:00 채우지 않음)",
      "kind":            "assignment | exam | class | other | unknown",
      "courseName":      "string|null"
    }
  ],
  "payloadVersion":    "string · 예: \"lms-raw-1\"",
  "collectedAt":       "string · ISO 8601 UTC · 브라우저가 수집을 완료한 시각",
  "parseFailedCount":  "number · F2 파싱 실패 건수",
  "parseFailures":     "array · 실패 항목 메타데이터"
}
```

> **`items`만 F3 정제 입력으로 사용합니다.** `payloadVersion`·`collectedAt`·`parseFailedCount`·`parseFailures`는 서버가 요청으로 **수신은 하지만, 이번 MVP에서는 검증하지도 DB에 저장하지도 않습니다.** 이 필드들이 있어도 없어도 요청 처리 결과는 동일합니다.
>
> `module`·`scope`·`sourceUrl`은 서버가 읽지 않습니다. LMS 세션·쿠키·ID/PW·원본 HTML은 어떤 필드로도 받지 않습니다.
> **`parseFailures`에는 일정 제목·HTML 원문 등 민감정보를 넣지 않습니다** — 위치·이유 같은 메타데이터만 담습니다.

**Response 200**
```json
{
  "importedCount": 12
}
```

> **`importedCount`의 의미**: 정제(중복 제거 포함) 후 UPSERT 대상으로 처리된 **고유 일정 수**입니다. 신규 INSERT와 기존 일정 UPDATE를 **모두 포함**합니다 — "몇 건 새로 생겼는지"가 아니라 "몇 건이 반영됐는지"입니다.
>
> PR #17이 제안했던 `201 { savedCount, skippedCount }`는 **채택하지 않았습니다.** `skippedCount`가 무엇을 셀지(파싱 실패? 중복 제거? 검증 실패?) 합의되지 않아, `POST /api/schedules/import`와 동일한 `200 { importedCount }`로 통일했습니다.

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | 요청 바디가 object가 아니거나 `items`가 배열이 아님 |
| 400 | `INVALID_SCHEDULES` | 정제된 항목이 저장 단계 검증(타입·형식)을 통과하지 못함 — `importSchedules()`의 에러를 그대로 전달 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |
