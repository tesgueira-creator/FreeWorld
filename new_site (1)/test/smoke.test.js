const puppeteer = require('puppeteer');
const fs = require('fs');

jest.setTimeout(30000);

describe('smoke pages', () => {
  let browser;
  const out = [];

  beforeAll(async () => {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    try {
      fs.writeFileSync('test/smoke-output.json', JSON.stringify(out, null, 2));
      // eslint-disable-next-line no-console
      console.log('Smoke test completed. Output written to test/smoke-output.json');
    } catch (e) {
      // ignore write errors in teardown
    }
  });

  test('data.html and analytics.html render without fatal errors', async () => {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      out.push({ type: 'console', text: msg.text() });
    });
    page.on('pageerror', (err) => {
      out.push({ type: 'error', text: err.message });
    });

    const urls = [
      { url: 'http://127.0.0.1:8000/data.html', check: '#ufotable' },
      { url: 'http://127.0.0.1:8000/analytics.html', check: '#chartMap' },
    ];

    for (const u of urls) {
      out.push({ type: 'visit', text: u.url });
      const resp = await page.goto(u.url, { waitUntil: 'networkidle2', timeout: 30000 });
      expect(resp && resp.ok()).toBeTruthy();
  // give the page a short moment to render charts/maps
  await new Promise((r) => setTimeout(r, 2500));
      const exists = (await page.$(u.check)) !== null;
      out.push({ type: 'dom-check', url: u.url, selector: u.check, exists });
      expect(exists).toBeTruthy();
    }

    await page.close();
  });
});
