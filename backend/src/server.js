// .env 를 가장 먼저 읽습니다. app.js 가 process.env 를 참조하므로 순서가 중요합니다.
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`WhenWe backend listening on http://localhost:${PORT}`);
  console.log(`health check: http://localhost:${PORT}/health`);
});
