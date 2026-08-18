# 협업 규칙

7명 / 2일 프로젝트입니다. **규칙은 이 문서 하나로 끝입니다.** 헷갈리면 여기만 보세요.

## 요약 (30초)

```text
Issue 만들기 → develop에서 브랜치 따기 → 작업 → 커밋 → PR(develop으로) → 리뷰 → Squash Merge
```

- `main`에는 **직접 push할 수 없습니다** (GitHub Ruleset이 막습니다).
- `develop`은 **삭제만 GitHub Ruleset이 막습니다.** push 자체는 막지 않으니, **팀 규칙으로 PR을 사용합니다.**
- 기능 PR의 대상은 **항상 `develop`** 입니다.
- Merge 방식은 흐름마다 다릅니다 — 기능·긴급수정은 **Squash Merge**, 배포(`develop → main`)만 **Merge Commit**.
- 커밋 메시지: `Feat: LMS 일정 불러오기 구현 (#12)`
- 브랜치 이름: `feat/lms-calendar-import-#12`

**이 문서는 협업 규칙만 다룹니다.** 나머지는 여기로.

| 찾는 것 | 문서 |
|---|---|
| 기획 · 7명 역할 · 2일 일정 · 미확정 사항 | [docs/PLANNING.md](docs/PLANNING.md) |
| 기능별 구현 범위 · 완료 조건 — **Issue의 원본** | [docs/FEATURES.md](docs/FEATURES.md) |
| API 요청·응답 계약 | [docs/api.md](docs/api.md) |
| 실행 방법 | [frontend/README.md](frontend/README.md) · [backend/README.md](backend/README.md) |

---

## 1. 브랜치 구조

```text
main                      배포 · 시연 가능한 안정 버전. 직접 push 금지
 └── develop              모든 개발이 합쳐지는 기준 브랜치
      ├── feat/*          새 기능
      ├── fix/*           개발 중 발견한 버그 수정
      └── refactor/*      기능 변화 없는 구조 개선

main
 └── hotfix/*             이미 main에 올라간 것의 긴급 수정 (시연 중 사고 등)
```

| 브랜치 | 역할 |
|---|---|
| `main` | 언제든 시연할 수 있는 상태를 유지한다. `develop`이 안정됐을 때만 PR로 반영한다. |
| `develop` | 통합 기준. 여기서 브랜치를 따고, 여기로 PR을 보낸다. |

## 2. 새 작업 시작하기

**시작은 항상 Issue입니다.** (Issue 만들기 → 번호 확인 → 브랜치 생성)

```bash
git switch develop
git pull origin develop          # ← 이걸 빼먹으면 나중에 충돌로 되돌아옵니다
git switch -c feat/lms-calendar-import-#12
```

> Claude Code를 쓴다면 `/new-branch` 를 사용하세요. 위 순서를 대신 확인해줍니다.

## 3. 브랜치 이름

```text
<type>/<내용-kebab-case>-#<issue번호>
```

```text
feat/lms-calendar-import-#12
fix/calendar-date-error-#18
refactor/event-parser-#23
```

- `type`은 커밋 Type과 같은 뜻으로 씁니다: `feat` `fix` `refactor` `docs` `chore` `hotfix`
- 내용은 **소문자 + 하이픈**으로 씁니다. 한글·공백·대문자는 쓰지 않습니다.
- Issue를 만들 정도가 아닌 잔작업이라면 `-#번호`는 **생략해도 됩니다.**

## 4. 커밋 메시지

```text
Type: 설명 (#이슈번호)
```

```text
Feat: LMS 일정 불러오기 구현 (#12)
Fix: 일정 날짜 변환 오류 수정 (#18)
Docs: API 계약서에 팀 조회 엔드포인트 추가 (#21)
```

| Type | 사용 |
|---|---|
| `Feat` | 새 기능 |
| `Fix` | 버그 수정 |
| `Refactor` | 기능 변화 없는 구조 개선 |
| `Docs` | 문서 |
| `Chore` | 설정·패키지·빌드 등 |
| `Style` | 코드 포맷·CSS 등 동작 변화 없는 변경 |
| `Test` | 테스트 |
| `Rename` / `Remove` | 파일·폴더 이름 변경 / 삭제 |

