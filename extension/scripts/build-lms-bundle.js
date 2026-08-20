#!/usr/bin/env node
/**
 * frontend/src/lms/*.js (F1·F2 원본)를 그대로 읽어 content script용 번들로 합칩니다.
 *
 * 새 parser/fetcher를 복제하지 않습니다 — 원본 파일의 로직을 한 글자도 바꾸지 않고,
 * 브라우저 콘솔/content script 양쪽에서 동작하도록 `import`/`export` 문법만 벗겨냅니다
 * (frontend/src/lms/README.md의 "확인 방법" 콘솔 붙여넣기와 같은 방식).
 *
 * 사용법: node extension/scripts/build-lms-bundle.js
 * frontend/src/lms/*.js 가 바뀌면 다시 실행해서 extension/lib/lms-bundle.generated.js 를 갱신합니다.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', '..', 'frontend', 'src', 'lms');
const OUT_FILE = path.join(__dirname, '..', 'lib', 'lms-bundle.generated.js');

// content_scripts 배열이 같은 isolated world를 공유하므로, 이 순서대로 실행되면
// 뒤 파일이 앞 파일의 최상위 선언(class/function/const)을 그대로 참조할 수 있습니다.
// (frontend/src/lms/README.md "확인 방법"의 콘솔 붙여넣기 순서와 동일)
const FILES_IN_ORDER = [
  'lmsErrors.js',
  'lmsParseError.js',
  'classifyLmsEvent.js',
  'fetchLmsCalendarHtml.js',
  'parseLmsCalendarHtml.js',
  'sendLmsSchedules.js',
];

function stripModuleSyntax(source, filename) {
  // 한 줄짜리(`import { a } from '...'`)와 여러 줄로 걸친(`import {\n a\n} from '...'`) 둘 다 제거합니다.
  const withoutImports = source.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*$/gm, '');
  return withoutImports
    .split('\n')
    .map((line) => line.replace(/^(\s*)export\s+(function|class|const|async function)\b/, '$1$2'))
    .join('\n')
    .replace(/^/, `\n/* ── ${filename} (원본 그대로, import/export만 제거) ── */\n`);
}

const header = `/**
 * 자동 생성 파일 — 직접 고치지 마세요.
 * 원본: frontend/src/lms/*.js (F1·F2). 이 파일을 다시 만들려면
 * \`node extension/scripts/build-lms-bundle.js\` 를 실행하세요.
 */
`;

const body = FILES_IN_ORDER.map((filename) => {
  const filePath = path.join(SRC_DIR, filename);
  const source = fs.readFileSync(filePath, 'utf8');
  return stripModuleSyntax(source, filename);
}).join('\n');

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, header + body, 'utf8');
console.log(`생성 완료: ${path.relative(process.cwd(), OUT_FILE)}`);
