# 제품 요구사항 (SPEC)

WhenWe가 **무엇을 충족해야 하는지**를 요구사항 단위로 식별하고 **MoSCoW 우선순위**를 부여한 문서입니다.

## 1. 문서 목적

- 제품 요구사항을 **ID 단위로 식별**하고 **Must / Should / Could / Won't**로 분류합니다.
- 각 요구사항이 **어느 기준 문서에 정의되어 있는지 연결**합니다.

**이 문서는 상세 명세를 정의하지 않습니다.** 요구사항 문장과 포인터만 담습니다.
구현 범위·완료 조건·엔드포인트·DB 설계·계산식·일정·Git 규칙을 여기에 옮겨 적으면 **기준이 두 곳으로 갈라지므로 하지 않습니다.**

### Source of Truth 관계

| 이 문서가 소유하는 것 | 이 문서가 가리키기만 하는 것 |
|---|---|
| 요구사항 **ID** (`M-`/`S-`/`C-`/`W-`) · **MoSCoW 우선순위** · 요구사항 ↔ 기준 문서 **매핑** | 그 외 **전부** |

| 기준 문서 | 그 문서만이 정의하는 것 |
|---|---|
| [PLANNING.md](PLANNING.md) | 목표 · MVP 범위 · 제외 범위 · 용어 · 기술 스택 · 사용자 흐름 · 화면 · 데이터 개요 · 역할 · 일정 · 의존성 · 리스크 · 미확정 사항 |
| [FEATURES.md](FEATURES.md) | `F1`~`F7`의 **구현 범위 · 완료 조건** · P0/P1 · 선행 기능 |
| [api.md](api.md) | **endpoint · request · response · 필드명 · error code** · 공통 규칙 |
| **GitHub Issue [#3](https://github.com/hyerin24/WhenWe/issues/3)~[#9](https://github.com/hyerin24/WhenWe/issues/9)** | **작업 상태 · 담당자 · Milestone** |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 브랜치 · 커밋 · PR · 리뷰 · Secret 규칙 |

전체 표는 [§9](#9-source-of-truth-표)에 있습니다.

## 2. 요구사항 표기 규칙

| 접두 | MoSCoW | 뜻 |
|---|---|---|
| `M-` | **Must** | 이번 MVP에서 **반드시** 충족해야 한다. 빠지면 제품이 성립하지 않는다 |
| `S-` | **Should** | 충족하는 것이 옳지만, 빠져도 제품은 동작한다 |
| `C-` | **Could** | 여유가 있으면 한다 |
| `W-` | **Won't** | **이번 범위에서 하지 않는다** |

각 요구사항은 아래 4줄만 갖습니다.

```text
Requirement   요구사항 1문장 (무엇이 가능해야 하는가)
상세 명세     FEATURES.md 의 F번호
관련 Issue    #번호
범위 근거     PLANNING.md 의 섹션
```

- 계약이 필요한 요구사항은 `계약` 줄을 추가하고 **[api.md](api.md)를 가리킵니다.** 경로·필드는 적지 않습니다.
- 확정되지 않은 것은 **`TBD`** 로 표시하고 [§8](#8-tbd)에서 모아 봅니다.
- **`W-01`·`W-02`는 후순위가 아니라 하지 않기로 한 아키텍처 결정입니다.** 다른 `W-`와 성격이 다릅니다.

---

## 3. Must

### M-01 · 로그인

- **Requirement**: 사용자가 로그인해 본인을 식별할 수 있어야 한다.
- **상세 명세**: [FEATURES.md](FEATURES.md) `F5`
- **관련 Issue**: [#7](https://github.com/hyerin24/WhenWe/issues/7)
- **범위 근거**: [PLANNING.md](PLANNING.md) §2 · §7

### M-02 · LMS 일정 수집

- **Requirement**: **이미 로그인된 사용자 본인의 브라우저 세션**에서 LMS 일정을 수집할 수 있어야 한다.
  **서버가 사용자를 대신해 로그인하거나 fetch하지 않는다** ([W-01](#w-01--학교-idpw-저장) · [W-02](#w-02--서버가-lms에-대신-로그인하거나-fetch)).
- **상세 명세**: `F1`
- **관련 Issue**: [#3](https://github.com/hyerin24/WhenWe/issues/3)
- **범위 근거**: §2 · §5

### M-03 · 일정 항목 추출

- **Requirement**: 수집한 화면에서 일정 항목을 추출해 일정 데이터로 만들 수 있어야 한다.
- **상세 명세**: `F2`
- **관련 Issue**: [#4](https://github.com/hyerin24/WhenWe/issues/4)
- **범위 근거**: §2

### M-04 · 수집 데이터 서버 전달

- **Requirement**: 브라우저에서 수집한 일정 데이터를 서버로 전달할 수 있어야 한다.
- **계약**: [api.md](api.md) — "브라우저 수집 결과 전달" (**현재 `합의 대기`**). endpoint·request 형태는 **api.md가 유일한 기준**이다.
- **상세 명세**: `F2` → `F3` · `F4`
- **관련 Issue**: [#4](https://github.com/hyerin24/WhenWe/issues/4) · [#5](https://github.com/hyerin24/WhenWe/issues/5) · [#6](https://github.com/hyerin24/WhenWe/issues/6)
- **범위 근거**: §2 (수집 경로 다이어그램)

### M-05 · 일정 정제

- **Requirement**: 전달받은 일정을 **서버에서** 공통 스키마로 정제할 수 있어야 한다.
- **상세 명세**: `F3`
- **관련 Issue**: [#5](https://github.com/hyerin24/WhenWe/issues/5)
- **범위 근거**: §2 · §5
- **TBD**: 공통 스키마 필드 ([§8](#8-tbd))

### M-06 · 일정 저장 · 조회

- **Requirement**: 정제된 일정을 저장하고 다시 조회할 수 있어야 한다.
- **상세 명세**: `F4`
- **관련 Issue**: [#6](https://github.com/hyerin24/WhenWe/issues/6)
- **범위 근거**: §2 · §8
- **TBD**: DB 테이블 설계 ([§8](#8-tbd))

### M-07 · 팀 생성 · 초대 코드 · 팀 참가

- **Requirement**: 팀을 만들고, 초대 코드로 다른 사용자가 그 팀에 참가할 수 있어야 한다.
- **상세 명세**: `F4` (서버) · `F5` (화면)
- **관련 Issue**: [#6](https://github.com/hyerin24/WhenWe/issues/6) · [#7](https://github.com/hyerin24/WhenWe/issues/7)
- **범위 근거**: §2

### M-08 · 팀 일정 취합 조회

- **Requirement**: 팀원 전체의 일정을 취합해 조회할 수 있어야 한다.
- **계약**: [api.md](api.md) — "팀 단위 일정 조회" (**현재 `합의 대기`**)
- **상세 명세**: `F4`
- **관련 Issue**: [#6](https://github.com/hyerin24/WhenWe/issues/6)
- **범위 근거**: §6

### M-09 · 개인 부담도 계산

- **Requirement**: 개인의 과제·시험 밀집도를 반영한 **부담도**를 계산할 수 있어야 한다.
- **상세 명세**: `F7`
- **관련 Issue**: [#9](https://github.com/hyerin24/WhenWe/issues/9)
- **범위 근거**: §2 · §4
- **TBD**: 계산식과 API 필드명 ([§8](#8-tbd)) — **팀 단위 부담도는 [§7](#7-의도적-제외) 참조**

### M-10 · 팀 여유도 계산

- **Requirement**: 팀원 전원의 일정을 합쳐 **시간대 단위 여유도**를 계산할 수 있어야 한다.
- **상세 명세**: `F7`
- **관련 Issue**: [#9](https://github.com/hyerin24/WhenWe/issues/9)
- **범위 근거**: §2 · §4
- **TBD**: 계산식과 API 필드명 ([§8](#8-tbd))

### M-11 · 팀 Heatmap 표시

- **Requirement**: 팀의 여유도를 Calendar Heatmap으로 확인할 수 있어야 한다.
- **계약**: [api.md](api.md) — "부담도·여유도 결과 조회" (**현재 `합의 대기`**)
- **상세 명세**: `F6`
- **관련 Issue**: [#8](https://github.com/hyerin24/WhenWe/issues/8)
- **범위 근거**: §2 · §7

### M-12 · 팀 데이터 접근 제어

- **Requirement**: 자신이 속하지 않은 팀의 데이터에는 접근할 수 없어야 한다.
- **계약**: [api.md](api.md) 상태코드 규칙
- **상세 명세**: `F4` 완료 조건
- **관련 Issue**: [#6](https://github.com/hyerin24/WhenWe/issues/6)

### M-13 · 민감정보 노출 방지

- **Requirement**: 에러 응답·로그·화면에 **LMS 원문이나 개인 일정 제목**이 그대로 남지 않아야 한다.
- **계약**: [api.md](api.md) 에러 응답 규칙
- **상세 명세**: `F2` · `F6` · `F7` 완료 조건
- **관련 Issue**: [#4](https://github.com/hyerin24/WhenWe/issues/4) · [#8](https://github.com/hyerin24/WhenWe/issues/8) · [#9](https://github.com/hyerin24/WhenWe/issues/9)
- **범위 근거**: §12 · [CONTRIBUTING §9](../CONTRIBUTING.md#9-secret-관리)

### M-14 · 실제 데이터 end-to-end 동작

- **Requirement**: 실제 LMS 데이터로 수집부터 Heatmap 표시까지 전체 흐름이 한 번 통과해야 한다.
- **상세 명세**: `F7` 완료 조건
- **관련 Issue**: [#9](https://github.com/hyerin24/WhenWe/issues/9)
- **범위 근거**: §11

---

## 4. Should

### S-01 · 개인 부담도 화면 표시

- **Requirement**: 계산된 개인 부담도를 화면에서 확인할 수 있어야 한다.
- **상태**: **TBD** — 표시 위치·표현 방식이 미확정이라 `F6`에서 **의도적으로 제외**되어 있다. 정해지면 별도 Issue로 만든다.
- **상세 명세**: 없음 (`F6` 주석에 제외 사유만 기록)
- **관련 Issue**: 없음
- **범위 근거**: §7 · §13

### S-02 · 웹 반응형

- **Requirement**: 좁은 화면에서도 레이아웃이 깨지지 않아야 한다.
- **상태**: 범위에 포함되지만 **`F5`·`F6`의 완료 조건은 아니다.**
- **관련 Issue**: 없음 (`F5`·`F6` 작업 중 함께 처리)
- **범위 근거**: §3

---

## 5. Could

### C-01 · Heatmap 셀 상세 정보

- **Requirement**: Heatmap의 한 칸을 선택하면 그 시간대의 상세 정보를 볼 수 있다.
- **상태**: **TBD** — 무엇을 보여줄지 미정 (역할 6·7 협의)
- **상세 명세**: `F6` 구현 범위
- **관련 Issue**: [#8](https://github.com/hyerin24/WhenWe/issues/8)

### C-02 · 배포 환경 접근

- **Requirement**: 배포된 환경에서 서비스에 접근할 수 있다.
- **상태**: **TBD** — 배포 방식 미확정, 후순위
- **범위 근거**: §5 · §13

---

## 6. Won't (이번 범위에서 하지 않음)

### 아키텍처 결정 — 후순위가 아니라 **하지 않기로 한 것**

#### W-01 · 학교 ID/PW 저장

- **Requirement**: 학교 ID/PW를 입력받아 저장하지 **않는다.**
- **범위 근거**: §3 · [CONTRIBUTING §9](../CONTRIBUTING.md#9-secret-관리)

#### W-02 · 서버가 LMS에 대신 로그인하거나 fetch

- **Requirement**: 서버가 사용자를 대신해 LMS에 로그인하거나 Calendar를 fetch하지 **않는다.** 수집은 [M-02](#m-02--lms-일정-수집)의 방식만 사용한다.
- **범위 근거**: §2 · §3

### 후순위

| ID | 하지 않는 것 | 범위 근거 |
|---|---|---|
| **W-03** | iCal 구독 URL 방식 수집 — **현재 MVP가 아니다.** 대안으로 검토만 된 상태 | §13 |
| **W-04** | 알림 (푸시 · 메일) | §3 |
| **W-05** | 반복 일정 편집 | §3 |
| **W-06** | 모바일 네이티브 앱 — 웹 반응형([S-02](#s-02--웹-반응형))까지만 | §3 |
| **W-07** | 다중 팀 비교 | §3 |
| **W-08** | 경기대학교 외 LMS 지원 | §12 |

> 개발 인프라(CI/CD 등)는 제품 요구사항이 아니므로 이 문서에서 다루지 않습니다. 범위는 [PLANNING §3](PLANNING.md#3-제외-범위-이번에-하지-않는-것)에 있습니다.

---

## 7. 의도적 제외

**팀 단위 부담도**는 이 문서의 독립 요구사항으로 세우지 않습니다.

- [PLANNING §4](PLANNING.md#4-용어--부담도와-여유도는-다릅니다)에서 **이번 MVP 범위가 아님**이 확정되었습니다.
- [PLANNING §2](PLANNING.md#2-mvp-2일-안에-반드시-되는-것) MVP 목록에도, `F7`의 **완료 조건**에도 없습니다.
- `F7` 구현 범위에 항목은 남아 있으므로 **구현 과정에서 사용될 수 있으나, 완료 판정 대상이 아닙니다.**

개인 단위 부담도는 [M-09](#m-09--개인-부담도-계산)로 별도 관리됩니다.

---

## 8. TBD

**정의는 [PLANNING §13](PLANNING.md#13-미확정-사항)이 기준입니다.** 아래는 요구사항 관점의 요약이며, 확정되면 §13과 해당 기준 문서를 고칩니다.

| 미확정 사항 | 영향받는 요구사항 |
|---|---|
| Frontend 프레임워크 | M-01 · M-07 · M-11 · S-02 |
| 브라우저 실행 모듈 디렉터리 위치 | M-02 · M-03 |
| 정제 후 공통 일정 스키마 필드 | M-03 · M-04 · M-05 · M-06 |
| DB 테이블 설계 | M-06 |
| 부담도 · 여유도 **계산식과 API 필드명** | M-09 · M-10 |
| 계산 결과를 저장할지 요청 시 계산할지 | M-09 · M-10 |
| [api.md](api.md) 엔드포인트 전체 (현재 등록 0개) | M-04 · M-08 · M-11 |
| 부담도 화면 표시 방식 | **S-01** |
| 배포 방식 | **C-02** |
| 역할 ↔ 팀원 매핑 | 전체 (담당자 기준은 Issue) |
| iCal 구독 URL 방식 채택 여부 | **W-03** |

---

## 9. Source of Truth 표

| 정보 | 이 정보를 정의하는 **유일한** 문서 | SPEC.md는 |
|---|---|---|
| 요구사항 **ID** · **MoSCoW 우선순위** · 기준 문서 **매핑** | **SPEC.md** | 정의함 |
| 목표 · MVP 범위 · 제외 범위 | [PLANNING.md](PLANNING.md) §1~§3 | 가리킴 |
| 용어 (부담도 · 여유도) | [PLANNING.md](PLANNING.md) §4 | 가리킴 |
| 기술 스택 · 사용자 흐름 · 화면 목록 | [PLANNING.md](PLANNING.md) §5~§7 | 가리킴 |
| 데이터 개요 · **DB 설계** | [PLANNING.md](PLANNING.md) §8 → [FEATURES.md](FEATURES.md) `F4` | 가리킴 |
| **7명 역할 분담** | [PLANNING.md](PLANNING.md) §9 | 언급 안 함 |
| **Day 1 / Day 2 일정** | [PLANNING.md](PLANNING.md) §10 + GitHub Milestone | 언급 안 함 |
| 기능 의존성 · 리스크 | [PLANNING.md](PLANNING.md) §11 · §12 | 가리킴 |
| **미확정 사항 원본** | [PLANNING.md](PLANNING.md) §13 | §8에서 **요약만** |
| **기능 구현 범위 · 완료 조건** · P0/P1 · 선행 | [FEATURES.md](FEATURES.md) `F1`~`F7` | F번호만 가리킴 |
| **endpoint · request · response · 필드명 · error code** | [api.md](api.md) | "api.md 참조"만 |
| API 공통 규칙 (camelCase · ISO 8601 · `{items:[...]}` · 에러 구조) | [api.md](api.md) | 가리킴 |
| **작업 상태 · 담당자 · Milestone** | **GitHub Issue [#3](https://github.com/hyerin24/WhenWe/issues/3)~[#9](https://github.com/hyerin24/WhenWe/issues/9)** | #번호만 가리킴 |
| **부담도 · 여유도 계산식** | [FEATURES.md](FEATURES.md) `F7` (현재 미확정) | 언급 안 함 |
| **Git workflow** · 리뷰 · Secret 규칙 | [../CONTRIBUTING.md](../CONTRIBUTING.md) | 언급 안 함 |
| 초보 팀원 실행 절차 | [ONBOARDING.md](ONBOARDING.md) | 언급 안 함 |
| Claude Code 작업 규칙 | [../CLAUDE.md](../CLAUDE.md) | 언급 안 함 |

> 이 표에서 **SPEC.md가 "정의함"인 행은 첫 줄 하나뿐**입니다. 그래서 이 문서가 늘어나도 다른 기준 문서와 충돌할 표면이 생기지 않습니다.
