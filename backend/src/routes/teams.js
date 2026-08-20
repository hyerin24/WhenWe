import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminClient } from '../lib/supabase.js';
import { generateInviteCode } from '../lib/inviteCode.js';

const router = Router();

const NAME_MAX_LENGTH = 50;
const INVITE_CODE_MAX_ATTEMPTS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 일정 import 검증(backend/src/routes/schedules.js)과 동일한 형식 — UTC Z 고정.
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isValidIsoUtc(value) {
  return typeof value === 'string' && ISO_UTC_RE.test(value) && !Number.isNaN(Date.parse(value));
}

// F5 와 합의한 공통 Team DTO. POST /api/teams · POST /api/teams/join ·
// GET /api/teams · GET /api/teams/:teamId 가 전부 이 모양으로 응답합니다.
function toTeamDto(team, memberCount) {
  return {
    id: team.id,
    name: team.name,
    inviteCode: team.invite_code,
    createdBy: team.created_by,
    createdAt: team.created_at,
    memberCount,
  };
}

// 팀 하나의 실제 memberCount — 저장된 값이 아니라 team_members 를 매번 COUNT 합니다.
async function countTeamMembers(admin, teamId) {
  const { count, error } = await admin
    .from('team_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if (error) throw error;
  return count ?? 0;
}

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
      // create_team_with_owner() 가 생성자 membership 까지 원자적으로 만들지만,
      // 상수 1을 가정하지 않고 실제 team_members COUNT 를 다시 확인합니다.
      let memberCount;
      try {
        memberCount = await countTeamMembers(admin, team.id);
      } catch (countError) {
        console.error('team_members count failed after create', countError);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 수를 조회하지 못했습니다.' });
      }
      return res.status(201).json(toTeamDto(team, memberCount));
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

  // F5 결정: 이 응답은 Team DTO로 통일하지 않습니다. 계약 불일치는 프론트에서 처리하기로 합의됨.
  return res.status(201).json({
    id: team.id,
    name: team.name,
    joinedAt: memberRow.joined_at,
  });
});

