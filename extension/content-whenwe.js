/**
 * WhenWe LMS 연동 — WhenWe 탭(when-we.vercel.app) content script.
 *
 * TeamsPage 는 이 확장프로그램의 ID를 모른다(설치 방식마다 달라짐). 그래서 페이지는
 * window.postMessage 로만 말을 걸고, 이 content script 가 chrome.runtime API 로 옮겨준다.
 *
 * accessToken 은 그대로 background 로 전달만 하고 여기서 저장·로그하지 않는다.
 */

// 페이지가 "확장프로그램이 설치되어 있다"를 확인할 수 있는 표식.
window.__WHENWE_LMS_EXTENSION__ = true;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'whenwe-app' || data.type !== 'WHENWE_LMS_START') return;

  chrome.runtime.sendMessage({
    type: 'WHENWE_LMS_START',
    accessToken: data.accessToken,
    endpoint: data.endpoint,
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'WHENWE_LMS_STATUS') return;
  window.postMessage({ source: 'whenwe-extension', type: 'WHENWE_LMS_STATUS', ...message }, window.location.origin);
});
