/**
 * WhenWe LMS 연동 — background service worker.
 *
 * 하는 일: WhenWe 탭(content-whenwe.js)의 시작 요청을 받아 LMS 탭을 찾거나 열고,
 * LMS 탭(content-lms.js)에 수집 시작을 알리고, 결과를 다시 WhenWe 탭으로 돌려준다.
 *
 * accessToken 은 진행 중인 작업(job) 동안만 이 파일의 변수에 담아 두고,
 * chrome.storage 에 쓰지 않는다. 작업이 끝나거나 실패하면 즉시 비운다.
 * console 에 accessToken·일정 제목을 출력하지 않는다.
 */

const LMS_ORIGIN_PATTERN = 'https://lms.kyonggi.ac.kr/*';
const LMS_CALENDAR_URL = 'https://lms.kyonggi.ac.kr/calendar/view.php?view=month&course=1';
const MAX_RETRIES = 8; // 로그인 전 페이지 이동마다 1회 재시도 — 무한 polling 방지용 상한
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

/** 현재 진행 중인 수집 작업. 동시에 하나만 지원한다 (MVP 범위). */
let job = null;

function clearJob() {
  job = null;
}

function notifyWhenWe(message) {
  if (!job || !job.whenweTabId) return;
  chrome.tabs.sendMessage(job.whenweTabId, message).catch(() => {
    // WhenWe 탭이 이미 닫혔으면 조용히 무시한다.
  });
}

async function findOrOpenLmsTab() {
  const tabs = await chrome.tabs.query({ url: LMS_ORIGIN_PATTERN });
  if (tabs.length > 0) return tabs[0];
  return chrome.tabs.create({ url: LMS_CALENDAR_URL, active: true });
}

async function sendCollectMessage() {
  if (!job) return;
  try {
    await chrome.tabs.sendMessage(job.tabId, {
      type: 'WHENWE_LMS_COLLECT',
      accessToken: job.accessToken,
      endpoint: job.endpoint,
    });
  } catch {
    // content script 가 아직 안 붙었을 수 있다 (탭 방금 열림) — onUpdated 'complete' 에서 재시도된다.
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return undefined;

  if (message.type === 'WHENWE_LMS_START') {
    (async () => {
      if (job) {
        notifyWhenWe({ type: 'WHENWE_LMS_STATUS', status: 'busy' });
        return;
      }
      const whenweTabId = sender.tab && sender.tab.id;
      const tab = await findOrOpenLmsTab();
      job = {
        tabId: tab.id,
        whenweTabId,
        accessToken: message.accessToken,
        endpoint: message.endpoint,
        attempts: 0,
        startedAt: Date.now(),
      };
      notifyWhenWe({ type: 'WHENWE_LMS_STATUS', status: 'awaiting-tab' });
      await chrome.tabs.update(tab.id, { active: true });
      // 탭이 이미 로드되어 있으면(재사용) 바로 시도하고, 새 탭이면 onUpdated 에서 첫 시도가 걸린다.
      if (tab.status === 'complete') void sendCollectMessage();
    })();
    return undefined;
  }

  if (message.type === 'WHENWE_LMS_LOGIN_REQUIRED') {
    notifyWhenWe({ type: 'WHENWE_LMS_STATUS', status: 'awaiting-login' });
    return undefined;
  }

  if (message.type === 'WHENWE_LMS_RESULT') {
    notifyWhenWe({
      type: 'WHENWE_LMS_STATUS',
      status: message.ok ? 'success' : 'error',
      importedCount: message.importedCount,
      code: message.code,
      message: message.message,
    });
    clearJob();
    return undefined;
  }

  return undefined;
});

// 로그인 전이면 실패로 끝내지 않고, 사용자가 로그인 후 페이지가 다시 로드될 때(탭 navigation)
// 자동으로 재시도한다. setInterval 같은 polling은 쓰지 않는다.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!job || tabId !== job.tabId || changeInfo.status !== 'complete') return;

  if (Date.now() - job.startedAt > JOB_TIMEOUT_MS) {
    notifyWhenWe({ type: 'WHENWE_LMS_STATUS', status: 'error', code: 'TIMEOUT', message: '시간이 초과되었습니다. 다시 시도해주세요.' });
    clearJob();
    return;
  }
  if (job.attempts >= MAX_RETRIES) {
    notifyWhenWe({ type: 'WHENWE_LMS_STATUS', status: 'error', code: 'RETRY_LIMIT', message: '로그인을 확인하지 못했습니다. 다시 시도해주세요.' });
    clearJob();
    return;
  }

  job.attempts += 1;
  void sendCollectMessage();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (job && tabId === job.tabId) {
    notifyWhenWe({ type: 'WHENWE_LMS_STATUS', status: 'error', code: 'TAB_CLOSED', message: 'LMS 탭이 닫혔습니다.' });
    clearJob();
  }
});
