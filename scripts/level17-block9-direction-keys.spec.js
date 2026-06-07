import { test } from '@playwright/test';

// Reproduces the level 17 block 8/9 silent no-op bug.
// From block 9 (10,4,2), pressing ➡️ and ⬇️ should not be silent no-ops —
// per Dad's rule, any keypress must produce visible action (jump + fall OK).
//
// Root cause hypothesis: executeJump() in game.html silently sets
// jumpAllowed=false when target block exists at same (x,z) but at higher y.
// Fix converts silent block into a fall (targetBlock=null → startJump → onLand → onFall).

const PORT = process.env.PORT || 8080;

test('level 17 block 9: every arrow key must produce visible action', async ({ page }) => {
  // Capture console for diagnostic
  const consoleLines = [];
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

  await page.goto(`http://localhost:${PORT}/game.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.blocks, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Unlock + load level 17
  await page.evaluate(() => {
    if (!window.game.unlockedLevels.includes(17)) {
      window.game.unlockedLevels.push(17);
    }
    window.game.loadLevel(17);
  });
  await page.waitForFunction(() => window.game.blocks.length > 0, { timeout: 8000 });
  await page.waitForTimeout(300);

  // Force player to block 9 (10,4,2) — the problem block.
  // Level 17 blocks (1-indexed):
  //  1: (0,0,0)  start
  //  2: (2,1,0)
  //  3: (4,2,0)
  //  4: (4,3,2)
  //  5: (6,4,2)
  //  6: (8,5,2)
  //  7: (8,6,0)
  //  8: (10,5,0)   ← problem block A
  //  9: (10,4,2)   ← problem block B (Dad's report)
  // 10: (12,3,2)
  // 11: (14,2,2)   end
  const setupBlock9 = async () => {
    await page.evaluate(() => {
      const g = window.game;
      g.playerPosition = { x: 10, y: 4, z: 2 };
      g.gameState = 'waiting';
      g.isInPlaceJump = false;
      g.pendingDirection = null;
      g.pendingSpace = false;
      const block9 = g.blocks.find(
        (b) => b.userData.x === 10 && b.userData.y === 4 && b.userData.z === 2
      );
      if (block9) {
        const targetY = g.blockConfig.height * 4 + (g.blockConfig.height - g.scaledBottom + 3.1);
        g.player.position.set(0, targetY, 0);
        g.worldOffset = { x: 0, z: 0 };
        g.blocks.forEach((b) => {
          b.userData.originalX = b.userData.x * g.blockConfig.width;
          b.userData.originalZ = b.userData.z * g.blockConfig.depth;
          b.position.x = b.userData.originalX;
          b.position.z = b.userData.originalZ;
        });
      }
    });
    await page.waitForTimeout(200);
  };

  const probe = async (key) => {
    return await page.evaluate(async (k) => {
      const g = window.game;
      const before = {
        gameState: g.gameState,
        playerY: g.player.position.y,
        playerPos: { x: g.playerPosition.x, y: g.playerPosition.y, z: g.playerPosition.z },
        lives: g.lives,
        worldOffset: { ...g.worldOffset },
        lastJumpResult: g.lastJumpResult,
        jumpAttempted: g.jumpAttempted,
      };
      g.lastJumpResult = null;
      g.jumpAttempted = false;

      const ev = new KeyboardEvent('keydown', { key: k, code: k, bubbles: true });
      window.dispatchEvent(ev);

      // Wait for buffer (80ms) + animation (~400ms) + buffer
      await new Promise((r) => setTimeout(r, 1500));

      const landedBlock = g.blocks.find((b) => {
        const dx = b.position.x + g.worldOffset.x;
        const dz = b.position.z + g.worldOffset.z;
        return Math.sqrt(dx * dx + dz * dz) < 2.0;
      });
      const after = {
        gameState: g.gameState,
        playerY: g.player.position.y,
        playerPos: landedBlock
          ? { x: landedBlock.userData.x, y: landedBlock.userData.y, z: landedBlock.userData.z }
          : { x: g.playerPosition.x, y: g.playerPosition.y, z: g.playerPosition.z },
        lives: g.lives,
        worldOffset: { ...g.worldOffset },
        lastJumpResult: g.lastJumpResult,
        jumpAttempted: g.jumpAttempted,
      };
      return { before, after, key: k };
    }, key);
  };

  const results = {};
  for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    await setupBlock9();
    const r = await probe(key);
    results[key] = r;
  }

  console.log('\n=== LEVEL 17 BLOCK 9 PROBE RESULTS ===');
  for (const [k, r] of Object.entries(results)) {
    console.log(`\n${k}:`);
    console.log(
      `  before: gameState=${r.before.gameState}, pos=(${r.before.playerPos.x},${r.before.playerPos.y},${r.before.playerPos.z}), lives=${r.before.lives}, lastJumpResult=${r.before.lastJumpResult}`
    );
    console.log(
      `  after:  gameState=${r.after.gameState}, pos=(${r.after.playerPos.x},${r.after.playerPos.y},${r.after.playerPos.z}), lives=${r.after.lives}, lastJumpResult=${r.after.lastJumpResult}, jumpAttempted=${r.after.jumpAttempted}`
    );
  }
  if (consoleLines.length) {
    console.log('\n=== CONSOLE OUTPUT ===');
    consoleLines.forEach((l) => console.log(l));
  }

  // === ASSERTIONS ===
  // Per Dad's rule "we never silently no-op, at worst fall and restart",
  // every arrow key press must produce VISIBLE animation (world moves) or
  // an observable outcome (lives decremented). The bug is when
  // lastJumpResult === 'blocked' AND neither worldOffset nor lives changed
  // — that's the silent no-op the user sees as "the app is broken".

  const failingKeys = [];
  for (const [k, r] of Object.entries(results)) {
    const worldChanged =
      r.before.worldOffset.x !== r.after.worldOffset.x ||
      r.before.worldOffset.z !== r.after.worldOffset.z;
    const livesChanged = r.before.lives !== r.after.lives;
    // Required: animation ran (world moved) OR a fall happened (lives--).
    // The posChanged signal is unreliable here because the game's onLand
    // dist check has a separate pre-existing math bug — the diagnostic
    // shouldn't rely on it. Animation + lives are the ground truth.
    const hadAction = worldChanged || livesChanged;

    if (!hadAction) {
      failingKeys.push({ key: k, before: r.before, after: r.after });
    }
  }

  if (failingKeys.length > 0) {
    const report = failingKeys
      .map(
        (f) =>
          `  ${f.key}: lastJumpResult=${f.after.lastJumpResult}, worldOffset ${JSON.stringify(f.before.worldOffset)}→${JSON.stringify(f.after.worldOffset)}, lives ${f.before.lives}→${f.after.lives}`
      )
      .join('\n');
    throw new Error(
      `BUG REPRODUCED: ${failingKeys.length} arrow key(s) silently no-op'd from block 9:\n${report}`
    );
  }

  console.log('\n✅ All 4 arrow keys produced visible action from block 9');
});
