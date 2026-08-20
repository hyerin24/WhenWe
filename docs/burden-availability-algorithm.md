# 부담도 · 여유도 계산식 (F7)

F7(#9) 완료 조건 "계산식 문서화"를 위한 문서입니다. 팀원과 대화로 정한 규칙을 한곳에 모았습니다.
API 응답 형태 자체는 [api.md](api.md)가 기준이고, 이 문서는 **그 값을 어떻게 계산하는지**만 다룹니다.

## 0. 입력

[`GET /api/teams/:teamId/schedules`](api.md)(F4, `feat/backend-db-team-#6`)가 주는 팀원 전체 일정 목록을 입력으로 그대로 씁니다. 별도 가공된 입력 형태는 요구하지 않습니다.

```
{ userId, scheduleId, type, startAt, endAt, allDay, source }
```

## 1. 공통 규칙 — 어떤 일정을 계산에 쓸지

| 상황 | 처리 |
|---|---|
| `startAt`·`endAt` 둘 다 `null` | **계산에서 제외** — 시간 정보가 없음 |
| 한쪽만 있음 (`startAt`만 또는 `endAt`만) | **그 시각 하나짜리 일정**으로 본다. `[from, to)` 안에 있으면 포함, 점유는 그 시각이 속한 1시간만 |
| `allDay: true` | **계산에서 제외** — 진짜 종일 일정인지, 일(day) 뷰를 못 가져와서 시각을 못 채운 것뿐인지 구분할 수 없어서, 잘못된 판단(예: 휴강을 종일 바쁨으로 계산)을 피하려고 보수적으로 뺀다 |
| `type: assignment` | **점유 시간 계산에서 제외** (아래 §3 참고). "바쁨"으로 세지 않는다 |
| `type: other` / `unknown` | 계산에서 제외 — 무슨 일정인지 불확실해서 안전하게 뺀다 |
| `type: class` / `exam`이고 구간이 있음 | `startAt`~`endAt` 그대로 점유 시간으로 쓴다 |

날짜·시각은 전부 **KST로 변환해서** 버킷(날짜, 0~23시)에 담는다. DB·API 전송은 UTC, 계산 내부만 `Asia/Seoul` 변환.

## 2. 팀 여유도 (Heatmap, `items[]`)

한 팀 × 한 시간대(`date`, `hour`) 단위로 계산한다.

1. 그 팀의 팀원 수 = `totalCount` (데이터 유무와 무관하게 항상 값 있음)
2. 그 시간대에 계산 가능한 팀원 데이터가 **아예 없으면** `availableCount`·`availabilityRate`·`members`는 전부 `null`
3. 데이터가 있으면, 각 팀원에 대해 그 시간에 §1 기준으로 점유하는 일정이 하나라도 있으면 **불가능(`available: false`)**, 없으면 **가능(`available: true`)** — 중간 상태 없음, 이분법
4. `availableCount` = 가능한 팀원 수, `availabilityRate` = `availableCount / totalCount`

## 3. 과제(assignment) 처리 — A안 (합의됨)

과제는 "얼마 동안 매달리는 일정"이 아니라 "마감 시점"이라, 위 §2 점유 계산에는 넣지 않는다. 대신 참고 정보로만 별도 노출한다 ([api.md의 `dueAssignments[]`](api.md) 참고).

- 마감 시각 = `endAt`이 있으면 `endAt`, 없으면 `startAt`
- 과목명만 노출, 원본 제목은 노출하지 않음 (개인 일정 원문 미노출 원칙)

## 4. 개인 부담도 (주 단위)

> 표시 방식은 F6 담당 · 미확정 ([FEATURES §13](FEATURES.md)). 여기서는 **숫자 산출까지만** 다룬다.

한 사람 · 한 주(월~일, KST) 단위로 계산한다.

```
busyHours   = 그 주 class·exam 점유 시간의 합 (시간 단위, §1·§2 기준)
dueCount    = 그 주에 마감인 assignment 개수
burdenScore = busyHours + dueCount × 1   ← 과제 1개 = 1시간 상당 (임시 가중치, 조정 가능)
```

등급(바쁨/보통/한가함) 분류나 화면 표시 방식은 여기서 정하지 않는다 — `burdenScore`라는 raw 숫자만 내려주고, 기준값은 화면 담당과 상의해서 나중에 정한다.

## 5. 아직 F4와 확인 중인 것

- `dueAssignments`에 필요한 `courseName`을 `GET /api/teams/:teamId/schedules` 응답에 넣어줄 수 있는지 (현재 응답에서 의도적으로 제외됨)
- 위 §1 "한쪽만 있는 일정" 처리 방식에 대한 F4의 최종 확인
