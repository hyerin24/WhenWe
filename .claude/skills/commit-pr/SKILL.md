---
name: commit-pr
description: WhenWe 저장소에서 작업을 마무리합니다. 변경 내용을 분석해 커밋 규칙에 맞게 커밋하고, 사용자 확인 후 push하고 현재 브랜치에 맞는 base(기능은 develop, 배포·hotfix는 main)로 PR을 생성합니다. 사용자가 "작업 끝났어", "커밋해줘", "PR 올려줘", "배포하자", "/commit-pr" 라고 요청할 때 사용합니다.
---

# 작업 마무리 — 커밋과 PR

`CONTRIBUTING.md`의 커밋·PR 규칙에 맞춰 작업을 마무리합니다.
**push와 PR 생성은 사용자 확인을 받은 뒤에만** 진행합니다.

## 1단계: 현재 상태 확인

```bash
git branch --show-current
git status
git diff
git diff --staged
```

## 2단계: 브랜치 확인 — main / develop이면 즉시 중단

현재 브랜치가 **`main` 또는 `develop`이면 커밋하지 않고 멈춥니다.**

사용자에게 알리고 이렇게 제안합니다.

1. 지금 변경을 그대로 유지한 채 작업 브랜치를 만든다 → `git switch -c <type>/<내용>-#<번호>` (변경사항은 따라옵니다)
2. 브랜치 이름은 `/new-branch` 규칙에 맞춘다

`hotfix` 작업이라 정말 `main`에서 시작해야 하는 경우에도, **커밋은 `hotfix/*` 브랜치에서** 합니다.

**예외 — 배포 PR(`develop → main`)**
사용자가 "배포하자", "main에 반영하자"라고 요청한 경우는 `develop`에 커밋할 일이 없습니다.
`develop`의 작업 트리가 깨끗한지만 확인하고 **커밋 관련 단계(3~8단계)를 건너뛰어 9단계(PR 생성)로 갑니다.**
이때 base는 `main`, 머지 방식은 **Merge Commit**입니다.

## 3단계: 관련 Issue 확인

```bash
gh issue view <번호>
```

- 브랜치 이름에서 Issue 번호를 추출합니다 (`feat/...-#12` → `12`).
- Issue의 **완료 조건**을 읽고, 실제 변경이 그것을 충족하는지 확인합니다.
  충족하지 못했다면 사용자에게 알리고 계속할지 물어봅니다.
- 번호를 찾을 수 없으면 사용자에게 물어봅니다. 없으면 없는 채로 진행합니다.

## 4단계: 변경 내용 분석 · Secret 점검

`git diff`를 읽고 **무엇이 왜 바뀌었는지** 스스로 요약합니다. 이때 다음을 반드시 확인합니다.

- ⚠️ **Secret이 섞였는지** — 발견하면 **커밋하지 않고 즉시 사용자에게 알립니다. 실제 값은 출력하지 않습니다.**
  - `.env`, 실제 API Key, `SUPABASE_SERVICE_ROLE_KEY`, DB 비밀번호
  - 학교 ID/PW, iCal URL, `.ics` 파일
  - **`*.local.html` 등 LMS 화면 덤프** — `.gitignore`에 있지만 `git add -f`나 다른 확장자로 저장하면 통과합니다
  - **개인 일정 제목이 들어간 테스트 fixture·파싱 결과 JSON** — 수집·파싱 작업 중 가장 섞이기 쉬운 경로입니다
  - **에러 메시지·로그에 박힌 LMS 원문 조각이나 일정 제목** — `docs/api.md`가 금지한 것입니다. 위치·건수만 남겨야 합니다
- **API 계약이 바뀌었는지** → `docs/api.md`가 따라오지 않았으면 문서 수정을 먼저 제안합니다.
  - 응답 필드·구조·상태코드가 바뀐 경우
  - **새 엔드포인트를 구현했는데 `docs/api.md`의 해당 항목이 아직 `합의 대기`인 경우** → `Method`·`Path`와 상세를 채우자고 제안합니다
- **담당 영역 밖(`frontend/` ↔ `backend/`) 파일이 섞였는지** → 의도한 변경인지 확인합니다.
- 디버그용 `console.log`, 주석 처리된 코드 덩어리, 임시 파일이 남아 있는지.

## 5단계: 커밋 분리 판단

**하나의 논리적 변경 = 하나의 커밋**입니다. 성격이 다른 변경이 섞였으면 나눠서 커밋하겠다고 제안합니다.

