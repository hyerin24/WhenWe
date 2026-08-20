import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { importSchedules } from '../services/scheduleImporter.js';

const router = Router();

// POST /api/schedules/import — F3 정제 결과를 본인 schedules 에 저장/갱신 (docs/api.md 참고)
//
// 이 라우트는 HTTP 요청/응답 처리만 담당합니다. validation·camelCase→snake_case
// 변환·UPSERT 는 services/scheduleImporter.js 에 있습니다 — F3 의 정제 모듈이
// 이 HTTP 엔드포인트를 거치지 않고 그 함수를 바로 호출할 수 있게 하기 위해서입니다.
router.post('/import', requireAuth, async (req, res) => {
  const result = await importSchedules({
    userId: req.user.id,
    accessToken: req.accessToken,
    items: req.body?.items,
  });

  if (!result.ok) {
    const status = result.code === 'INVALID_SCHEDULES' ? 400 : 500;
    return res.status(status).json({ code: result.code, message: result.message });
  }

  return res.status(200).json({ importedCount: result.importedCount });
});

export default router;
