import { Router } from 'express';
import { getUserClient } from '../lib/supabase.js';

const router = Router();

// 기존 handle_new_user 트리거·profiles.username CHECK 제약과 함께 만들어진
// 내부 전용 이메일 변환 규칙을 그대로 재사용합니다 (backend/scripts/verify-signup.js 참고).
// 화면에 노출되지 않고 실제로 메일이 발송되지도 않습니다.
const EMAIL_DOMAIN = 'users.whenwe.local';

// DB 의 profiles_username_format CHECK 제약과 반드시 같은 규칙이어야 합니다.
// (frontend/src/api/auth.ts 의 LOGIN_ID_RULE 은 이보다 느슨합니다 — 아래 보고 참고)
const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;
const MIN_PASSWORD_LENGTH = 6;

function toInternalEmail(username) {
  return `${username}@${EMAIL_DOMAIN}`;
}

function normalizeUsername(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

// POST /api/auth/signup — 프론트 계약 (docs/api.md 에는 아직 없음, 합의 대기).
router.post('/signup', async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      code: 'INVALID_LOGIN_ID',
      message: '아이디는 영문 소문자로 시작하는 소문자·숫자·밑줄(_) 3~20자여야 합니다.',
    });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      code: 'INVALID_LOGIN_ID',
      message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    });
  }

  const anon = getUserClient();
  const { data, error } = await anon.auth.signUp({
    email: toInternalEmail(username),
    password,
    options: { data: { username } },
  });

  if (error) {
    // 실제 에러 메시지·아이디를 로그에 남기지 않습니다 — 상태 코드/이름만 남깁니다.
    console.error('auth signup failed', { status: error.status, name: error.name });

    if (/already registered/i.test(error.message ?? '')) {
      return res.status(409).json({ code: 'USERNAME_TAKEN', message: '이미 사용 중인 아이디입니다.' });
    }
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '회원가입에 실패했습니다.' });
  }

  if (!data.user) {
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: '회원가입에 실패했습니다.' });
  }

  // Confirm Email OFF 이므로 가입과 동시에 세션이 발급됩니다.
  if (!data.session) {
    return res.status(200).json(null);
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    user: { userId: data.user.id, username },
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ code: 'INVALID_LOGIN_ID', message: '아이디와 비밀번호를 입력하세요.' });
  }

  const anon = getUserClient();
  const { data, error } = await anon.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });

  if (error || !data.session) {
    // 아이디가 없는 것인지 비밀번호가 틀린 것인지 구분해서 알리지 않습니다 (계정 존재 여부 노출 방지).
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    user: { userId: data.user.id, username },
  });
});

// POST /api/auth/logout — 클라이언트가 실패해도 로컬 세션을 지우므로 최소 동작만 합니다.
// refresh token 저장/갱신 구조를 쓰지 않으므로, 여기서 더 복잡한 세션 무효화를 만들지 않습니다.
router.post('/logout', async (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      await getUserClient(token).auth.signOut();
    } catch {
      // 서버 쪽 무효화가 실패해도 클라이언트 로그아웃을 막지 않습니다.
    }
  }

  return res.status(200).json({});
});

export default router;