- 기능 구현 + 설정 변경 → `Feat` / `Chore` 분리
- 기능 구현 + 문서 수정 → 문서가 그 기능의 API 계약이면 함께, 무관하면 분리
- 리팩터링 + 기능 추가 → 반드시 분리 (리뷰가 불가능해집니다)

## 6단계: 커밋

```text
Type: 설명 (#이슈번호)
```

Type: `Feat` `Fix` `Refactor` `Docs` `Chore` `Style` `Test` `Rename` `Remove`

- 제목은 짧고 명확하게. 무엇을 했는지 한 줄.
- `Co-Authored-By` 같은 트레일러는 붙이지 않습니다. 제목 한 줄로 끝냅니다.
- **`git add .` 대신 파일을 명시해 add**합니다. 의도하지 않은 파일이 들어가는 사고를 막습니다.

## 7단계: 동작 확인

테스트나 실행 스크립트가 있으면 돌립니다. 없으면 각 폴더 README의 확인 방법을 따릅니다.
**확인하지 못했다면 "확인하지 못했다"고 그대로 보고**합니다. 통과한 것처럼 쓰지 않습니다.

## 8단계: push 여부 확인

**사용자에게 물어본 뒤에** push합니다. 물어보지 않고 push하지 않습니다.

```bash
git push -u origin <현재-브랜치>
```

## 9단계: PR 생성

```bash
gh pr create --base <base> --title "<커밋 제목과 동일하게>" --body "..."
```

**base는 현재 브랜치에 따라 결정합니다. 임의로 고르지 마세요.**

| 현재 브랜치 | `--base` | 머지할 때 방식 |
|---|---|---|
| `feat/*` `fix/*` `refactor/*` (그 외 `docs/*` `chore/*` 등 작업 브랜치 동일) | `develop` | Squash Merge |
| `develop` (배포 PR) | `main` | **Merge Commit** |
| `hotfix/*` | `main` | Squash Merge |

- 본문은 `.github/PULL_REQUEST_TEMPLATE.md`의 4칸을 채웁니다.
  - `관련 Issue`: `Closes #12`
  - `변경 내용`: 실제 diff 기준으로 작성
  - `확인 방법`: 리뷰어가 따라할 수 있는 절차
  - `스크린샷`: UI 변경이 있으면 사용자에게 첨부를 요청
- 체크리스트 3개(Secret / `docs/api.md` / 담당 영역)도 실제로 확인한 것만 체크합니다.
- `gh`를 쓸 수 없으면 push까지만 하고 **PR 생성 URL을 안내**합니다.
  base를 위 표에 맞춰 넣어야 합니다 — URL의 `compare/<base>...<브랜치>` 순서입니다.
  - 기능 PR: `https://github.com/hyerin24/WhenWe/compare/develop...<브랜치>?expand=1`
  - 배포 PR: `https://github.com/hyerin24/WhenWe/compare/main...develop?expand=1`
  - hotfix PR: `https://github.com/hyerin24/WhenWe/compare/main...<브랜치>?expand=1`

## 10단계: 보고

- 만든 커밋 목록 (`git log --oneline -n <개수>`)
- **PR URL**
- **단톡에 PR 링크를 공유하고 확인을 요청**하라고 안내합니다. **GitHub Reviewer 지정은 필수가 아닙니다** — 먼저 권하지 마세요.
- 30분 내 응답이 없으면 self-merge 가능하다는 규칙 상기
- 수정 요청이 오면 반영한 뒤 머지한다는 점 상기
- **머지 방식을 명시해 알려줍니다** — 기능 PR·`hotfix`는 Squash Merge, 배포 PR(`develop → main`)은 **Merge Commit**
- 머지되면 원격 작업 브랜치는 자동 삭제됩니다
- `hotfix`를 `main`에 머지한 뒤에는 **그 수정이 `develop`에도 필요한지 확인**하도록 알려줍니다
  (필요하면 `develop`에서 `origin/main`을 merge)

## 하지 말 것

- `main` · `develop`에 직접 커밋하지 않습니다.
- 사용자 확인 없이 push·PR·머지하지 않습니다.
- `push --force`, `reset --hard`, `rebase`를 쓰지 않습니다.
- Secret이 포함된 변경을 "일단 커밋하고 나중에 지우자"고 제안하지 않습니다.
- 테스트를 돌리지 않았는데 통과했다고 쓰지 않습니다.
