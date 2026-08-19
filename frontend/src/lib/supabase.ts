/**
 * Supabase 클라이언트.
 *
 * ANON_KEY 만 사용합니다. SUPABASE_SERVICE_ROLE_KEY 는 프론트엔드 번들에 그대로
 * 박혀 누구나 볼 수 있으므로 절대 여기로 가져오지 않습니다. (CLAUDE.md · Secret)
 *
 * 키가 비어 있어도 앱이 죽지 않아야 합니다 — clone 직후 .env 없이 mock 모드로
 * 바로 실행할 수 있어야 하기 때문입니다. 그래서 createClient 를 조건부로 호출합니다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

/** 실제 API 모드에서 Supabase 가 필요한데 설정이 없으면 여기서 명확히 실패시킵니다. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase 설정이 없습니다. .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 채우거나 VITE_USE_MOCK=true 로 두세요.',
    )
  }
  return supabase
}
