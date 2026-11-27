// PS5 Pro 1TB (UK) restock checker: checks every INTERVAL seconds for RUN_MINUTES using a real browser.
const { chromium } = require('playwright');

const TOPIC = process.env.NTFY_TOPIC || 'change-me';
const INTERVAL = +(process.env.INTERVAL || 60) * 1000;
const RUN_MINUTES = +(process.env.RUN_MINUTES || 0); // 0 = single check

const SHOPS = [
  ['PlayStation Direct', 'https://direct.playstation.com/en-gb/buy-consoles/playstation5-pro-console',
    /out of stock|currently unavailable|sold out/, /add to (basket|cart)/],
  ['Argos', 'https://www.argos.co.uk/search/ps5-pro/', /out of stock|not available/, /add to trolley/],
  ['Currys', 'https://www.currys.co.uk/search?q=ps5%20pro', /out of stock|sold out/, /add to basket/],
  ['Smyths', 'https://www.smythstoys.com/uk/en-gb/search/?text=ps5+pro', /out of stock|unavailable/, /add to (basket|cart)/],
  ['GAME', 'https://www.game.co.uk/en/m/search/?q=ps5+pro', /out of stock|sold out/, /add to basket/],
];

const wasInStock = {};

async function notify(title, msg, url) {
  try {
    await fetch(`https://ntfy.sh/${TOPIC}`, { method: 'POST', body: msg,
      headers: { Title: title, Click: url, Priority: 'urgent', Tags: 'video_game' } });
  } catch (e) { console.log('notify failed', e.message); }
}

async function checkAll(ctx) {
  const t = new Date().toISOString().slice(11, 19);
  await Promise.all(SHOPS.map(async ([name, url, outRe, inRe]) => {
    const page = await ctx.newPage();
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
      const text = (await page.innerText('body')).toLowerCase();
      const inStock = inRe.test(text) && !outRe.test(text);
      console.log(`${t} ${name}: ${inStock ? 'IN STOCK' : 'out of stock'}`);
      if (inStock && !wasInStock[name]) await notify('PS5 Pro restock!', `${name} may have PS5 Pro 1TB in stock - tap to open`, url);
      wasInStock[name] = inStock;
    } catch (e) {
      console.log(`${t} ${name}: fetch failed (${e.message.split('\n')[0]})`);
    } finally { await page.close(); }
  }));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/London',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 800 } });
  const end = Date.now() + RUN_MINUTES * 60000;
  do {
    const start = Date.now();
    await checkAll(ctx);
    const wait = INTERVAL - (Date.now() - start);
    if (Date.now() < end && wait > 0) await new Promise(r => setTimeout(r, wait));
  } while (Date.now() < end);
  await browser.close();
})();
