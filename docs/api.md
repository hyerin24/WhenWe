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
| POST | `/api/teams` | 팀 생성 (F4) | 역할 4 | `DRAFT` |
| POST | `/api/teams/join` | 초대 코드로 팀 참가 (F4) | 역할 4 | `DRAFT` |
| GET | `/api/teams/:teamId` | 팀 기본 정보 조회 (F4 → F5) | 역할 4 | `DRAFT` |
| POST | `/api/schedules/import` | 정제 완료 일정 저장/갱신 (F3 → F4) | 역할 3·4 | `DRAFT` |
| | | 브라우저 수집 결과 전달 (F2 → F3·F4) | 역할 2·3·4 | **합의 대기** |
| GET | `/api/teams/:teamId/schedules` | 팀 단위 일정 조회 (F4 → F6·F7) | 역할 4 | `DRAFT` |
| | | 부담도·여유도 결과 조회 (F7 → F6) | 역할 6·7 | **합의 대기** |

**`Method`·`Path`가 비어 있는 것은 아직 정해지지 않았다는 뜻입니다.**
위 3개는 [FEATURES.md](FEATURES.md)가 등재를 요구하는 계약이고, **경로·필드·에러 code 중 확정된 것이 하나도 없습니다.** 확정된 명세로 취급하지 마세요.

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

### POST /api/teams   `DRAFT`

팀을 생성하고 생성자를 팀원으로 추가합니다. / 담당: 역할 4 / 합의: (F5 확인 대기)

**인증** 필요 — `Authorization: Bearer <token>`

**Request**
```json
{
  "name": "string · 필수 · trim 후 1~50자"
}
```

**Response 201**
```json
{
  "id": "uuid",
  "name": "string",
  "inviteCode": "string · 대문자+숫자 8자 (혼동 문자 제외)",
  "createdBy": "uuid · 생성자의 user id",
  "createdAt": "ISO 8601 UTC"
}
```

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_NAME` | `name`이 비어 있거나(trim 후) 50자를 초과 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 500 | `INTERNAL_ERROR` | 서버 오류 (invite_code 재시도 소진 포함) |

### POST /api/teams/join   `DRAFT`

초대 코드로 기존 팀에 참가합니다. / 담당: 역할 4 / 합의: (F5 확인 대기)

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
````

### GET /api/teams/:teamId   `DRAFT`

팀 기본 정보와 실제 팀원 수를 조회합니다. / 담당: 역할 4 / 합의: (F5 확인 대기)

**인증** 필요 — `Authorization: Bearer <token>`

**Request** — 바디 없음.

**Response 200**
```json
{
  "id": "uuid",
  "name": "string",
  "memberCount": 3,
  "createdBy": "uuid · 생성자의 user id",
  "createdAt": "ISO 8601 UTC"
}
```

> **`memberCount`의 Source of Truth는 `public.team_members`입니다.** `teams` 테이블에 별도 카운트 컬럼을 두지 않고, **요청마다 `team_members` 행 수를 직접 계산**합니다. Frontend는 이 값을 표시만 하고, 자체적으로 증감시키거나 서버에 값을 보내지 않습니다.
>
> `inviteCode`는 이 응답에 **포함하지 않습니다.** 일반 팀 정보 화면에는 필요 없고, `POST /api/teams`(생성 시 응답)로 생성자만 이미 확인한 값입니다 — 최소 노출 원칙에 따라 매 조회마다 다시 노출하지 않습니다.

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_TEAM_ID` | `teamId`가 UUID 형식이 아님 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 403 | `FORBIDDEN` | 요청자가 그 팀 소속이 아님 (팀이 존재하지 않는 경우도 이 코드로 응답) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### GET /api/teams/:teamId/schedules   `DRAFT`

요청자가 속한 팀의 일정을 팀원 전체 범위로 조회합니다. Heatmap(F6)·부담도·여유도 계산(F7)용입니다. / 담당: 역할 4 / 합의: (F6·F7 확인 대기)

**인증** 필요 — `Authorization: Bearer <token>`

**Request** — 바디 없음. 기간 필터(`from`/`to`)는 F6·F7과 합의 전이라 **이번 DRAFT에는 포함하지 않았습니다.** 지금은 전체 기간을 반환합니다.

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
      "source": "lms"
    }
  ]
}
```

> **`title`·`courseName`은 이 응답에 포함되지 않습니다.** 요청자 본인의 일정이든 다른 팀원의 일정이든 예외 없이 제외합니다 — Heatmap·부담도 계산에 필요 없는 개인정보를 응답 스키마 자체에서 제거하는 방식입니다.

**에러**

| Status | code | 상황 |
|---|---|---|
| 400 | `INVALID_TEAM_ID` | `teamId`가 UUID 형식이 아님 |
| 401 | `UNAUTHORIZED` | 토큰 없음 · 유효하지 않음 |
| 403 | `FORBIDDEN` | 요청자가 그 팀 소속이 아님 (팀이 존재하지 않는 경우도 이 코드로 응답 — 존재 여부를 구분해 알려주지 않음) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

**미확정 — 다음 합의 필요**: 기간 필터(`from`/`to`) 파라미터 형식과 의미. 필요해지면 F6·F7과 합의 후 `DRAFT`를 갱신합니다.

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
