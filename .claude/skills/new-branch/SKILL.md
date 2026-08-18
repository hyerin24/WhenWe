---
name: new-branch
description: WhenWe 저장소에서 새 작업용 브랜치를 규칙에 맞게 만듭니다. Issue 확인 → 현재 상태 확인 → 미커밋 변경 확인 → develop 최신화 → Branch Naming 규칙 적용 순서로 진행합니다. 사용자가 "새 작업 시작", "브랜치 만들어줘", "이 이슈 작업할게", "/new-branch" 라고 요청할 때 사용합니다.
---

# 새 작업 브랜치 만들기

`CONTRIBUTING.md`의 브랜치 규칙에 맞는 작업 브랜치를 만듭니다.
**브랜치를 만드는 것까지가 이 스킬의 범위입니다.** 코드 수정이나 커밋은 하지 않습니다.

## 1단계: 관련 Issue 확인

어떤 Issue의 작업인지 확인합니다. 사용자가 번호를 말하지 않았다면 목록을 보여주고 고르게 합니다.

```bash
gh issue list --limit 20
gh issue view <번호>          # 목표·구현 범위·완료 조건을 읽는다
```

- `gh`를 쓸 수 없으면 사용자에게 Issue 번호나 제목을 직접 물어봅니다.
- **Issue가 아직 없다면**: [docs/FEATURES.md](../../../docs/FEATURES.md)의 기능 목록(`F1`~`F7`)을 보여주고 어느 기능인지 고르게 합니다.
  Issue 본문을 **즉석에서 만들지 마세요.** 해당 기능 섹션의 **목표 / 구현 범위 / 완료 조건을 그대로 옮겨** Issue를 먼저 만들자고 제안합니다.
  발급된 번호는 FEATURES의 `Issue` 칸에 적도록 안내합니다.
- 잔작업(오타·설정 등)이라면 Issue 없이 진행해도 되고, 이때 브랜치 이름의 `-#번호`는 생략합니다.

## 2단계: 현재 상태 확인

```bash
git branch --show-current
git status
```

## 3단계: 미커밋 변경이 있으면 멈춘다

**작업 트리가 깨끗하지 않으면 절대 임의로 처리하지 않습니다.**
`stash` · `reset` · `checkout` · 브랜치 삭제를 **실행하지 말고**, 다음을 사용자에게 보고합니다.

- 변경된 파일 목록과 각각이 무엇인지
- 선택지: ① 지금 커밋한다 ② 새 브랜치로 변경을 가져간다 ③ 사용자가 직접 정리한다

사용자가 어떻게 할지 답하기 전까지 진행하지 않습니다.

## 4단계: Base 브랜치 결정

| 작업 성격 | base |
|---|---|
| 기능 · 버그 · 리팩터링 (기본) | `develop` |
| 이미 `main`에 올라간 것의 긴급 수정 | `main` |

`hotfix`가 맞는지 애매하면 사용자에게 확인합니다. 기본은 항상 `develop`입니다.

## 5단계: Base 브랜치 최신화

```bash
git fetch origin
git switch develop            # 또는 main (hotfix인 경우)
git pull origin develop
```

`pull`에서 충돌이 나면 멈추고 사용자에게 보고합니다.

## 6단계: 브랜치 이름 만들기

```text
<type>/<내용-kebab-case>-#<issue번호>
```

| type | 사용 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변화 없는 구조 개선 |
| `docs` | 문서 |
| `chore` | 설정·패키지 등 |
| `hotfix` | `main` 긴급 수정 |

- 내용은 **영문 소문자 + 하이픈**. 한글·공백·대문자·언더스코어를 쓰지 않습니다.
- Issue 제목을 그대로 옮기지 말고 **3~5단어로 줄입니다.**
- 예: `feat/lms-calendar-import-#12` · `fix/calendar-date-error-#18` · `refactor/event-parser-#23`

이름을 정했으면 **생성 전에 사용자에게 보여주고 확인**받습니다.

## 7단계: 브랜치 생성

```bash
git switch -c feat/lms-calendar-import-#12
```

## 8단계: 보고

- 만든 브랜치 이름과 base 브랜치
- 해당 Issue의 **구현 범위 체크리스트**를 다시 정리해 보여주기 (이제 무엇을 하면 되는지)
- 작업이 끝나면 `/commit-pr` 를 쓰면 된다고 안내

## 하지 말 것

- `main` · `develop`에서 그대로 작업을 시작하게 두지 않습니다.
- 미커밋 변경을 임의로 `stash`/`reset`/`checkout`/삭제하지 않습니다.
- 브랜치를 만들면서 코드를 수정하거나 커밋하지 않습니다.
- 원격에 이미 같은 이름의 브랜치가 있으면 덮어쓰지 말고 사용자에게 알립니다.
