/**
 * fetch 래퍼. axios 를 쓰지 않습니다 — 네이티브 fetch 로 충분합니다.
 *
 * 여기서만 하는 일 (api.md 확정 규칙):
 *   - baseURL 붙이기
 *   - Authorization: Bearer <token>
 *   - { items: [...] } 언랩
 *   - { code, message } 에러를 ApiError 로 변환
 *
 * 재시도·인터셉터·요청 큐는 넣지 않습니다. 필요해지면 그때 추가합니다.
 */
import type { ApiErrorBody, ListResponse } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
  }
}

let accessToken: string | null = null

/** 로그인/로그아웃 시 useAuth 가 호출합니다. */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const errorBody: ApiErrorBody =
      json && typeof json.code === 'string'
        ? json
        : { code: 'UNKNOWN', message: '요청을 처리하지 못했습니다.' }
    throw new ApiError(res.status, errorBody)
  }

  return json as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /**
   * 목록 응답의 { items: [...] } 를 벗겨 배열만 돌려줍니다.
   * 서버가 빈 본문이나 { items: null } 을 주더라도 반환 타입대로 항상 배열입니다.
   */
  async getList<T>(path: string): Promise<T[]> {
    const res = await request<ListResponse<T> | null>(path)
    return res?.items ?? []
  },
}
