const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const out = [];
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      out.push({ type: 'console', text: msg.text() });
    });
    page.on('pageerror', (err) => {
      out.push({ type: 'error', text: err.message });
    });

    const urls = ['http://127.0.0.1:8000/data.html', 'http://127.0.0.1:8000/analytics.html'];
    for (const url of urls) {
      out.push({ type: 'visit', text: url });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      // wait a little for charts and map to render
      await page.waitForTimeout(2500);
      // check DOM for table and chart containers
      const tableExists = await page.$('#ufotable') !== null;
      const chartExists = await page.$('#chartContainer') !== null;
      out.push({ type: 'dom-check', url, tableExists, chartExists });
    }
  } catch (e) {
    out.push({ type: 'fatal', text: e.message });
  } finally {
    await browser.close();
    fs.writeFileSync('test/smoke-output.json', JSON.stringify(out, null, 2));
    console.log('Smoke test completed. Output written to test/smoke-output.json');
  }
})();
