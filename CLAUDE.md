# CLAUDE.md

Claude Code가 이 저장소에서 작업할 때 지켜야 할 규칙입니다.
팀원용 협업 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)에 있고, 이 문서는 그것과 **모순이 없어야** 합니다.

## 프로젝트

**WhenWe** — 팀원들의 학교 일정을 모아 다 같이 가능한 시간을 찾아주는 서비스.
LMS 일정 수집 · 데이터 정제 · 팀 기능 · Heatmap · 부담도/여유도 알고리즘으로 구성됩니다.

### 수집 경로 (확정 — 반드시 지킵니다)

```text
브라우저  LMS Calendar fetch → 파싱 → 일정 JSON  ──API──▸  서버  정제 → 저장 → 조회
```

- **fetch와 파싱은 사용자 브라우저에서** 실행합니다. 이미 로그인된 본인의 LMS 세션을 씁니다.
- **서버가 대신 fetch하는 코드를 작성하지 않습니다.** 그건 대리 로그인이 되어 아래 Secret 결정과 충돌합니다.
- **정제부터 서버**(`backend/`)입니다. 서버는 브라우저가 보낸 일정 JSON만 받습니다.
- 자세한 내용은 [docs/PLANNING.md](docs/PLANNING.md) §2 · §11.

- **7명 / 약 2일**짜리 팀 프로젝트입니다. 과도한 추상화, 불필요한 설정 추가, 큰 리팩터링을 제안하지 마세요.
- `frontend/` (프론트엔드) · `backend/` (Node API) · `docs/` (공동) 로 나뉩니다.
- DB와 인증은 **Supabase**를 사용합니다. 다른 BaaS로 바꾸자는 제안을 하지 마세요.
- 환경은 **Windows / PowerShell**입니다. 경로에 한글이 섞일 수 있으니 인용 부호를 빠뜨리지 마세요.

## Git 규칙

### 절대 하지 않는 것

- **`main` · `develop`에서 기능 커밋을 만들지 않습니다.** 반드시 작업 브랜치에서 작업합니다.
  사용자가 `main`이나 `develop`에 있는 상태로 커밋을 요청하면 **작업을 멈추고 브랜치 생성을 먼저 제안**하세요.
- **미커밋 변경사항을 발견했을 때 `stash` · `reset` · `checkout` · 브랜치 삭제를 임의로 실행하지 않습니다.**
  무엇이 남아 있는지 사용자에게 먼저 보고하고, 어떻게 할지 물어봅니다.
- **history rewrite, `push --force`, `rebase`, 기존 브랜치 삭제를 사용자 확인 없이 하지 않습니다.**
- 사용자가 요청하지 않은 `commit` · `push` · PR 생성을 하지 않습니다.

### 브랜치 · 커밋 규칙

```text
브랜치   <type>/<내용-kebab-case>-#<issue번호>     예: feat/lms-calendar-import-#12
커밋     Type: 설명 (#이슈번호)                    예: Feat: LMS 일정 불러오기 구현 (#12)
```

Type: `Feat` `Fix` `Refactor` `Docs` `Chore` `Style` `Test` `Rename` `Remove`

- **하나의 논리적 변경 = 하나의 커밋.** 서로 다른 성격의 변경은 커밋을 분리해 제안하세요.
- 커밋 메시지에 `Co-Authored-By` 같은 트레일러를 붙이지 않습니다. 제목 한 줄로 끝냅니다.

### 세 가지 흐름과 Merge 방식

| 흐름 | 브랜치 | PR 대상 | Merge 방식 |
|---|---|---|---|
| 일반 기능 · 버그 · 리팩터링 | `feat/*` `fix/*` `refactor/*` | `develop` | **Squash Merge** |
| 배포 (`develop` 통합 완료) | `develop` | `main` | **Merge Commit** |
| 긴급 수정 | `hotfix/*` | `main` | **Squash Merge** |

- **배포 PR(`develop → main`)은 Squash하지 않습니다.** Squash하면 두 브랜치 히스토리가 갈라져 다음 배포에서 충돌합니다.
- `hotfix`가 `main`에 머지된 뒤, 그 수정이 `develop`에도 필요하면 **`develop`에서 `origin/main`을 merge**해 반영하도록 안내하세요.
- 저장소 설정상 PR이 머지되면 **작업 브랜치(`feat/*` `fix/*` `refactor/*` `hotfix/*`)는 원격에서 자동 삭제**됩니다.
  `main`·`develop`은 Ruleset으로 삭제가 차단되어 있어 남습니다.
- `rebase`는 사용하지 않습니다 (저장소에서도 Rebase merge가 비활성화되어 있습니다).

### 새 작업을 시작할 때 확인 순서

