import { createClient } from '@supabase/supabase-js';

// 실제 키는 backend/.env 에만 있습니다. 이 파일에 값을 적지 마세요.
// 환경변수 이름은 backend/.env.example 을 따릅니다.
//
// ─────────────────────────────────────────────────────────────
// 클라이언트가 두 종류인 이유
//
//   A. userClient   Publishable key + 사용자 JWT  → RLS 적용받음   ← 기본
//   B. adminClient  Secret key                    → RLS 우회       ← 예외
//
// F4 완료 조건에 "다른 팀의 데이터에 접근하면 403" 이 있습니다.
// 모든 요청을 adminClient 로 처리하면 RLS 가 통째로 무력화되어
// 이 조건을 만족할 수 없습니다. **사용자 요청은 A 를 씁니다.**
// ─────────────────────────────────────────────────────────────

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    // 값은 절대 로그에 남기지 않고, 어떤 키가 비었는지만 알립니다.
    throw new Error(`환경변수 ${name} 가 없습니다. backend/.env 를 확인하세요 (.env.example 참고).`);
  }
  return value;
}

/**
 * A. 사용자 권한 클라이언트 — 이걸 기본으로 씁니다.
 *
 * Publishable key 로 만들고, 요청자의 액세스 토큰을 그대로 실어 보냅니다.
 * Postgres 는 이 토큰의 주체를 기준으로 RLS 를 적용합니다.
 *
 * @param {string} accessToken  Authorization: Bearer <token> 에서 꺼낸 값
 */
export function getUserClient(accessToken) {
  const url = requireEnv('SUPABASE_URL');
  const publishableKey = requireEnv('SUPABASE_PUBLISHABLE_KEY');

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

let adminClient = null;

/**
 * B. 서버 전용 클라이언트 — **RLS 를 우회합니다.**
 *
 * 사용자 요청을 처리하는 경로에서 기본으로 쓰지 마세요.
 * 쓸 때는 그 코드에서 권한 확인을 직접 해야 합니다.
 * 이 클라이언트로 얻은 데이터를 검증 없이 그대로 응답하지 않습니다.
 */
export function getAdminClient() {
  if (adminClient) return adminClient;

  const url = requireEnv('SUPABASE_URL');
  const secretKey = requireEnv('SUPABASE_SECRET_KEY');

  adminClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

/** 환경변수가 채워져 있는지만 확인합니다. 값은 반환하지 않습니다. */
export function getSupabaseConfigStatus() {
  return {
    url: Boolean(process.env.SUPABASE_URL),
    publishableKey: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
    secretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
  };
}