> 실제로는 `Feat` `Fix` `Docs` `Chore` `Refactor` 다섯 개로 거의 다 해결됩니다. 고민되면 이 중에서 고르세요.

원칙 네 가지

1. **하나의 논리적 변경 = 하나의 커밋.** 기능 구현과 오타 수정을 한 커밋에 섞지 않습니다.
2. 제목은 짧고 명확하게. 무엇을 했는지 한 줄로.
3. 가능하면 Issue 번호를 붙입니다.
4. `git add .` 전에 `git status`로 **의도하지 않은 파일이 섞였는지** 확인합니다.

## 5. Issue

**Issue 내용은 [docs/FEATURES.md](docs/FEATURES.md)에서 가져옵니다.** 처음부터 쓰지 마세요.
해당 기능 섹션의 **목표 / 구현 범위 / 완료 조건**을 그대로 옮겨 붙이고, 발급된 번호를 FEATURES의 `Issue` 칸에 적습니다.

- **작업 단위 하나 = Issue 하나.** 하루 안에 끝나지 않을 것 같으면 쪼갭니다.
- 템플릿 두 종류가 있습니다: **기능 개발** / **버그**
- Milestone에 `Day 1` 또는 `Day 2`를 지정합니다. 진행률이 자동으로 집계됩니다.
- 2일 프로젝트입니다. **Issue 쓰는 데 10분 이상 쓰지 마세요.** 목표 / 구현 범위 / 완료 조건만 채우면 충분합니다.

## 6. Pull Request

| 작업 | 브랜치 | PR 대상 | Merge 방식 |
|---|---|---|---|
| 기능 · 버그 · 리팩터링 | `feat/*` `fix/*` `refactor/*` | **`develop`** | **Squash Merge** |
| 배포 (`develop` 통합 완료) | `develop` | **`main`** | **Merge Commit** |
| 긴급 수정 | `hotfix/*` | **`main`** | **Squash Merge** |

> **배포 PR만 Merge Commit인 이유**: `develop → main`을 Squash하면 `main`에 `develop`에는 없는 새 커밋이 생겨
> 두 브랜치의 히스토리가 갈라지고, 다음 배포 PR에서 같은 변경이 중복 diff·충돌로 되돌아옵니다.
>
> ⚠️ **GitHub은 이걸 막아주지 않습니다.** `main`으로 가는 PR에는 Squash 버튼도 그대로 보입니다.
> `hotfix → main`은 Squash가 맞고 `develop → main`은 Merge Commit이 맞는데 둘 다 대상이 `main`이라,
> 소스 브랜치별로 머지 방식을 강제할 방법이 없습니다. **버튼을 누르기 전에 한 번 더 확인하세요.**

- 템플릿 4칸(관련 Issue / 변경 내용 / 확인 방법 / 스크린샷)을 채웁니다.
- `Closes #12` 를 넣으면 머지될 때 Issue가 자동으로 닫힙니다.
- **작다고 PR을 건너뛰지 마세요.** 7명이 같은 파일을 만지고 있습니다.

> Claude Code를 쓴다면 `/commit-pr` 를 사용하세요. 커밋 → push → PR 생성까지 진행합니다.

## 7. 리뷰 / 머지

- 리뷰어로 **팀원 1명을 지정**하고 단톡에 알립니다.
- **머지는 PR을 올린 사람이 직접 합니다.** (리뷰 승인을 받은 뒤)
- ⏱ **리뷰 요청 후 30분 안에 응답이 없으면 self-merge해도 됩니다.** 2일짜리 프로젝트에서 리뷰 대기로 전원이 멈추는 게 더 큰 손해입니다. 대신 단톡에 "머지했다"고 남깁니다.
- Merge 방식은 위 표를 따릅니다 — 기능 PR과 `hotfix`는 **Squash Merge**, 배포 PR(`develop → main`)만 **Merge Commit**.
- 머지되면 작업 브랜치(`feat/*` `fix/*` `refactor/*` `hotfix/*`)는 **자동으로 삭제**됩니다 (저장소 설정).
  `main`·`develop`은 Ruleset으로 삭제가 차단되어 있어 남습니다. 로컬 브랜치는 각자 정리하세요.

