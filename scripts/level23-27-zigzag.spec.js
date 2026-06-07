import { test } from '@playwright/test';

// Verifies the level 23-27 redesign: each level must (a) be fully single-axis
// reachable by 4-direction keys, (b) NOT be a "hold right" level, and
// (c) use z-axis variation for 3D zigzag feel.

const PORT = process.env.PORT || 8080;

const REDESIGNED_LEVELS = [23, 24, 25, 26, 27];

test('level 23-27 redesign: single-axis reachable, no hold-right, has z variation', async ({ page }) => {
  await page.goto(`http://localhost:${PORT}/game.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.levels, { timeout: 15000 });
  await page.waitForTimeout(400);

  const report = await page.evaluate((levelIds) => {
    const g = window.game;
    const out = [];
    for (const id of levelIds) {
      const level = g.levels.find((l) => l.id === id);
      if (!level) {
        out.push({ id, error: 'level not found' });
        continue;
      }
      const blocks = level.blocks;
      const transitions = [];
      let badTransitions = 0;
      const axes = new Set();
      for (let i = 0; i < blocks.length - 1; i++) {
        const a = blocks[i];
        const b = blocks[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dy = (b.y || 0) - (a.y || 0);
        const isSingleAxis = (Math.abs(dx) === 2 && dz === 0) || (dx === 0 && Math.abs(dz) === 2);
        transitions.push({ i, from: { x: a.x, y: a.y, z: a.z }, to: { x: b.x, y: b.y, z: b.z }, dx, dy, dz, isSingleAxis });
        if (!isSingleAxis) badTransitions++;
        if (dx !== 0) axes.add('x');
        if (dz !== 0) axes.add('z');
      }
      const zValues = new Set(blocks.map((b) => b.z));
      const onlyX = axes.size === 1 && axes.has('x');
      const onlyZ = axes.size === 1 && axes.has('z');
      const yMin = Math.min(...blocks.map((b) => b.y || 0));
      const yMax = Math.max(...blocks.map((b) => b.y || 0));
      out.push({
        id,
        name: level.name,
        blockCount: blocks.length,
        zValues: [...zValues].sort((a, b) => a - b),
        axes: [...axes],
        onlyX,
        onlyZ,
        badTransitions,
        yMin,
        yMax,
        transitions,
      });
    }
    return out;
  }, REDESIGNED_LEVELS);

  console.log('\n=== LEVEL 23-27 REDESIGN REPORT ===');
  for (const r of report) {
    console.log(`\nLevel ${r.id} "${r.name}"`);
    console.log(`  blocks: ${r.blockCount}, z=[${r.zValues.join(',')}], axes=${JSON.stringify(r.axes)}, y=${r.yMin}→${r.yMax}, bad transitions: ${r.badTransitions}`);
    for (const t of r.transitions) {
      console.log(`    [${t.i}] (${t.from.x},${t.from.y},${t.from.z}) -> (${t.to.x},${t.to.y},${t.to.z}) dx=${t.dx} dy=${t.dy} dz=${t.dz} ${t.isSingleAxis ? 'OK' : 'BAD'}`);
    }
  }

  const failures = [];
  for (const r of report) {
    if (r.error) {
      failures.push(`Level ${r.id}: ${r.error}`);
      continue;
    }
    if (r.badTransitions > 0) {
      failures.push(`Level ${r.id}: ${r.badTransitions} transition(s) not single-axis reachable`);
    }
    if (r.onlyX) {
      failures.push(`Level ${r.id}: only uses x-axis ("hold right") — needs z variation`);
    }
    if (r.zValues.length < 2) {
      failures.push(`Level ${r.id}: only 1 distinct z value (${r.zValues[0]}) — no 3D variation`);
    }
    if (r.blockCount < 10 || r.blockCount > 16) {
      failures.push(`Level ${r.id}: block count ${r.blockCount} out of expected range 10-16`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Redesign verification failed:\n  - ${failures.join('\n  - ')}`);
  }

  console.log('\n✅ All 5 levels (23-27) pass redesign criteria');
});
