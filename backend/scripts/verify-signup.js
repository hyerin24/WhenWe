// F4 DB/Auth 검증 — 실제 signUp() 1건으로
// auth.users → handle_new_user 트리거 → public.profiles 자동 생성 흐름을 확인합니다.
//
// - admin.createUser() 를 쓰지 않습니다. 실제 signUp() 경로만 검증합니다.
// - 비밀번호는 매 실행마다 무작위로 생성하고, 어디에도 출력하지 않습니다.
// - profiles 에 수동 INSERT 하지 않습니다. 트리거가 만든 행만 조회합니다.
//
// 실행: cd backend && node scripts/verify-signup.js

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { getUserClient, getAdminClient } from '../src/lib/supabase.js';

const TEST_USERNAME = 'whenwe_test_01';
const TEST_DISPLAY_NAME = 'WhenWe Test';
const TEST_EMAIL = `${TEST_USERNAME}@users.whenwe.local`;

function randomTestPassword() {
  return randomBytes(24).toString('base64url'); // 하드코딩 없음, 출력 없음
}

async function checkTableAccess(client, label) {
  const { error } = await client.from('profiles').select('id').limit(1);
  if (!error) return { ok: true };
  return { ok: false, code: error.code, message: error.message, label };
}

async function main() {
  console.log('=== 0. 사전 확인: profiles 테이블 접근 가능 여부 (Secret client) ===');
  const admin = getAdminClient();
  const pre = await checkTableAccess(admin, 'service_role');
  if (pre.ok) {
    console.log('OK   service_role 로 profiles 조회 가능');
  } else {
    console.log(`FAIL service_role 로 profiles 조회 불가 — code=${pre.code}`);
    console.log(`     message=${pre.message}`);
  }

  console.log('\n=== 1. signUp 시도 (Publishable client, 토큰 없음) ===');
  const anonClient = getUserClient();
  const password = randomTestPassword();

  const { data, error } = await anonClient.auth.signUp({
    email: TEST_EMAIL,
    password,
    options: { data: { username: TEST_USERNAME, display_name: TEST_DISPLAY_NAME } },
  });

  if (error) {
    console.log('FAIL signUp 오류');
    console.log(`     status=${error.status} name=${error.name}`);
    console.log(`     message=${error.message}`);
    process.exit(1);
  }

  const userId = data.user?.id ?? null;
  const session = data.session ?? null;

  console.log('OK   signUp 오류 없음');
  console.log(`     user.id 존재 : ${Boolean(userId)}`);
  console.log(`     user.id      : ${userId}`);
  console.log(`     session 생성 : ${Boolean(session)} (Confirm Email OFF 이면 즉시 발급이 정상)`);

  if (!userId) {
    console.log('\nuser.id 가 없어 이후 검증을 진행할 수 없습니다.');
    process.exit(1);
  }

  console.log('\n=== 2. profiles 자동 생성 확인 — (a) Secret client ===');
  const { data: profileAsAdmin, error: adminErr } = await admin
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (adminErr) {
    console.log('FAIL Secret client 로 profiles 조회 오류');
    console.log(`     code=${adminErr.code} message=${adminErr.message}`);
  } else if (!profileAsAdmin) {
    console.log('FAIL Secret client: profiles 행을 찾지 못함 (RLS 우회 클라이언트인데도 없음 → 트리거 미동작 가능성)');
  } else {
    console.log('OK   Secret client 로 profiles 행 확인');
    console.log(`     id 일치           : ${profileAsAdmin.id === userId}`);
    console.log(`     username          : ${profileAsAdmin.username} (일치: ${profileAsAdmin.username === TEST_USERNAME})`);
    console.log(`     display_name      : ${profileAsAdmin.display_name} (일치: ${profileAsAdmin.display_name === TEST_DISPLAY_NAME})`);
  }

  if (session?.access_token) {
    console.log('\n=== 3. profiles 자동 생성 확인 — (b) 본인 세션(Publishable + JWT, RLS 적용) ===');
    const selfClient = getUserClient(session.access_token);
    const { data: profileAsSelf, error: selfErr } = await selfClient
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (selfErr) {
      console.log('FAIL 본인 세션으로 profiles 조회 오류');
      console.log(`     code=${selfErr.code} message=${selfErr.message}`);
    } else if (!profileAsSelf) {
      console.log('FAIL 본인 세션: profiles 행을 찾지 못함 (RLS 정책 또는 트리거 문제)');
    } else {
      console.log('OK   본인 세션(RLS 적용)으로 profiles 행 확인');
      console.log(`     id 일치           : ${profileAsSelf.id === userId}`);
      console.log(`     username          : ${profileAsSelf.username} (일치: ${profileAsSelf.username === TEST_USERNAME})`);
      console.log(`     display_name      : ${profileAsSelf.display_name} (일치: ${profileAsSelf.display_name === TEST_DISPLAY_NAME})`);
    }
  } else {
    console.log('\n=== 3. 본인 세션 검증 생략 (session 없음) ===');
  }

  console.log(`\n테스트 계정 user.id = ${userId} 는 삭제하지 않았습니다.`);
}

main();
