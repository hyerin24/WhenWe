import { randomInt } from 'node:crypto';

// 대문자 + 숫자, 혼동되기 쉬운 문자(I, O, 0, 1, L) 제외.
// 32문자 중 8자리 조합 ≈ 10억 가지 — 7명 프로젝트에서 추측 위험은 무시할 수준입니다.
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

export function generateInviteCode() {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += CHARSET[randomInt(CHARSET.length)];
  }
  return code;
}
