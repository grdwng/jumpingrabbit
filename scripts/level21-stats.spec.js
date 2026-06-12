import { test } from '@playwright/test';

// Survey: report level 21 block count + reachability stats
// so Dad can decide on the minimal fix.

test('level 21: report block count, jump type distribution, and any broken transitions', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.blocks, { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    if (!window.game.unlockedLevels.includes(21)) {
      window.game.unlockedLevels.push(21);
    }
    window.game.loadLevel(21);
  });
  await page.waitForFunction(() => window.game.blocks.length > 0, { timeout: 8000 });
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const level = window.game.levels.find((l) => l.id === 21);
    const order = level.blocks;
    const transitions = [];
    let normal = 0, big = 0, broken = 0;
    for (let i = 0; i < order.length - 1; i++) {
      const from = order[i], to = order[i + 1];
      const dx = to.x - from.x, dz = to.z - from.z;
      const dy = (to.y || 0) - (from.y || 0);
      const singleAxis = dx === 0 || dz === 0;
      const normalOK = singleAxis && (dx === 0 ? Math.abs(dz) === 2 : Math.abs(dx) === 2);
      const bigOK = singleAxis && (dx === 0 ? Math.abs(dz) === 4 : Math.abs(dx) === 4);
      const reachable = singleAxis && (normalOK || bigOK);
      if (!reachable) broken++;
      else if (normalOK) normal++;
      else if (bigOK) big++;
      transitions.push({ i, from: `(${from.x},${from.y || 0},${from.z})`, to: `(${to.x},${to.y || 0},${to.z})`, dy, dx, dz, type: !reachable ? 'BROKEN' : (normalOK ? 'normal' : 'big') });
    }
    return { totalBlocks: order.length, transitions, normal, big, broken };
  });

  console.log('\n=== LEVEL 21 SURVEY ===');
  console.log(`Blocks: ${result.totalBlocks} (R085 target: 10-15)`);
  console.log(`Transitions: ${result.transitions.length} total`);
  console.log(`  normal jumps: ${result.normal} (${Math.round((result.normal / result.transitions.length) * 100)}%)`);
  console.log(`  big jumps:    ${result.big} (${Math.round((result.big / result.transitions.length) * 100)}%)`);
  console.log(`  broken:       ${result.broken}`);
  console.log('\nidx | from -> to                  | dy  | type');
  console.log('----|------------------------------|-----|-------');
  for (const t of result.transitions) {
    console.log(`${String(t.i).padStart(2)}  | ${t.from} -> ${t.to}  | ${String(t.dy).padStart(3)} | ${t.type}`);
  }

  // Reporting only — no assertion. Dad decides what to change.
});
