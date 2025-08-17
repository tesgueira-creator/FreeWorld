const puppeteer = require('puppeteer');
const pagesToCheck = [
  'http://127.0.0.1:8000/analytics.html',
  'http://127.0.0.1:8000/data.html'
];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const results = {};

  for (const url of pagesToCheck) {
    const page = await browser.newPage();
    const consoleMsgs = [];
    const failedRequests = [];

    page.on('console', msg => {
      try {
        consoleMsgs.push({type: msg.type(), text: msg.text()});
      } catch (e) {
        consoleMsgs.push({type: 'unknown', text: String(msg)});
      }
    });

    page.on('requestfailed', req => {
      failedRequests.push({url: req.url(), method: req.method(), failure: req.failure()});
    });

    // collect network errors (responses with status >= 400)
    page.on('response', res => {
      try {
        const status = res.status();
        if (status >= 400) {
          failedRequests.push({url: res.url(), status});
        }
      } catch(e){}
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (err) {
      consoleMsgs.push({type: 'error', text: 'Navigation error: ' + err.message});
    }

  // give some time for async scripts to run (portable sleep)
  await new Promise(resolve => setTimeout(resolve, 1500));

    results[url] = { console: consoleMsgs, failedRequests };
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
})();
