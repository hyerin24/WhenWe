/**
 * ★ API 레이어의 유일한 진입점.
 *
 * 규칙 1 — 컴포넌트는 이 폴더를 직접 import 하지 않습니다. src/hooks/ 의 훅만 씁니다.
 * 규칙 2 — 이 파일 말고는 아무도 src/api/mock/ 을 import 하지 않습니다.
 *
 * 덕분에 나중에 Mock 전략을 무엇으로 정하든(env 스위치 / MSW / 직접 import)
 * 바뀌는 곳은 이 파일 안뿐입니다. 훅과 컴포넌트는 그대로입니다.
 *
 * MSW 로 가게 되면: mock/ 이 src/mocks/handlers.ts 로 옮겨가고 아래 분기가 사라집니다.
 */
import { authApi as realAuthApi } from './auth'
import { teamsApi as realTeamsApi } from './teams'
import { mockAuthApi, MOCK_ACCOUNTS } from './mock/auth.mock'
import { mockTeamsApi, MOCK_JOINABLE_CODES } from './mock/teams.mock'

/**
 * 기본값은 mock 입니다. .env 가 없어도 clone 직후 바로 화면이 떠야 하기 때문입니다.
 * 실제 서버에 붙이려면 .env 에 VITE_USE_MOCK=false 를 넣습니다.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const auth = USE_MOCK ? mockAuthApi : realAuthApi
export const teams = USE_MOCK ? mockTeamsApi : realTeamsApi

export { ApiError, setAccessToken } from './client'
export { MIN_PASSWORD_LENGTH, LOGIN_ID_RULE, validateLoginId } from './auth'
export { INVITE_CODE_LENGTH } from './teams'

/**
 * mock 모드에서만 화면에 안내할 테스트 계정·초대 코드.
 * 컴포넌트가 mock/ 을 직접 import 하지 않도록(규칙 2) 여기서만 노출합니다.
 * 실제 API 모드에서는 null 이므로 화면에서 안내가 사라집니다.
 */
export const mockHints = USE_MOCK
  ? { accounts: MOCK_ACCOUNTS, joinableCodes: MOCK_JOINABLE_CODES }
  : null