`/new-branch` 스킬과 동일한 순서를 따릅니다.
관련 Issue → 현재 브랜치 → `git status` → 미커밋 변경 → `git fetch` → base 브랜치(`develop`) → 이름 규칙 → 브랜치 생성

## 기준 문서

| 찾는 것 | 문서 |
|---|---|
| 기획 · 7명 역할 · 미확정 사항 | [docs/PLANNING.md](docs/PLANNING.md) |
| 기능 구현 범위 · 완료 조건 — **GitHub Issue의 원본** | [docs/FEATURES.md](docs/FEATURES.md) |
| API 요청·응답 계약 | [docs/api.md](docs/api.md) |
| 팀원용 협업 규칙 | [CONTRIBUTING.md](CONTRIBUTING.md) |

- 기능 작업을 시작할 때는 **`docs/FEATURES.md`의 해당 기능 섹션과 완료 조건을 먼저 읽으세요.**
- **미확정 사항을 임의로 확정하지 않습니다.** [PLANNING §13](docs/PLANNING.md)과 FEATURES의 "완료 조건에 넣지 않은 것"이 기준입니다.

## API 계약

**[docs/api.md](docs/api.md)가 Frontend와 Backend 사이의 계약서입니다.**

- **API 응답의 필드명·구조·상태코드를 임의로 변경하지 않습니다.** 프론트엔드의 Mock이 조용히 깨집니다.
- 변경이 필요하면 **`docs/api.md`를 먼저 수정하고, PR에서 양쪽 담당자가 확인하도록** 안내하세요.
- 필드 네이밍은 **camelCase**, 날짜·시간은 **ISO 8601**(UTC)입니다.
- **목록 응답과 목록 요청 바디 모두** `{ "items": [...] }` 로 감쌉니다. 배열을 그대로 주고받지 않습니다.
- **에러 `message`에 LMS 원문 HTML 조각이나 개인 일정 제목을 넣지 않습니다.** 위치·건수만 알려줍니다.
- `docs/api.md`에서 `DRAFT`로 표시된 항목은 **아직 합의되지 않은 초안**입니다. 확정된 명세처럼 취급하지 마세요.

## 담당 영역

`frontend/`와 `backend/`는 서로 다른 팀원의 영역입니다.

- 한쪽 작업 중에 **반대쪽 폴더를 대규모로 수정하지 않습니다.** 필요하면 먼저 사용자에게 알리고, 최소 범위로만 손댑니다.
- 여러 담당 영역에 걸친 변경은 **커밋과 PR을 나누는 것**을 제안하세요.

## Secret

다음은 **어떤 경우에도** 코드·문서·커밋 메시지·로그·PR 본문에 넣지 않습니다.

```text
.env 의 실제 값 / API Key / DB 비밀번호 / SUPABASE_SERVICE_ROLE_KEY
학교 ID · 비밀번호 / LMS 인증 토큰 / iCal 구독 URL / 개인 일정 원본(.ics, LMS HTML 덤프)
```

이 프로젝트의 아키텍처 결정 — **반드시 지킵니다.**

- **학교 ID/PW를 입력받아 저장하거나, 사용자를 대신해 LMS에 로그인하는 코드를 작성하지 않습니다.**
  그런 기능을 요청받으면 구현 전에 이 결정과 충돌한다는 점을 알리세요.
- **iCal 구독 URL 방식은 현재 MVP가 아닙니다** ([PLANNING §13](docs/PLANNING.md) — 대안으로 검토만 된 상태).
  **먼저 제안하지 마세요.** 채택하는 경우에는 URL 자체가 인증 토큰이므로 공용 `.env`가 아니라 사용자별 DB 레코드에 저장하고,
  로그·에러 메시지·API 응답에 원문을 남기지 않습니다.
- **`SUPABASE_SERVICE_ROLE_KEY`를 프론트엔드 환경변수(`VITE_` / `NEXT_PUBLIC_`)로 옮기지 않습니다.** 번들에 공개됩니다.
- 환경변수가 새로 필요하면 `.env.example`에 **키만** 추가하고 실제 값은 넣지 않습니다.

### 이미 커밋된 Secret을 발견하면

1. **실제 값을 응답에 출력하지 않습니다.**
2. 즉시 사용자에게 알립니다. (이 저장소는 **Public**입니다)
3. 대응을 제안합니다 — **키 재발급이 최우선**, history 정리는 그다음이며 사용자 확인 없이 실행하지 않습니다.

## 검증

아직 빌드·테스트 파이프라인이 없습니다. 변경을 확인하는 방법은 각 폴더의 README를 따릅니다.
"파일을 만들었다"만으로 완료로 보고하지 말고, **실제로 동작하는지 확인한 결과를 함께 보고**하세요.
