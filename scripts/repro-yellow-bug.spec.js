import { test } from '@playwright/test';
import fs from 'fs';

test('reproduce: scan DOM for yellow / transient elements on level entry', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.blocks, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Trigger level load and scan DOM + CSS at multiple time points
  const samples = await page.evaluate(async () => {
    const isYellowish = (c) => {
      // parse rgb(r,g,b) or rgba(r,g,b,a) or hex
      let r, g, b;
      const rgb = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgb) { r = +rgb[1]; g = +rgb[2]; b = +rgb[3]; }
      else if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
        if (c.length === 7) { r = parseInt(c.slice(1,3),16); g = parseInt(c.slice(3,5),16); b = parseInt(c.slice(5,7),16); }
        else { r = parseInt(c[1]+c[1],16); g = parseInt(c[2]+c[2],16); b = parseInt(c[3]+c[3],16); }
      } else return false;
      return r > 180 && g > 140 && b < 120 && r >= g;
    };
    const snap = (label) => {
      const out = { label, t: Math.round(performance.now()), all: [], yellows: [] };
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const cs = getComputedStyle(el);
        const styles = {
          color: cs.color, background: cs.backgroundColor,
          borderColor: cs.borderColor, outlineColor: cs.outlineColor,
        };
        const rect = el.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.1;
        const entry = { tag: el.tagName, id: el.id, cls: el.className, visible, styles, rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } };
        out.all.push(entry);
        if (visible) {
          for (const [k, v] of Object.entries(styles)) {
            if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'rgb(0, 0, 0)' && isYellowish(v)) {
              out.yellows.push({ ...entry, colorSource: k, colorValue: v });
              break;
            }
          }
        }
      }
      return out;
    };

    const out = [];
    out.push(snap('PRE_RELOAD'));
    window.game.loadLevel(16);
    out.push(snap('T+0'));
    await new Promise((r) => setTimeout(r, 50));
    out.push(snap('T+50'));
    await new Promise((r) => setTimeout(r, 150));
    out.push(snap('T+200'));
    await new Promise((r) => setTimeout(r, 200));
    out.push(snap('T+400'));
    await new Promise((r) => setTimeout(r, 400));
    out.push(snap('T+800'));
    await new Promise((r) => setTimeout(r, 700));
    out.push(snap('T+1500'));
    return out;
  });

  console.log('\n=== DOM TIME-SERIES SCAN (level 16 entry) ===');
  for (const s of samples) {
    const visibleCount = s.all.filter((e) => e.visible).length;
    console.log(`${s.label.padEnd(12)} | visible=${String(visibleCount).padStart(4)} | yellows=${s.yellows.length}`);
    for (const y of s.yellows) {
      console.log(`    YELLOW: <${y.tag}${y.id ? '#' + y.id : ''}${y.cls ? '.' + String(y.cls).split(' ').join('.') : ''}> at (${y.rect.x},${y.rect.y}) ${y.rect.w}x${y.rect.h} via ${y.colorSource}=${y.colorValue}`);
    }
  }

  // Diff: which yellows appear early but not later?
  const key = (y) => `${y.tag}#${y.id}.${y.cls}|${y.colorSource}|${y.colorValue}`;
  console.log('\n--- YELLOW diffs ---');
  for (let i = 1; i < samples.length; i++) {
    const prev = new Set(samples[i - 1].yellows.map(key));
    const cur = new Set(samples[i].yellows.map(key));
    const added = [...cur].filter((x) => !prev.has(x));
    const removed = [...prev].filter((x) => !cur.has(x));
    if (added.length) console.log(`  ${samples[i - 1].label} → ${samples[i].label} +${added.length}: ${added.slice(0, 3).join(' | ')}`);
    if (removed.length) console.log(`  ${samples[i - 1].label} → ${samples[i].label} -${removed.length}: ${removed.slice(0, 3).join(' | ')}`);
  }

  fs.writeFileSync('test-results/yellow-dom-scan.json', JSON.stringify(samples, null, 2));
  console.log('\nData: test-results/yellow-dom-scan.json');
});
