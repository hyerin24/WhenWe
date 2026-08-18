# 처음 오신 분께

**Git이 처음이어도 이 문서만 보고 Issue 하나를 끝까지 처리할 수 있게** 만들었습니다.
명령은 그대로 복사해 쓰세요. **왜 이런 규칙인지**는 [CONTRIBUTING.md](../CONTRIBUTING.md)에 있습니다.

---

## 0. 시작 전 체크 3개

시작 전에 이 세 개만 확인하세요. 여기서 막히면 뒤가 전부 안 됩니다.

- [ ] **GitHub 저장소 초대를 수락했나요?**
  메일이나 https://github.com/hyerin24/WhenWe 에서 수락합니다.
  **수락하기 전에는 `push`가 403으로 거부됩니다.** 코드를 다 써놓고 마지막에 막히면 아깝습니다. 지금 확인하세요.

- [ ] **`gh` (GitHub CLI)가 되나요?**
  ```bash
  gh --version
  gh auth status
  ```
  "not recognized"가 나오면 **터미널(또는 VS Code)을 재시작**해보세요. 설치 직후에는 흔한 일입니다.
  그래도 안 되면 https://cli.github.com 에서 설치 후 `gh auth login`.
  *(없어도 GitHub 웹으로 다 할 수 있습니다. 다만 있으면 훨씬 빠릅니다.)*

- [ ] **`.env` 실제 값을 받았나요?**
  **저장소에는 값이 없습니다.** 단톡에서 따로 공유합니다. 아직 못 받았으면 지금 요청하세요.

## 1. 한 번만 하는 준비

```bash
git clone https://github.com/hyerin24/WhenWe.git
cd WhenWe

cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
# → .env 안의 빈 값을 단톡에서 받은 값으로 채웁니다. .env는 커밋되지 않습니다.
```

> ⚠️ **`npm install`은 아직 동작하지 않습니다.** `package.json`이 아직 커밋되지 않았습니다.
> 프로젝트 초기 세팅이 `develop`에 올라온 뒤부터 [frontend/README.md](../frontend/README.md) · [backend/README.md](../backend/README.md)의 실행 방법이 동작합니다.

## 2. 매번 반복하는 6단계

작업 하나 = 이 6단계 한 바퀴입니다.

### ① 무엇을 할지 정하기

```bash
gh issue list
```

- 맡을 Issue를 고릅니다. **Issue 번호를 적어두세요.** 이 번호가 6단계 내내 따라옵니다.
- **아직 Issue가 없으면** [docs/FEATURES.md](FEATURES.md)에서 기능(`F1`~`F7`)을 찾아, 그 섹션의 **목표 / 구현 범위 / 완료 조건을 그대로 복사해** Issue를 먼저 만듭니다. 내용을 새로 지어내지 마세요.
- Issue의 **완료 조건**을 먼저 읽으세요. 그게 "다 했다"의 기준입니다.

### ② 브랜치 만들기

```bash
git switch develop
git pull origin develop          # ← 빼먹으면 나중에 충돌로 되돌아옵니다
git switch -c feat/team-create-#12
```

브랜치 이름은 `<type>/<영문-소문자-하이픈>-#<Issue번호>` 입니다.
`type` = `feat` `fix` `refactor` `docs` `chore` (긴급 수정만 `hotfix`)

### ③ 작업하기

```bash
git status                       # 자주 확인하세요. 의도한 파일만 바뀌었나요?
```

내 담당 폴더(`frontend/` 또는 `backend/`)만 건드립니다. 반대쪽을 고쳐야 하면 **먼저 그 담당자에게 말하세요.**

### ④ 커밋하기

```bash
git status                       # ← .env 같은 게 섞이지 않았는지 먼저 확인
git add frontend/src/TeamPage.jsx    # 파일을 직접 지정 (git add . 은 피하세요)
git commit -m "Feat: 팀 생성 화면 구현 (#12)"
```

형식은 `Type: 설명 (#Issue번호)` 입니다. Type은 `Feat` `Fix` `Refactor` `Docs` `Chore`로 거의 다 됩니다.

### ⑤ push 하기

```bash
git push -u origin feat/team-create-#12
```

`-u`는 처음 한 번만 필요합니다. 다음부터는 `git push`.

### ⑥ PR 만들기

```bash
gh pr create --base develop --fill
```

또는 GitHub 웹에서 — push 후 저장소 페이지에 뜨는 **"Compare & pull request"** 버튼.

**`base`(왼쪽 브랜치)가 `develop`인지 반드시 확인하세요.** 기본값이 `main`으로 잡혀 있을 수 있습니다.

| 내 브랜치 | base |
|---|---|
| `feat/*` `fix/*` `refactor/*` `docs/*` `chore/*` | **`develop`** |
| `hotfix/*` | `main` |

