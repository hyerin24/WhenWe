# backend

WhenWe 백엔드 API입니다. LMS 일정 수집·정제, 팀/일정 데이터 관리, 부담도 계산을 담당합니다.

## 환경변수

```bash
cp .env.example .env
```

실제 값은 팀 내부에서 별도로 공유합니다. **`.env`는 커밋되지 않습니다.**

## 실행 방법

```bash
cd backend
npm install
npm run dev        # nodemon — 파일을 고치면 자동 재시작
```

```bash
npm start          # 재시작 없이 한 번만 실행
```

서버가 뜨면 상태를 확인합니다. **서버 상태 확인용이고, 서비스 API가 아닙니다.**

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

포트는 `PORT`, 허용 Origin은 `CORS_ORIGIN` 환경변수를 따릅니다 (기본값 `3000` · `http://localhost:5173`).
**Supabase 키가 없어도 서버는 뜹니다.** 키는 실제로 Supabase에 접근하는 시점에 필요합니다.

## Supabase 연결 확인

`.env`의 Supabase 값을 채운 뒤, 연결만 확인합니다. **테이블·row를 조회하지 않으므로 테이블이 없어도 됩니다.**

```bash
npm run check:supabase
```

값 존재 여부 → Publishable/Secret 키로 프로젝트에 닿는지 → Auth 설정(공개 정보)을 순서대로 확인합니다.
**키 값은 어디에도 출력되지 않습니다.**

### Supabase 클라이언트 두 종류

`src/lib/supabase.js`가 목적에 따라 두 가지를 제공합니다. **섞어 쓰면 권한 검사가 무너집니다.**

| 함수 | 키 | RLS | 언제 |
|---|---|---|---|
| `getUserClient(accessToken)` | Publishable | **적용받음** | **사용자 요청 처리 — 기본값** |
| `getAdminClient()` | Secret | **우회함** | 서버 내부 작업에서만. 쓰는 쪽이 권한 확인 직접 |

> ⚠️ **모든 요청을 `getAdminClient()`로 처리하면 안 됩니다.** Secret 키는 RLS를 우회하므로
> "다른 팀의 데이터에 접근하면 403"([FEATURES](../docs/FEATURES.md) `F4` 완료 조건)을 만족할 수 없습니다.

## 담당 영역

이 폴더는 **여러 명이 함께 쓰는 영역**입니다 — 역할 3·4·7 ([PLANNING §9](../docs/PLANNING.md#9-역할-7명)).
같은 폴더 안이라도 **다른 담당자의 파일**을 고쳐야 하면 먼저 그 담당자에게 알리세요.
`frontend/`를 수정해야 하는 변경이라면 **먼저 프론트엔드 담당자와 이야기하고, PR 링크를 단톡에 공유**해주세요.
(GitHub Reviewer 지정은 필수가 아닙니다 — [CONTRIBUTING §7](../CONTRIBUTING.md#7-리뷰--머지))

## API 계약

응답 필드명·구조를 바꿀 때는 **[../docs/api.md](../docs/api.md)를 먼저 수정하고**,
PR에서 프론트엔드 담당자의 확인을 받으세요. 문서 없이 응답을 바꾸면 프론트엔드가 조용히 깨집니다.

## 지켜야 할 보안 원칙

- **학교 ID/PW를 받아 저장하거나, 사용자를 대신해 LMS에 로그인하지 않는다.**
- 서버 전용 키(`SUPABASE_SECRET_KEY` — 예전 이름 `SUPABASE_SERVICE_ROLE_KEY`)는 **응답으로 절대 내려보내지 않는다.**
  CLAUDE.md · CONTRIBUTING.md의 `SUPABASE_SERVICE_ROLE_KEY` 금지 규칙이 **이 키에 그대로 적용됩니다.**
- 에러 `message`에 **LMS 원문 HTML 조각이나 개인 일정 제목**을 넣지 않는다. 위치·건수만 알린다.
- **iCal 구독 URL 방식은 현재 MVP가 아닙니다** ([PLANNING §13](../docs/PLANNING.md#13-미확정-사항) — 대안으로 검토만 된 상태).
  채택하는 경우에만, URL 자체가 인증 토큰이므로 공용 `.env`가 아니라 사용자별 DB 레코드에 저장한다.
