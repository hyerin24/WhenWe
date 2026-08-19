import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { refineSchedules } from '../services/scheduleRefiner.js';
import { importSchedules } from '../services/scheduleImporter.js';

const router = Router();

// POST /api/lms/schedules — F2 raw 일정 JSON을 받아 F3 정제 → F4 저장을 잇습니다.
// (docs/api.md 는 PR #17·#21 양쪽에서 아직 DRAFT/제안 단계라 이번 단계에서 수정하지 않았습니다.)
//
// 이 라우트는 orchestration 만 담당합니다 — refineSchedules() 와 importSchedules()
// 어느 쪽도 서로를 호출하지 않고, 이 라우트가 순서대로 이어줍니다.
router.post('/schedules', requireAuth, async (req, res) => {
  const body = req.body;

  // 최소 형태 검증만 합니다. 정제 세부 규칙은 refineSchedules, 저장 세부 규칙은
  // importSchedules 의 책임입니다.
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

  // 응답 계약 — 잠정. PR #17 제안({ savedCount, skippedCount })과 충돌 있음.
  // 결정 전까지 기존 importSchedules 의 결과를 그대로 노출합니다. 아래 보고 §5 참고.
  return res.status(200).json({ importedCount: result.importedCount });
});

export default router;
