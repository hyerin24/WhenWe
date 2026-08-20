import { getUserClient } from '../lib/supabase.js';

// Authorization: Bearer <token> 을 Supabase Auth 로 검증합니다.
// 성공하면 req.user.id 에 auth.users.id 를 담아 다음 핸들러로 넘깁니다.
//
// 여기서 검증하는 것은 "누가 요청했는가" 뿐입니다.
// "그 사람이 이 자원에 접근할 자격이 있는가"는 각 라우트가 별도로 확인합니다.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' });
  }

  const client = getUserClient(token);
  const { data, error } = await client.auth.getUser();

  if (error || !data?.user) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '유효하지 않은 인증 정보입니다.' });
  }

  req.user = { id: data.user.id };
  req.accessToken = token;
  next();
}
