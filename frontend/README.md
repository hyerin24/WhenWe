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
npm run dev
```

## 담당 영역

이 폴더는 프론트엔드 담당자의 영역입니다.
`backend/`를 수정해야 하는 변경이라면 **먼저 백엔드 담당자와 이야기하고, PR에 리뷰어로 지정**해주세요.

API 응답 구조는 [../docs/api.md](../docs/api.md)가 기준입니다.
Mock 데이터를 만들 때도 이 문서의 필드명을 그대로 사용하세요.
