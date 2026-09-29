// List elements whose glyphs fall back to a non-custom font (which text, which font) on a page. Usage: PORT=4391 node fonts_fallback.mjs /pl/
import { chromium } from '/home/user/sisi-tools/node_modules/playwright-core/index.mjs';
const base = `http://127.0.0.1:${process.env.PORT||4391}`; const p = process.argv[2]||'/pl/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
const page = await ctx.newPage(); await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(600);
const cdp = await ctx.newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'body *:not(script):not(style):not(svg):not(path):not(video):not(source):not(noscript)' });
for (const nodeId of nodeIds) {
  const r = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }).catch(()=>null); if (!r) continue;
  const fb = r.fonts.filter(f => !f.isCustomFont); if (!fb.length) continue;
  const { object } = await cdp.send('DOM.resolveNode', { nodeId });
  const info = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true, functionDeclaration: `function(){const own=[...this.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim().slice(0,70);return {tag:this.tagName,cls:this.className&&this.className.baseVal===undefined?String(this.className).slice(0,40):'',own,ff:getComputedStyle(this).fontFamily.slice(0,40)}}` });
  console.log(JSON.stringify(fb.map(f=>f.familyName+':'+f.glyphCount)), JSON.stringify(info.result.value));
}
await browser.close();
