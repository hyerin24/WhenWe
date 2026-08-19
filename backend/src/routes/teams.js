import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminClient } from '../lib/supabase.js';
import { generateInviteCode } from '../lib/inviteCode.js';

const router = Router();

const NAME_MAX_LENGTH = 50;
const INVITE_CODE_MAX_ATTEMPTS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/teams — 팀 생성 (docs/api.md 참고)
//
// teams INSERT + team_members INSERT 를 create_team_with_owner() 하나로 묶어
// 원자적으로 처리합니다. 이 함수는 service_role 전용이라 getAdminClient() 를 씁니다.
router.post('/', requireAuth, async (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
  const name = rawName.trim();

  if (!name) {
    return res.status(400).json({ code: 'INVALID_NAME', message: '팀 이름을 입력하세요.' });
  }
  if (name.length > NAME_MAX_LENGTH) {
    return res.status(400).json({
      code: 'INVALID_NAME',
      message: `팀 이름은 ${NAME_MAX_LENGTH}자 이내로 입력하세요.`,
    });
  }

  const admin = getAdminClient();
  let lastError = null;

  for (let attempt = 0; attempt < INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    const inviteCode = generateInviteCode();

    const { data, error } = await admin.rpc('create_team_with_owner', {
      _name: name,
      _invite_code: inviteCode,
      // creator_id 는 요청 body 가 아니라 검증된 토큰의 user.id 만 사용합니다.
      _creator_id: req.user.id,
    });

    if (!error) {
      const team = Array.isArray(data) ? data[0] : data;
      return res.status(201).json({
        id: team.id,
        name: team.name,
        inviteCode: team.invite_code,
        createdBy: team.created_by,
        createdAt: team.created_at,
      });
    }

    lastError = error;
    // invite_code UNIQUE 충돌(23505)만 재시도합니다. 그 외 오류는 즉시 중단합니다.
    if (error.code !== '23505') break;
  }

  console.error('create_team_with_owner failed', lastError);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀을 생성하지 못했습니다.' });
});

const INVITE_CODE_LENGTH = 8;

// POST /api/teams/join — 초대 코드로 팀 참가 (docs/api.md 참고)
//
// 참가 전 사용자는 그 팀의 멤버가 아니므로 teams RLS SELECT 가 막혀 있습니다.
// 그래서 Secret 클라이언트로 조회·INSERT 하고, "그 팀이 실제로 있는가" ·
// "이미 참가했는가"는 RLS 가 아니라 이 코드가 직접 검사합니다.
router.post('/join', requireAuth, async (req, res) => {
  const rawCode = typeof req.body?.inviteCode === 'string' ? req.body.inviteCode : '';
  const inviteCode = rawCode.trim().toUpperCase();

  if (!inviteCode || inviteCode.length !== INVITE_CODE_LENGTH) {
    return res.status(400).json({ code: 'INVALID_INVITE_CODE', message: '유효하지 않은 초대 코드 형식입니다.' });
  }

  const admin = getAdminClient();

  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, name')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (teamError) {
    console.error('teams lookup by invite_code failed', teamError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀을 조회하지 못했습니다.' });
  }

  if (!team) {
    return res.status(404).json({ code: 'TEAM_NOT_FOUND', message: '유효하지 않은 초대 코드입니다.' });
  }

  // 사전 확인 — 대부분의 경우 여기서 중복 참가를 걸러 409를 명확히 응답합니다.
  const { data: existingMember, error: existingError } = await admin
    .from('team_members')
    .select('team_id')
    .eq('team_id', team.id)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (existingError) {
    console.error('team_members lookup failed', existingError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '참가 여부를 확인하지 못했습니다.' });
  }

  if (existingMember) {
    return res.status(409).json({ code: 'ALREADY_TEAM_MEMBER', message: '이미 참가한 팀입니다.' });
  }

  const { data: memberRow, error: insertError } = await admin
    .from('team_members')
    .insert({ team_id: team.id, user_id: req.user.id })
    .select('joined_at')
    .single();

  if (insertError) {
    // 최종 방어선 — 사전 확인과 INSERT 사이에 동시 요청이 끼어든 경우,
    // PRIMARY KEY(team_id, user_id) 위반(23505)을 409 로 변환합니다.
    if (insertError.code === '23505') {
      return res.status(409).json({ code: 'ALREADY_TEAM_MEMBER', message: '이미 참가한 팀입니다.' });
    }
    console.error('team_members insert failed', insertError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀 참가에 실패했습니다.' });
  }

  return res.status(201).json({
    id: team.id,
    name: team.name,
    joinedAt: memberRow.joined_at,
  });
});

