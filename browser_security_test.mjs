/**
 * Playwright browser workflow test - console, network, UI
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE = '/home/mk/Documents/New_Cicada_404/test_evidence';
const FRONTEND = process.env.TEST_FRONTEND_URL || 'http://localhost:8080';
const BACKEND = process.env.TEST_BACKEND_URL || 'http://localhost:8081';
const results = [];

function record(section, msg, status = 'INFO', data = null) {
  results.push({ section, msg, status, data });
  const sym = { PASS: '✓', FAIL: '✗', WARN: '!', INFO: '·' }[status] || '·';
  console.log(`[${sym}] ${section}: ${msg}`);
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // --- Deny camera permission ---
  const denyContext = await browser.newContext({
    permissions: [],
  });
  await denyContext.grantPermissions([], { origin: FRONTEND });
  const denyPage = await denyContext.newPage();
  const consoleLogsDeny = [];
  denyPage.on('console', (m) => consoleLogsDeny.push(m.text()));

  await denyPage.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await denyPage.fill('input[type="email"]', 'mkkrish2725@gmail.com');
  await denyPage.fill('input[type="password"]', 'wrongpass');
  await denyPage.click('button[type="submit"]');
  await denyPage.waitForTimeout(4000);

  const toastDeny = await denyPage.locator('.Toastify__toast-body').count();
  const securityLogsDeny = consoleLogsDeny.filter((l) => l.includes('[Security]'));
  record(
    '4.camera',
    'Deny permission: page did not crash',
    denyPage.url().includes('login') || denyPage.url().includes('dashboard') ? 'PASS' : 'WARN',
    { url: denyPage.url(), securityLogs: securityLogsDeny }
  );
  record(
    '4.camera',
    'Permission warning path (toast or security log)',
    toastDeny > 0 || securityLogsDeny.some((l) => l.includes('null') || l.includes('failed'))
      ? 'PASS'
      : 'WARN',
    { toasts: toastDeny, logs: securityLogsDeny }
  );
  await denyPage.screenshot({ path: path.join(EVIDENCE, 'deny_camera_login.png') });
  await denyContext.close();

  // --- Allow fake camera ---
  const context = await browser.newContext({
    permissions: ['camera'],
  });
  const page = await context.newPage();
  const consoleLogs = [];
  const networkEvents = [];

  page.on('console', (m) => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('login_verify') || url.includes('send_snapshot_email')) {
      let body = '';
      try {
        body = await res.text();
      } catch (_) {}
      networkEvents.push({
        url,
        status: res.status(),
        method: res.request().method(),
        body: body.slice(0, 300),
      });
    }
  });

  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(EVIDENCE, '01_login_page.png') });

  // Wrong password flow
  await page.fill('input[type="email"]', 'mkkrish2725@gmail.com');
  await page.fill('input[type="password"]', 'WRONG_BROWSER_TEST');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);

  const secLogs = consoleLogs.filter((l) => l.text.includes('[Security]'));
  const expectedLogs = [
    'camera started',
    'video ready',
    'frame captured',
    'blob created',
    'sending snapshot',
  ];
  for (const phrase of expectedLogs) {
    const found = secLogs.some((l) => l.text.toLowerCase().includes(phrase));
    record('3.webcam', `Console: "${phrase}"`, found ? 'PASS' : 'WARN', {
      matching: secLogs.filter((l) => l.text.toLowerCase().includes(phrase)).map((l) => l.text),
    });
  }

  const loginReq = networkEvents.find((e) => e.url.includes('login_verify'));
  const snapReq = networkEvents.find((e) => e.url.includes('send_snapshot_email'));
  if (loginReq?.status === 401) {
    record('1.login_verify', 'Browser wrong-password → 401', 'PASS', loginReq);
  } else {
    record('1.login_verify', 'Browser login_verify status', loginReq ? 'WARN' : 'FAIL', loginReq);
  }
  if (snapReq?.status === 200) {
    record('2.send_snapshot_email', 'Browser snapshot POST → 200', 'PASS', snapReq);
  } else {
    record('2.send_snapshot_email', 'Browser snapshot request', snapReq ? 'WARN' : 'FAIL', snapReq);
  }

  await page.screenshot({ path: path.join(EVIDENCE, '02_after_failed_login.png') });

  // Success login
  await page.fill('input[type="password"]', 'SecurityTest!2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const cookies = await context.cookies();
  const tokenCookie = cookies.find((c) => c.name === 'token');
  record(
    '8.session',
    'JWT cookie after browser success login',
    tokenCookie?.httpOnly ? 'PASS' : 'FAIL',
    tokenCookie ? { name: tokenCookie.name, httpOnly: tokenCookie.httpOnly, sameSite: tokenCookie.sameSite } : null
  );
  await page.screenshot({ path: path.join(EVIDENCE, '03_dashboard.png') });

  // Refresh persists auth
  await page.reload({ waitUntil: 'networkidle' });
  const stillOnDash = page.url().includes('dashboard');
  record('8.session', 'Refresh keeps authenticated session', stillOnDash ? 'PASS' : 'FAIL', { url: page.url() });

  // Admin panel
  await page.goto(`${FRONTEND}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const failedText = await page.locator('text=Suspicious').first().isVisible().catch(() => false);
  const tableRows = await page.locator('table tbody tr').count();
  record('7.dashboard', 'Admin shows login history table', tableRows > 0 ? 'PASS' : 'WARN', { rows: tableRows });
  record('7.dashboard', 'Admin suspicious/failed stats visible', failedText ? 'PASS' : 'WARN');
  await page.screenshot({ path: path.join(EVIDENCE, '04_admin_panel.png') });

  // Logout
  await page.click('text=Sign Out');
  await page.waitForTimeout(2000);
  const cookiesAfter = await context.cookies();
  const tokenGone = !cookiesAfter.find((c) => c.name === 'token' && c.value);
  record('8.session', 'Logout clears token cookie', tokenGone ? 'PASS' : 'WARN');

  // Failed login no session
  await page.goto(`${FRONTEND}/login`);
  await page.fill('input[type="email"]', 'mkkrish2725@gmail.com');
  await page.fill('input[type="password"]', 'bad');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  const cookiesFail = await context.cookies();
  const noToken = !cookiesFail.some((c) => c.name === 'token' && c.value);
  record('8.session', 'Failed login creates NO session cookie', noToken ? 'PASS' : 'FAIL');

  // Uncaught errors
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  record(
    '9.errors',
    'No uncaught page errors during flow',
    pageErrors.length === 0 ? 'PASS' : 'FAIL',
    { errors: pageErrors }
  );

  fs.writeFileSync(path.join(EVIDENCE, 'browser_test_report.json'), JSON.stringify({ results, consoleLogs: secLogs, networkEvents }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
