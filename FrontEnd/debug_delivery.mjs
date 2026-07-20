import { chromium } from 'playwright';
import fs from 'fs';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc4NDU5OTY2Mn0.tzKG0P39ZuOWAvrd4elkuUBvf_iGCl3sIUJo87ivd_4';
const BASE = 'http://localhost:5175';

(async () => {
  const logs = [];
  const errors = [];
  function log(line) { logs.push(line); console.log(line); }

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const line = `[${msg.type()}] ${msg.text()}`;
      logs.push(line); console.log(line);
    }
  });
  page.on('pageerror', err => {
    const line = `[PAGEERROR] ${err.message}`;
    errors.push(line); console.error(line);
  });

  await page.goto(`${BASE}/login`);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('smartflow_user', JSON.stringify({ role_name: 'IT', permission_name: 'admin', username: 'admin' }));
    localStorage.setItem('smartflow_active_permissions', JSON.stringify({ 'delivery-tracking': 'write' }));
  }, TOKEN);

  await page.goto(`${BASE}/admin/delivery-tracking`);
  await page.waitForTimeout(5000);
  log(`URL: ${page.url()}`);

  const tableVisible = await page.isVisible('table tbody tr').catch(() => false);
  log(`Table visible: ${tableVisible}`);

  if (!tableVisible) {
    log('Table not visible, aborting click test');
    await browser.close();
    return;
  }

  // Click first action menu
  await page.click('table tbody tr:first-child .action-btn');
  await page.waitForTimeout(200);
  await page.click('table tbody tr:first-child .action-menu-item');
  await page.waitForTimeout(3000);

  const text = await page.evaluate(() => document.body.innerText);
  log(`Body text length: ${text.length}`);
  log(`Contains modal header: ${text.includes('PHIẾU BG')}`);
  log(`Contains Chi tiết bàn giao: ${text.includes('Chi tiết bàn giao')}`);
  log(`Contains Loading: ${text.includes('Đang tải thông tin chi tiết')}`);

  // Try clicking QC tabs if modal is open
  const qcTab = await page.$('text=QC (Đầu Cuối)');
  if (qcTab) {
    log('QC tab found, clicking');
    await qcTab.click();
    await page.waitForTimeout(2000);
    log(`After QC tab - page errors: ${errors.length}`);
  }

  const startTab = await page.$('text=QC (Đầu Vào)');
  if (startTab) {
    log('QC start tab found, clicking');
    await startTab.click();
    await page.waitForTimeout(2000);
    log(`After QC start tab - page errors: ${errors.length}`);
  }

  await page.screenshot({ path: 'debug_delivery_screenshot.png', fullPage: true });

  fs.writeFileSync('debug_delivery_logs.json', JSON.stringify({ url: page.url(), errors, logs }, null, 2));
  log('Saved debug_delivery_logs.json');

  await browser.close();
})();