리뷰할 때 확인할 것 딱 3개

1. **API 계약이 깨지지 않았는가** — 응답 필드가 바뀌었는데 `docs/api.md`가 그대로면 반려
2. **담당 영역 밖 파일을 건드리지 않았는가** — 필요한 변경이었다면 그 담당자를 리뷰어로 추가
3. **Secret이 섞이지 않았는가** — `.env`, 실제 키, iCal URL, 개인 일정 데이터

## 8. 긴급 수정 (시연 중 문제 발생)

```bash
git switch main
git pull origin main
git switch -c hotfix/heatmap-crash
# 수정 후
git push -u origin hotfix/heatmap-crash
# → main으로 PR 생성 → Squash Merge
```

머지 후 **그 수정이 `develop`에도 필요하다면 `develop`에 반영**합니다.

```bash
git switch develop
git pull origin develop
git merge origin/main        # main의 hotfix 내용을 develop으로 가져온다
git push origin develop
```

`develop`에 이미 같은 내용이 들어 있거나 그 코드가 곧 교체될 예정이라면 생략해도 됩니다.
판단이 안 서면 단톡에 물어보세요 — 반영을 빼먹으면 다음 배포에서 버그가 되살아납니다.

## 9. Secret 관리

**절대 커밋하지 않는 것**

```text
.env / 실제 API Key / DB 비밀번호 / Supabase SERVICE_ROLE 키
학교 ID · 비밀번호 / LMS 인증 토큰 / iCal 구독 URL
개인 일정이 들어 있는 .ics 파일 · LMS 화면 HTML 덤프
```

이 프로젝트의 특별한 원칙

- **학교 ID/PW는 서버에 저장하지 않고, 사용자를 대신해 로그인하지도 않습니다.** 이런 코드가 들어온 PR은 반려합니다.
- **iCal 구독 URL은 URL 자체가 인증 토큰입니다.** 사용자별 값이므로 `.env`가 아니라 DB의 사용자 레코드에 저장하고, 로그·에러 메시지·API 응답·스크린샷에 남기지 않습니다.
- **`SUPABASE_SERVICE_ROLE_KEY`는 백엔드 전용입니다.** `VITE_`(또는 `NEXT_PUBLIC_`) 접두사를 붙이면 프론트엔드 번들에 그대로 박혀 공개됩니다.
- 테스트용으로 **본인의 실제 LMS 일정 파일을 저장소에 넣지 마세요.** 필요하면 내용을 가공해서 사용합니다.

환경변수가 새로 필요해지면 `.env.example`에 **키만** 추가하고 단톡에 알립니다. 실제 값은 저장소 밖에서 공유합니다.

### 만약 Secret을 커밋했다면

1. 당황해서 강제 push로 지우려 하지 말고 **먼저 단톡에 알립니다.**
2. **해당 키를 즉시 재발급**합니다. (커밋을 지워도 이미 노출된 키는 노출된 것입니다 — 이 저장소는 Public입니다)
3. 그다음 history 정리를 함께 논의합니다.

## 10. 충돌이 났을 때

```bash
git switch feat/내-브랜치
git fetch origin
git merge origin/develop     # develop의 최신 내용을 내 브랜치로 가져와 충돌을 여기서 해결
```

- **`git push --force`, `git reset --hard`, `rebase`는 공유 브랜치에서 쓰지 않습니다.** 남의 커밋이 사라집니다.
- 남의 코드와 충돌해 판단이 안 서면 직접 고치지 말고 **그 담당자에게 물어봅니다.**

## 11. Claude Code를 쓸 때

프로젝트 루트의 [CLAUDE.md](CLAUDE.md)에 Claude Code가 지켜야 할 Git 규칙이 들어 있습니다.
제공되는 스킬은 두 개입니다.

| 스킬 | 용도 |
|---|---|
| `/new-branch` | Issue·현재 상태·미커밋 변경을 확인하고 규칙에 맞는 작업 브랜치를 만듭니다 |
| `/commit-pr` | 변경을 분석해 커밋 → push → PR 생성까지 진행합니다 |

> 스킬은 **Claude Code를 재시작해야** 목록에 나타납니다.
