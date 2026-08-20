import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { refineSchedules } from '../services/scheduleRefiner.js';
import { importSchedules } from '../services/scheduleImporter.js';

const router = Router();

// POST /api/lms/schedules — F2 raw 일정 JSON을 받아 F3 정제 → F4 저장을 잇습니다.
// (docs/api.md — F2·F3·F4 확인 완료, 합의완료)
//
// 이 라우트는 orchestration 만 담당합니다 — refineSchedules() 와 importSchedules()
// 어느 쪽도 서로를 호출하지 않고, 이 라우트가 순서대로 이어줍니다.
router.post('/schedules', requireAuth, async (req, res) => {
  const body = req.body;

  // 최소 형태 검증만 합니다 — body가 object, items가 배열인지만 확인합니다.
  // payloadVersion·collectedAt·parseFailedCount·parseFailures 는 F2가 함께 보내지만
  // 이번 MVP에서는 검증 대상도 저장 대상도 아닙니다. refineSchedules() 가 items 외의
  // 필드를 읽지 않으므로, 이 필드들이 있어도/없어도 요청은 동일하게 처리됩니다.
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.items)) {
    return res.status(400).json({ code: 'INVALID_PAYLOAD', message: '요청 형식이 올바르지 않습니다.' });
  }

  let refinedItems;
  try {
    refinedItems = refineSchedules(body);
  } catch (refineError) {
    // 개인 일정 원문을 로그에 남기지 않습니다 — 에러 이름만 남깁니다.
    console.error('refineSchedules failed', { name: refineError?.name });
    return res.status(400).json({ code: 'INVALID_PAYLOAD', message: '일정 데이터를 정제하지 못했습니다.' });
  }

  // userId 는 body 에서 받지 않습니다 — 인증된 토큰의 사용자만 사용합니다.
  const result = await importSchedules({
    userId: req.user.id,
    accessToken: req.accessToken,
    items: refinedItems,
  });

  if (!result.ok) {
    const status = result.code === 'INVALID_SCHEDULES' ? 400 : 500;
    return res.status(status).json({ code: result.code, message: result.message });
  }

  // 응답 계약 확정 (F2·F3·F4 합의) — { importedCount } 만 사용, savedCount/skippedCount 는 채택하지 않음.
  return res.status(200).json({ importedCount: result.importedCount });
});

export default router;
