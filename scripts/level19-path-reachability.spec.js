import { test, expect } from '@playwright/test';

// Phase 1 verify: simulate level 19 path and report which transitions are
// reachable by a single arrow key press. The bug is: the endpoint (16,1,0)
// is at z=0 but the previous block (14,2,2) is at z=2, requiring a single
// press to change both x and z — which is impossible.
//
// This test walks the level blocks in order, simulates the world move for
// each candidate key press, and checks whether the target block ends up at
// the player's position. If the world move places the target block under
// the player, the transition is reachable.

test('level 19: walk path and report reachable transitions', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.blocks, { timeout: 15000 });
  await page.waitForTimeout(800);

  // Unlock and load level 19
  await page.evaluate(() => {
    if (!window.game.unlockedLevels.includes(19)) {
      window.game.unlockedLevels.push(19);
    }
    window.game.loadLevel(19);
  });
  await page.waitForFunction(() => window.game.blocks.length > 0, { timeout: 8000 });
  await page.waitForTimeout(400);

  // For each transition in level 19, check reachability. The world move in
  // the actual game is worldMoveX = -dir.x * W * jumpBlocks, worldMoveZ =
  // -dir.z * D * jumpBlocks. For the target block (to.x, to.z) to land
  // under the player (world 0,0), we need:
  //   to.x*W + worldMoveX = 0  AND  to.z*D + worldMoveZ = 0
  //   => dir.x * jumpBlocks = to.x  (and dir.z * jumpBlocks = to.z)
  // Since pressing dir from current grid (from.x, from.z) must reach
  // (to.x, to.z), the direction has to align with the delta.
  const result = await page.evaluate(() => {
    const g = window.game;
    const level = g.levels.find((l) => l.id === 19);
    const order = level.blocks;

    const transitions = [];
    for (let i = 0; i < order.length - 1; i++) {
      const from = order[i];
      const to = order[i + 1];
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const dy = (to.y || 0) - (from.y || 0);

      // A single 4-direction key press can only change ONE axis. So we
      // need either dx=0 OR dz=0 (not both non-zero).
      const singleAxis = dx === 0 || dz === 0;
      // The non-zero axis must match a valid jump distance: 2 (normal) or 4 (big).
      const distOK =
        singleAxis &&
        ((dx === 0 && (Math.abs(dz) === 2 || Math.abs(dz) === 4)) ||
          (dz === 0 && (Math.abs(dx) === 2 || Math.abs(dx) === 4)));
      const normalJumpable = distOK && (dx === 0 ? Math.abs(dz) === 2 : Math.abs(dx) === 2);
      const bigJumpable = distOK && (dx === 0 ? Math.abs(dz) === 4 : Math.abs(dx) === 4);

      transitions.push({
        i,
        from: `(${from.x},${from.y || 0},${from.z})`,
        to: `(${to.x},${to.y || 0},${to.z})`,
        delta: `(dx=${dx}, dy=${dy}, dz=${dz})`,
        singleAxis,
        normalJumpable,
        bigJumpable,
        reachable: singleAxis && distOK,
      });
    }
    return { transitions, totalBlocks: order.length };
  });

  console.log('\n=== LEVEL 19 PATH TRANSITIONS ===');
  console.log('idx | from          -> to            | delta             | single-axis | normal | big | reachable');
  console.log('----|-------------------------------|-------------------|-------------|--------|-----|----------');
  for (const t of result.transitions) {
    console.log(
      `${String(t.i).padStart(2)}  | ${t.from.padEnd(13)} -> ${t.to.padEnd(13)} | ${t.delta.padEnd(17)} | ${String(t.singleAxis).padStart(11)}  | ${String(t.normalJumpable).padStart(6)} | ${String(t.bigJumpable).padStart(3)} | ${t.reachable}`
    );
  }

  // Find unreachable transitions
  const broken = result.transitions.filter((t) => !t.reachable);
  if (broken.length > 0) {
    console.log(`\n!! ${broken.length} UNREACHABLE transition(s):`);
    for (const t of broken) {
      console.log(`   ${t.from} -> ${t.to} (delta ${t.delta}) — single-axis: ${t.singleAxis}`);
    }
  }

  // === ASSERTION ===
  // The path must be fully walkable: every consecutive pair reachable by a
  // single arrow key press (normal or big). The bug was: last transition
  // requires changing both x AND z, which is impossible.
  expect(broken.length).toBe(0);
});
