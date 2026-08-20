/**
 * WhenWe LMS 연동 — LMS 탭 content script.
 *
 * background 의 "수집 시작" 메시지를 받으면 F1 fetchLmsCalendarHtml() → F2
 * parseLmsCalendarHtml() → F2 sendLmsSchedules() 를 그대로 실행한다.
 * 이 파일은 새 파서를 만들지 않는다 — lib/lms-bundle.generated.js(F1·F2 원본)만 쓴다.
 *
 * 로그인 전이면(LmsAuthError/LmsSessionExpiredError) 실패로 보고하지 않고
 * "로그인 대기" 상태만 background 에 알린다 — background 가 로그인 후 재시도를 예약한다.
 *
 * 일정 제목·HTML 원문·accessToken 을 console 에 남기지 않는다.
 */

function currentKstYearMonth() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60 * 1000);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'WHENWE_LMS_COLLECT') return undefined;

  (async () => {
    const { accessToken, endpoint } = message;
    const { year, month } = currentKstYearMonth();

    let parsed;
    try {
      // 월(month) 뷰 MVP 범위를 유지한다 — 일(day) 뷰 수집으로 임의 확장하지 않는다.
      parsed = parseLmsCalendarHtml(await fetchLmsCalendarHtml({ year, month }));
    } catch (err) {
      if (err && (err.name === 'LmsAuthError' || err.name === 'LmsSessionExpiredError')) {
        chrome.runtime.sendMessage({ type: 'WHENWE_LMS_LOGIN_REQUIRED' });
      } else {
        chrome.runtime.sendMessage({
          type: 'WHENWE_LMS_RESULT',
          ok: false,
          code: (err && err.name) || 'LMS_FETCH_FAILED',
          message: 'LMS 캘린더를 읽지 못했습니다.',
        });
      }
      return;
    }

    try {
      const result = await sendLmsSchedules(parsed, { accessToken, endpoint });
      chrome.runtime.sendMessage({ type: 'WHENWE_LMS_RESULT', ok: true, importedCount: result.importedCount });
    } catch (err) {
      chrome.runtime.sendMessage({
        type: 'WHENWE_LMS_RESULT',
        ok: false,
        code: (err && err.code) || 'SEND_FAILED',
        message: (err && err.message) || '일정 전송에 실패했습니다.',
      });
    }
  })();

  sendResponse(undefined);
  return true;
});