PR 본문의 4칸을 채우고, 맨 위에 **`Closes #12`** 를 넣습니다. 머지되면 Issue가 자동으로 닫힙니다.

## 3. 리뷰받고 머지하기

1. **단톡에 PR 링크를 공유하고 확인을 요청합니다.**
   GitHub의 **Reviewers 지정은 필수가 아닙니다** — 단톡 공유로 충분합니다.
2. 리뷰 의견이 오면 같은 브랜치에서 고치고 다시 `git push` — PR에 자동 반영됩니다.
3. ⏱ **리뷰 요청 후 30분 안에 응답이 없으면 직접 머지해도 됩니다.** 대신 단톡에 "머지했다"고 남기세요.
4. **머지는 PR을 올린 사람이 직접** 누릅니다. 버튼을 고를 때 주의하세요.

| PR | 눌러야 하는 버튼 |
|---|---|
| 작업 브랜치 → `develop` | **Squash and merge** |
| `develop` → `main` (배포) | **Create a merge commit** ← Squash 아닙니다 |
| `hotfix/*` → `main` | **Squash and merge** |

머지하면 **원격 작업 브랜치는 자동으로 삭제**됩니다. 내 로컬은 직접 정리하세요.

```bash
git switch develop
git pull origin develop
git branch -d feat/team-create-#12
```

## 4. 막혔을 때 — 증상으로 찾기

### `remote: Permission to ... denied` / `403`

초대를 아직 수락하지 않았습니다. [§0](#0-시작-전-체크-3개)으로 돌아가세요.

### `main`이나 `develop`에서 작업해버렸다 — **아직 커밋 안 함**

그냥 브랜치를 만들면 됩니다. **변경 내용이 따라옵니다.**

```bash
git switch -c feat/team-create-#12
```

### `develop`에 이미 커밋해버렸다 — **아직 push 안 함**

**순서가 중요합니다.** 브랜치를 먼저 만들어야 커밋이 보존됩니다.

```bash
git switch -c feat/team-create-#12     # ① 먼저! 커밋이 이 브랜치에 남습니다
git switch develop
git reset --hard origin/develop        # ② develop을 원격 상태로 되돌립니다
```

> ⚠️ ①을 건너뛰고 ②를 실행하면 **작업이 사라집니다.** 순서가 헷갈리면 실행하지 말고 단톡에 물어보세요.

### 이미 `develop`에 push까지 해버렸다

**되돌리려고 `push --force`를 쓰지 마세요.** 남의 커밋이 사라집니다. 단톡에 알리고 함께 처리합니다.

### `! [rejected] ... (fetch first)` — push가 거부됨

원격에 내가 모르는 커밋이 있습니다. 가져와서 합칩니다.

```bash
git pull origin feat/team-create-#12
git push
```

### `CONFLICT (content): Merge conflict in ...`

내 브랜치에서 `develop`의 최신 내용과 충돌한 것입니다.

```bash
git fetch origin
git merge origin/develop
```

충돌 파일을 열면 `<<<<<<<` `=======` `>>>>>>>` 표시가 있습니다. **남길 코드만 남기고 이 표시줄들을 지웁니다.**

```bash
git add <고친-파일>
git commit                             # 메시지는 기본값 그대로 두면 됩니다
```

> **남이 쓴 코드와 충돌해서 판단이 안 서면 직접 고치지 말고 그 담당자에게 물어보세요.**

### PR의 base를 잘못 잡았다

PR을 닫지 마세요. PR 제목 옆 **Edit** → base 드롭다운에서 `develop`으로 바꾸면 됩니다.

### `.env`를 커밋했다

1. **당황해서 강제 push로 지우려 하지 말고 먼저 단톡에 알립니다.**
2. **해당 키를 즉시 재발급**합니다. 이 저장소는 **Public**이라, 커밋을 지워도 이미 노출된 키는 노출된 것입니다.
3. history 정리는 그다음에 함께 논의합니다.

## 5. 절대 하지 말 것

- **`git push --force`** — 남의 커밋이 사라집니다
- **`git reset --hard`** — [§4](#4-막혔을-때--증상으로-찾기)에 적힌 정확한 순서로만
- **`.env`·실제 키·개인 일정 파일 커밋** — 목록은 [CONTRIBUTING §9](../CONTRIBUTING.md#9-secret-관리)
- **PR 없이 `develop`에 직접 push** — GitHub이 막지는 않지만 팀 규칙입니다

---

**더 자세한 규칙** → [CONTRIBUTING.md](../CONTRIBUTING.md)
**무엇을 만드는가** → [PLANNING.md](PLANNING.md) · [FEATURES.md](FEATURES.md)
**API 계약** → [api.md](api.md)
