// Ask Chromium (CDP CSS.getPlatformFontsForNode) which font actually paints each element on the local baseline build.
// Usage: PORT=4391 node fonts_rendered.mjs  (serve-dist.mjs must be running). Blocks third-party requests.
import { chromium } from '/home/user/sisi-tools/node_modules/playwright-core/index.mjs';
const base = `http://127.0.0.1:${process.env.PORT||4391}`;
const pages = ['/pl/','/en/','/de/','/it/','/cs/','/pl/menu/','/cs/menu/','/pl/wydarzenia/','/pl/rezerwacje/','/pl/eventy-firmowe/','/pl/imprezy-prywatne/','/pl/kontakt/','/pl/blog/'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async()=>chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}));
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', r => { const u = new URL(r.request().url()); return u.hostname === '127.0.0.1' ? r.continue() : r.abort(); });
const totals = {};
for (const p of pages) {
  const page = await ctx.newPage();
  await page.goto(base + p, { waitUntil: 'load' }).catch(e=>console.log('goto fail',p,e.message));
  await page.waitForTimeout(600);
  // reveal lazy content
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'body *:not(script):not(style):not(svg):not(path):not(video):not(source):not(noscript)' });
  const seen = {};
  for (const nodeId of nodeIds) {
    let r; try { r = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }); } catch { continue; }
    for (const f of r.fonts) { const k = `${f.familyName} | custom=${f.isCustomFont}`; seen[k] = (seen[k]||0) + f.glyphCount; totals[k] = (totals[k]||0) + f.glyphCount; }
  }
  console.log(p, JSON.stringify(seen));
  await page.close();
}
console.log('TOTAL', JSON.stringify(totals, null, 1));
await browser.close();