// GET /api/teams — 내가 속한 팀 목록 (docs/api.md 참고)
//
// team_members 를 req.user.id 로 먼저 좁혀 "내 팀 id 목록"을 확정한 뒤에만
// teams 를 조회합니다 — Secret 클라이언트를 쓰더라도 다른 사용자의 팀은
// 이 범위 밖이라 애초에 조회 대상에 들어오지 않습니다.
router.get('/', requireAuth, async (req, res) => {
  const admin = getAdminClient();

  const { data: memberships, error: membershipError } = await admin
    .from('team_members')
    .select('team_id')
    .eq('user_id', req.user.id);

  if (membershipError) {
    console.error('team_members lookup by user failed', membershipError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀 목록을 조회하지 못했습니다.' });
  }

  const teamIds = memberships.map((m) => m.team_id);

  if (teamIds.length === 0) {
    return res.status(200).json({ items: [] });
  }

  const { data: teams, error: teamsError } = await admin
    .from('teams')
    .select('id, name, invite_code, created_by, created_at')
    .in('id', teamIds);

  if (teamsError) {
    console.error('teams lookup by ids failed', teamsError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀 목록을 조회하지 못했습니다.' });
  }

  // 팀별 memberCount 를 한 번의 쿼리로 계산합니다 (N+1 COUNT 방지).
  const { data: allMemberRows, error: countError } = await admin
    .from('team_members')
    .select('team_id')
    .in('team_id', teamIds);

  if (countError) {
    console.error('team_members bulk count failed', countError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 수를 조회하지 못했습니다.' });
  }

  const memberCountByTeam = {};
  for (const row of allMemberRows) {
    memberCountByTeam[row.team_id] = (memberCountByTeam[row.team_id] ?? 0) + 1;
  }

  return res.status(200).json({
    items: teams.map((team) => toTeamDto(team, memberCountByTeam[team.id] ?? 0)),
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

  // ② 팀 기본 정보 — F5 와 합의한 공통 Team DTO 를 위해 invite_code 도 함께 읽습니다.
  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, name, invite_code, created_by, created_at')
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
  let memberCount;
  try {
    memberCount = await countTeamMembers(admin, teamId);
  } catch (countError) {
    console.error('team_members count failed', countError);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '팀원 수를 조회하지 못했습니다.' });
  }

  return res.status(200).json(toTeamDto(team, memberCount));
});

// GET /api/teams/:teamId/schedules — 팀 단위 일정 조회 (docs/api.md 참고)
//
// 요청자는 아직 이 팀의 다른 팀원 schedules 를 RLS 로는 절대 못 읽습니다
// (schedules 는 본인만 SELECT 가능). 그래서 Secret 클라이언트로 여러 사용자의
// 행을 모아 읽되, "요청자가 이 팀 소속인가"는 Secret 클라이언트를 쓰기 전에
// 이 코드가 먼저 검사합니다 — RLS 가 대신 해주지 않기 때문입니다.
router.get('/:teamId/schedules', requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const { from, to } = req.query;

  if (!UUID_RE.test(teamId)) {
    return res.status(400).json({ code: 'INVALID_TEAM_ID', message: '유효하지 않은 팀 id 형식입니다.' });
  }

  // from/to 는 하나의 기간 계약([from, to))이라 함께 오거나 함께 생략되어야 합니다.
  // 한쪽만 오면 F6/F7 이 의도한 기간을 알 수 없어 400 으로 거부합니다.
  const hasFrom = from !== undefined;
  const hasTo = to !== undefined;

  if (hasFrom !== hasTo) {
    return res.status(400).json({ code: 'INVALID_DATE_RANGE', message: '조회 기간이 올바르지 않습니다.' });
  }

  let range = null;
  if (hasFrom && hasTo) {
    if (!isValidIsoUtc(from) || !isValidIsoUtc(to)) {
      return res.status(400).json({ code: 'INVALID_DATE_RANGE', message: '조회 기간이 올바르지 않습니다.' });
    }
    // 문자열 비교 대신 실제 시각으로 비교합니다 — 초 이하 자릿수가 다르면
    // 문자열 길이가 달라져 사전식 비교가 틀릴 수 있습니다.
    if (!(Date.parse(from) < Date.parse(to))) {
      return res.status(400).json({ code: 'INVALID_DATE_RANGE', message: '조회 기간이 올바르지 않습니다.' });
    }
    range = { from, to };
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
  // title 은 여기서 아예 select 하지 않습니다 — 본인 것이든 남의 것이든
  // Heatmap/F7 계산·표시에 필요 없는 개인 정보는 응답 스키마에서 원천 제외합니다.
  // course_name 은 F7 최종 확인에 따라 포함합니다 (title 과 달리 계산/표시에 필요).
  let query = admin
    .from('schedules')
    .select('id, user_id, type, starts_at, ends_at, all_day, course_name, source')
    .in('user_id', userIds);

  if (range) {
    const { from: rangeFrom, to: rangeTo } = range;
    // [from, to) 구간과 [starts_at, ends_at] 구간의 겹침 — F6/F7 합의 규칙 그대로:
    //   ① 둘 다 있음   : starts_at < to  AND  ends_at >= from
    //   ② start만 NULL : ends_at 을 단일 시점으로 간주 — from <= ends_at < to
    //   ③ end만 NULL   : starts_at 을 단일 시점으로 간주 — from <= starts_at < to
    //   ④ 둘 다 NULL   : 제외 (아래 세 그룹 어디에도 해당하지 않아 자동으로 빠짐)
    query = query.or(
      [
        `and(starts_at.not.is.null,ends_at.not.is.null,starts_at.lt.${rangeTo},ends_at.gte.${rangeFrom})`,
        `and(starts_at.is.null,ends_at.not.is.null,ends_at.gte.${rangeFrom},ends_at.lt.${rangeTo})`,
        `and(starts_at.not.is.null,ends_at.is.null,starts_at.gte.${rangeFrom},starts_at.lt.${rangeTo})`,
      ].join(',')
    );
  }

  const { data: schedules, error: schedulesError } = await query;

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
      courseName: s.course_name,
      source: s.source,
    })),
  });
});

export default router;
