/**
 * mock 모드에서 화면에 안내할 테스트 계정 · 초대 코드.
 *
 * 컴포넌트가 src/api/ 를 직접 import 하지 않도록(규칙 1) 훅 레이어를 거칩니다.
 * 실제 API 모드에서는 null 이라 화면에서 안내가 사라집니다.
 */
import { mockHints } from '@/api'

export function useMockHints() {
  return mockHints
}
