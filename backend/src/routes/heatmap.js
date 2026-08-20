import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminClient } from '../lib/supabase.js';
import { computeHeatmap } from '../lib/availability.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_PER_PAGE = 7;

function kstDateToUtcIso(dateStr) {
  return new Date(`${dateStr}T00:00:00+09:00`).toISOString().replace('.000Z', 'Z');
}

function addDaysIso(iso, days) {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('.000Z', 'Z');
}

// GET /api/teams/:teamId/heatmap — 부담도·여유도 결과 조회 (docs/api.md 참고)
//
// GET /api/teams/:teamId/schedules(teams.js)와 같은 방식(소속 확인 → Secret 클라이언트로
// 팀원 일정 조회)을 그대로 따른다. teams.js 를 직접 건드리지 않고 이 파일 하나만 추가하기
// 위해 조회 로직을 그대로 복제했다 — 나중에 공통 함수로 뺄지는 F4 와 상의해서 정한다.
router.get('/:teamId/heatmap', requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const { from } = req.query;

  if (!UUID_RE.test(teamId)) {
    return res.status(400).json({ code: 'INVALID_TEAM_ID', message: '유효하지 않은 팀 id 형식입니다.' });
  }
  if (typeof from !== 'string' || !DATE_RE.test(from) || Number.isNaN(Date.parse(`${from}T00:00:00+09:00`))) {
    return res.status(400).json({ code: 'INVALID_DATE_RANGE', message: '조회 시작 날짜가 올바르지 않습니다.' });
  }

  const fromIso = kstDateToUtcIso(from);
  const toIso = addDaysIso(fromIso, DAYS_PER_PAGE);

  const admin = getAdminClient();

  const { data: membership, error: membershipError } = await admin
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (membershipError) {
    console.error('team_members membership check failed', membershipError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '접근 권한을 확인하지 못했습니다.' });
  }
  if (!membership) {
    return res.status(403).json({ code: 'FORBIDDEN', message: '접근할 수 없는 팀입니다.' });
  }

  const { data: memberRows, error: membersError } = await admin
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (membersError) {
    console.error('team_members list failed', membersError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 목록을 조회하지 못했습니다.' });
  }

  const userIds = memberRows.map((m) => m.user_id);

  // 이름은 auth.users 가 아니라 public.profiles 에 있다 (F4 확인).
  // profiles.id 가 auth.users.id 와 1:1이라 team_members.user_id 로 그대로 조회된다.
  // getUserById 를 인원수만큼 부르지 않고 한 번에 모아서 가져온다.
  const { data: profileRows, error: profilesError } = await admin
    .from('profiles')
    .select('id, display_name, username')
    .in('id', userIds);

  if (profilesError) {
    console.error('profiles lookup failed', profilesError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 이름을 조회하지 못했습니다.' });
  }

  // display_name 을 아직 안 정한 사용자는 username 으로 대신 보여준다 (F4 확인).
  const displayNameById = new Map(
    profileRows.map((p) => [p.id, p.display_name ?? p.username ?? null])
  );
  const members = userIds.map((userId) => ({
    userId,
    displayName: displayNameById.get(userId) ?? null,
  }));

  const { data: scheduleRows, error: schedulesError } = await admin
    .from('schedules')
    .select('user_id, type, starts_at, ends_at, all_day, course_name')
    .in('user_id', userIds)
    .or(
      [
        `and(starts_at.not.is.null,ends_at.not.is.null,starts_at.lt.${toIso},ends_at.gte.${fromIso})`,
        `and(starts_at.is.null,ends_at.not.is.null,ends_at.gte.${fromIso},ends_at.lt.${toIso})`,
        `and(starts_at.not.is.null,ends_at.is.null,starts_at.gte.${fromIso},starts_at.lt.${toIso})`,
      ].join(',')
    );

  if (schedulesError) {
    console.error('schedules lookup failed', schedulesError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '일정을 조회하지 못했습니다.' });
  }

  const schedules = scheduleRows.map((s) => ({
    userId: s.user_id,
    type: s.type,
    startAt: s.starts_at,
    endAt: s.ends_at,
    allDay: s.all_day,
    courseName: s.course_name,
  }));

  const { items, dueAssignments } = computeHeatmap({ schedules, members, from: fromIso, to: toIso });
  return res.status(200).json({ items, dueAssignments });
});

export default router;
