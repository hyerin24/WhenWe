# frontend

WhenWe 프론트엔드입니다. 팀 일정 Heatmap과 부담도 화면을 담당합니다.

## 환경변수

```bash
cp .env.example .env
```

실제 값은 팀 내부에서 별도로 공유합니다. **`.env`는 커밋되지 않습니다.**

> ⚠️ 프론트엔드 환경변수는 빌드 결과물에 그대로 박혀 **누구나 볼 수 있습니다.**
> 서버 전용 키(`SUPABASE_SERVICE_ROLE_KEY`)를 여기에 넣으면 안 됩니다.

## 실행 방법

```bash
npm install
npm run dev     # http://localhost:5173
```

**`.env` 없이도 그대로 뜹니다.** 기본이 Mock 모드라 백엔드도 Supabase 키도 필요 없습니다.
clone 직후 위 두 줄이면 화면이 나옵니다.

| 라우트 | 화면 | 담당 |
|---|---|---|
| `/login` | 로그인 | F5 |
| `/signup` | 회원가입 | F5 |
| `/teams` | 팀 목록 · 생성 · 초대 코드 참가 | F5 |
| `/heatmap` | Heatmap (아직 빈 화면) | F6 |

### Mock 테스트 계정 (비밀번호 `whenwe1234`)

**이메일·전화번호는 받지 않습니다. 아이디와 비밀번호만 씁니다.**

| 아이디 | 상태 |
|---|---|
| `demo` | 팀 2개 |
| `newbie` | 팀 없음 — 빈 목록 UI 확인용 |

비밀번호를 틀리면 로그인 실패 화면을 볼 수 있습니다.
회원가입은 아이디(영문 소문자·숫자·밑줄 4~20자) + 비밀번호만 받고, mock 에서는 가입 즉시 로그인됩니다
(가입한 계정은 새로고침하면 사라집니다).

> Supabase Auth 의 비밀번호 로그인은 이메일 또는 전화번호만 받습니다. 그래서 아이디를
> 내부 전용 이메일(`<아이디>@whenwe.local`)로 바꿔 넘깁니다. 화면에 보이지 않고 메일도 가지 않습니다.
> 이 매핑 방식은 잠정이라 `src/api/auth.ts` 의 `TODO(F4)` 로 표시해 뒀습니다.
초대 코드 참가는 `ZX99YQ` · `KR42MN` 으로 테스트합니다. (화면에도 안내됩니다)

### 실제 서버에 붙일 때

```bash
cp .env.example .env    # VITE_USE_MOCK=false 로 바꾸고 나머지 값을 채웁니다
```

### 배포할 때 (`npm run build`)

SPA 라 `/login` 같은 주소로 **직접 접속**하면 서버가 그 경로의 파일을 찾다가 404 를 냅니다.
호스팅 쪽에 "없는 경로는 전부 `index.html` 로" 규칙(history fallback)을 넣어야 합니다.
Vercel·Netlify 는 기본으로 해주고, Nginx 는 `try_files $uri /index.html;` 이 필요합니다.
`npm run preview` 는 이미 처리해주므로 빌드 확인용으로 씁니다.

## 구조

```text
src/
  api/      ← Mock 전략 이음매. 컴포넌트가 여기를 직접 import 하지 않습니다
    index.ts  ★ 유일한 진입점. mock/real 분기가 여기에만 있습니다
    mock/     이 폴더를 import 하는 곳은 api/index.ts 뿐입니다
  hooks/    ← 상태관리 이음매. 반환 shape 을 TanStack Query 와 맞춰 뒀습니다
  features/ 화면 단위 컴포넌트 (auth · teams = F5 / heatmap = F6)
  pages/    라우트에 붙는 페이지
  lib/      datetime(ISO 8601 UTC ↔ 로컬) · supabase
  types/    API 타입 (⚠️ api.md 확정 전까지 잠정)
```

**규칙 2개만 지키면 나중에 실제 API 로 바꿔도 컴포넌트가 안 바뀝니다.**

1. 컴포넌트는 `src/api/` 를 직접 import 하지 않고 `src/hooks/` 의 훅만 씁니다.
2. `src/api/mock/` 을 import 하는 파일은 `src/api/index.ts` 뿐입니다.

> ⚠️ `src/types/api.ts` · `src/api/teams.ts` 의 경로·필드명은 **잠정**입니다.
> [../docs/api.md](../docs/api.md) 의 엔드포인트가 아직 합의 대기라서 프론트가 임시로 정한 안입니다.
> 확정되면 `grep -rn "TODO(api.md)" src` 로 고칠 곳을 전부 찾을 수 있습니다.

## 담당 영역

이 폴더는 프론트엔드 담당자의 영역입니다.
`backend/`를 수정해야 하는 변경이라면 **먼저 백엔드 담당자와 이야기하고, PR에 리뷰어로 지정**해주세요.

API 응답 구조는 [../docs/api.md](../docs/api.md)가 기준입니다.
Mock 데이터를 만들 때도 이 문서의 필드명을 그대로 사용하세요.
