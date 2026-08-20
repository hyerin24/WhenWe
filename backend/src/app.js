import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import teamsRouter from './routes/teams.js';
import schedulesRouter from './routes/schedules.js';
import lmsRouter from './routes/lms.js';
import heatmapRouter from './routes/heatmap.js';

const app = express();

// CORS_ORIGIN 이 없으면 프론트 기본 개발 포트를 씁니다 (.env.example 참고).
// 콤마로 여러 origin 을 허용할 수 있습니다 — 배포 프론트(when-we.vercel.app)와
// LMS 탭(lms.kyonggi.ac.kr, 브라우저에서 F2 sendLmsSchedules 가 직접 POST 하는 origin)을
// 함께 허용해야 하는 경우가 여기 해당합니다. 목록에 없는 origin은 거부합니다 (`*` 금지).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // origin 이 없는 요청(서버 간 호출·curl 등)은 브라우저가 아니므로 그대로 통과시킵니다.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      const err = new Error('허용되지 않은 origin 입니다.');
      err.status = 403;
      err.code = 'CORS_NOT_ALLOWED';
      err.expose = true;
      callback(err);
    },
  }),
);
app.use(express.json());

// 서버 상태 확인용. 서비스 기능 API가 아니므로 docs/api.md 계약 대상이 아닙니다.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/teams', heatmapRouter);
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