// GET /api/teams/:teamId — 팀 기본 정보 조회 (docs/api.md 참고)
//
// memberCount 는 저장된 값을 읽는 게 아니라 매 요청마다 team_members 를
// COUNT 합니다. Source of Truth 는 team_members 행 자체이고, 프론트가
// 보내는 값은 쓰지 않습니다.
router.get('/:teamId', requireAuth, async (req, res) => {
  const { teamId } = req.params;

  if (!UUID_RE.test(teamId)) {
    return res.status(400).json({ code: 'INVALID_TEAM_ID', message: '유효하지 않은 팀 ID입니다.' });
  }

  const admin = getAdminClient();

  // ① 소속 확인 — Secret 클라이언트로 팀 정보를 읽기 전 반드시 선행합니다.
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
    // 팀이 아예 없는 경우와 소속이 아닌 경우를 구분해서 알려주지 않습니다.
    return res.status(403).json({ code: 'FORBIDDEN', message: '접근할 수 없는 팀입니다.' });
  }

  // ② 팀 기본 정보
  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, name, created_by, created_at')
    .eq('id', teamId)
    .maybeSingle();

  if (teamError) {
    console.error('teams lookup failed', teamError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀 정보를 조회하지 못했습니다.' });
  }

  if (!team) {
    // membership 이 있는데 teams 행이 없는 상황은 FK CASCADE 구조상 일어나지 않지만,
    // 혹시 발생해도 존재 여부를 노출하지 않고 동일하게 403 으로 응답합니다.
    return res.status(403).json({ code: 'FORBIDDEN', message: '접근할 수 없는 팀입니다.' });
  }

  // ③ memberCount — team_members 실제 행 개수를 매번 계산합니다.
  const { count, error: countError } = await admin
    .from('team_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if (countError) {
    console.error('team_members count failed', countError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 수를 조회하지 못했습니다.' });
  }

  return res.status(200).json({
    id: team.id,
    name: team.name,
    memberCount: count ?? 0,
    createdBy: team.created_by,
    createdAt: team.created_at,
  });
});

// GET /api/teams/:teamId/schedules — 팀 단위 일정 조회 (docs/api.md 참고)
//
// 요청자는 아직 이 팀의 다른 팀원 schedules 를 RLS 로는 절대 못 읽습니다
// (schedules 는 본인만 SELECT 가능). 그래서 Secret 클라이언트로 여러 사용자의
// 행을 모아 읽되, "요청자가 이 팀 소속인가"는 Secret 클라이언트를 쓰기 전에
// 이 코드가 먼저 검사합니다 — RLS 가 대신 해주지 않기 때문입니다.
router.get('/:teamId/schedules', requireAuth, async (req, res) => {
  const { teamId } = req.params;

  if (!UUID_RE.test(teamId)) {
    return res.status(400).json({ code: 'INVALID_TEAM_ID', message: '유효하지 않은 팀 id 형식입니다.' });
  }

  const admin = getAdminClient();

  // ① 소속 확인 — Secret 클라이언트로 팀원 일정을 모으기 전 반드시 선행합니다.
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
    // 팀이 아예 없는 경우와 소속이 아닌 경우를 구분해서 알려주지 않습니다.
    return res.status(403).json({ code: 'FORBIDDEN', message: '접근할 수 없는 팀입니다.' });
  }

  // ② 팀원 user_id 목록
  const { data: members, error: membersError } = await admin
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (membersError) {
    console.error('team_members list failed', membersError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 목록을 조회하지 못했습니다.' });
  }

  const userIds = members.map((m) => m.user_id);

  // ③ 그 팀원들의 schedules.
  // title · courseName 은 여기서 아예 select 하지 않습니다 — 본인 것이든 남의 것이든
  // Heatmap/F7 계산에 필요 없는 개인 정보는 응답 스키마에서 원천 제외합니다.
  const { data: schedules, error: schedulesError } = await admin
    .from('schedules')
    .select('id, user_id, type, starts_at, ends_at, all_day, source')
    .in('user_id', userIds);

  if (schedulesError) {
    console.error('schedules lookup failed', schedulesError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '일정을 조회하지 못했습니다.' });
  }

  return res.status(200).json({
    items: schedules.map((s) => ({
      userId: s.user_id,
      scheduleId: s.id,
      type: s.type,
      startAt: s.starts_at,
      endAt: s.ends_at,
      allDay: s.all_day,
      source: s.source,
    })),
  });
});

export default router;
