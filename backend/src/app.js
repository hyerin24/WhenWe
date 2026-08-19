import express from 'express';
import cors from 'cors';
import teamsRouter from './routes/teams.js';
import schedulesRouter from './routes/schedules.js';
import lmsRouter from './routes/lms.js';

const app = express();

// CORS_ORIGIN 이 없으면 프론트 기본 개발 포트를 씁니다 (.env.example 참고).
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// 서버 상태 확인용. 서비스 기능 API가 아니므로 docs/api.md 계약 대상이 아닙니다.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/teams', teamsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/lms', lmsRouter);

// 404 — 위에서 처리되지 않은 모든 요청
app.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: '요청한 경로를 찾을 수 없습니다.' });
});

// 공통 에러 처리
// 주의: message 에 LMS 원문·개인 일정 제목·토큰을 넣지 않습니다 (docs/api.md).
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    code: err.code || 'INTERNAL_ERROR',
    message: err.expose ? err.message : '서버에서 오류가 발생했습니다.',
  });
});

export default app;
