// Supabase 프로젝트에 "연결이 되는지"만 확인합니다.
//
// 테이블·row·사용자 목록을 조회하지 않습니다. 아직 테이블이 없어도 동작합니다.
// 확인하는 것은 네 가지뿐입니다.
//   1) .env 에 값이 채워져 있는가
//   2) Publishable key 로 프로젝트에 닿는가   → /auth/v1/settings
//   3) Secret key 로 프로젝트에 닿는가        → /rest/v1/
//   4) Auth 설정 (Email provider · Confirm Email)
//
// URL·키 값·키의 일부·키 길이는 어디에도 출력하지 않습니다.
//
// 실행: cd backend && npm run check:supabase

import 'dotenv/config';
import { getSupabaseConfigStatus } from '../src/lib/supabase.js';

const baseUrl = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');

/**
 * Publishable key 검증 + Auth 설정 확인 (한 번의 호출을 재사용).
 *
 * /rest/v1/ 루트는 쓰지 않습니다 — 최신 키 체계에서 그 경로는 secret 전용이라
 * 정상적인 publishable key 로도 401 이 나옵니다.
 * /auth/v1/settings 는 공개 설정만 담고 있어 개인정보가 없습니다.
 */
async function checkPublishableAndAuth() {
  try {
    const res = await fetch(`${baseUrl()}/auth/v1/settings`, {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY },
    });
    if (!res.ok) return { ok: false };

    const s = await res.json();
    return {
      ok: true,
      emailProvider: Boolean(s.external?.email),
      // mailer_autoconfirm = true 는 "메일 확인을 요구하지 않음" 을 뜻합니다.
      confirmEmail: !s.mailer_autoconfirm,
    };
  } catch {
    return { ok: false };
  }
}

/** Secret key 검증 — PostgREST 루트는 테이블이 0개여도 응답합니다. */
async function checkSecret() {
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/`, {
      headers: { apikey: process.env.SUPABASE_SECRET_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Supabase 연결 확인');

  const env = getSupabaseConfigStatus();
  if (!env.url || !env.publishableKey || !env.secretKey) {
    console.log(`- SUPABASE_URL: ${env.url ? 'OK' : '없음'}`);
    console.log(`- Publishable key: ${env.publishableKey ? 'OK' : '없음'}`);
    console.log(`- Secret key: ${env.secretKey ? 'OK' : '없음'}`);
    console.log('\nbackend/.env 의 빈 값을 채운 뒤 다시 실행하세요.');
    console.log('  cp .env.example .env  →  Supabase 대시보드 → Project Settings → API Keys');
    process.exit(1);
  }

  const pub = await checkPublishableAndAuth();
  const secretOk = await checkSecret();

  console.log(`- SUPABASE_URL: OK`);
  console.log(`- Publishable key: ${pub.ok ? 'OK' : 'FAIL'}`);
  console.log(`- Secret key: ${secretOk ? 'OK' : 'FAIL'}`);
  if (pub.ok) {
    console.log(`- Auth Email provider: ${pub.emailProvider ? 'ON' : 'OFF'}`);
    console.log(`- Confirm Email: ${pub.confirmEmail ? 'ON' : 'OFF'}`);
  }

  const allOk = pub.ok && secretOk;
  console.log(`\n결과: ${allOk ? '연결 성공' : '연결 실패 — FAIL 항목을 확인하세요'}`);
  process.exit(allOk ? 0 : 1);
}

main();
