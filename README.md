# WhenWe

팀원들의 학교 일정을 모아 **언제 다 같이 시간이 되는지** 찾아주는 서비스입니다.
LMS 일정을 자동으로 수집해, 팀 전체의 가능 시간을 Heatmap으로 보여주고 각자의 부담도를 함께 고려합니다.

> 7명 / 약 2일 일정의 팀 프로젝트입니다.

## 주요 기능 (계획)

| 기능 | 설명 |
|---|---|
| LMS 일정 수집 | 사용자 본인의 브라우저에서 로그인된 LMS Calendar HTML을 가져와 파싱 |
| 데이터 정제 | 수집한 일정을 공통 스키마로 정규화 |
| 팀 기능 | 팀 생성 · 참여 · 팀원별 일정 취합 |
| Heatmap | 팀 전체의 가능 시간대 시각화 |
| 부담도 알고리즘 | 과제·시험 밀집도를 반영한 개인별 부담도 산출 |

## 수집 경로

```text
브라우저  LMS Calendar fetch → 파싱 → 일정 JSON  ──API──▸  서버  정제 → 저장 → 조회
```

**fetch와 파싱은 사용자 브라우저에서** 실행합니다. 이미 로그인된 본인의 LMS 세션을 그대로 쓰고,
**서버가 대신 로그인하거나 학교 ID/PW를 저장하지 않습니다.** 정제부터는 서버가 처리합니다.

> 자세한 원칙은 [CONTRIBUTING.md](CONTRIBUTING.md#9-secret-관리), 확정된 구조는 [docs/PLANNING.md](docs/PLANNING.md)를 참고하세요.

## 폴더 구조

```text
WhenWe/
├── frontend/        # 프론트엔드 (담당자 영역)
├── backend/         # 백엔드 API (담당자 영역)
├── docs/
│   ├── PLANNING.md    # 기획 · 7명 역할 · 2일 일정 · 미확정 사항
│   ├── FEATURES.md    # 기능 F1~F7 · 완료 조건 ★ GitHub Issue의 원본
│   ├── api.md         # FE/BE API 계약서 ★ 필드 변경 시 여기부터 고친다
│   └── ONBOARDING.md  # 처음 오신 분께 — clone부터 merge까지
├── .github/         # Issue · PR 템플릿
├── .claude/skills/  # Claude Code 협업 스킬 (/new-branch, /commit-pr)
└── CONTRIBUTING.md  # 협업 규칙 (브랜치 · 커밋 · PR · Secret)
```

## 시작하기

```bash
git clone https://github.com/hyerin24/WhenWe.git
cd WhenWe

# 환경변수 파일 준비 (실제 값은 팀 내부에서 별도로 공유)
cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
```

> ⚠️ **`npm install`은 아직 동작하지 않습니다.** `package.json`이 아직 커밋되지 않았습니다.
> 프로젝트 초기 세팅이 `develop`에 올라온 뒤부터 [frontend/README.md](frontend/README.md) · [backend/README.md](backend/README.md)의 실행 방법이 동작합니다.

## 문서

**Git이 처음이라면 [docs/ONBOARDING.md](docs/ONBOARDING.md) 부터 보세요.** clone부터 merge까지 명령을 그대로 복사해 쓸 수 있습니다.

| 찾는 것 | 문서 |
|---|---|
| 처음 오신 분께 — clone → 작업 → PR → merge | [docs/ONBOARDING.md](docs/ONBOARDING.md) |
| 무엇을 만드는가 · 7명 역할 · 미확정 사항 | [docs/PLANNING.md](docs/PLANNING.md) |
| 기능 `F1`~`F7` · 완료 조건 — **Issue의 원본** | [docs/FEATURES.md](docs/FEATURES.md) |
| API 요청·응답 계약 | [docs/api.md](docs/api.md) |
| 브랜치 · 커밋 · PR · Secret 규칙 | [CONTRIBUTING.md](CONTRIBUTING.md) |

## 협업 규칙

**작업을 시작하기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를 먼저 읽어주세요.** 아래 내용이 모두 정리되어 있습니다.

- 새 작업은 어디서 시작하고, 어떤 브랜치를 어떤 이름으로 만드는가
- 커밋 메시지 · Issue · PR 작성 방법
- 누가 리뷰하고 어떤 방식으로 머지하는가
- `main` / `develop`의 역할, 긴급 수정 절차
- Secret(환경변수 · LMS 토큰) 관리 원칙
