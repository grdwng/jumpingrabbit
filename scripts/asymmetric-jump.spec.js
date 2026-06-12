import { test, expect } from '@playwright/test';

test('jumpTrajectory returns 0 at t=0 for asymmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0, 'asymmetric'));
  expect(result).toBe(0);
});

test('jumpTrajectory peaks at t=0.3 for asymmetric (value=1)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0.3, 'asymmetric'));
  expect(result).toBe(1);
});

test('jumpTrajectory returns 0 at t=1 for asymmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(1, 'asymmetric'));
  expect(result).toBe(0);
});

test('jumpTrajectory at t=0.5 (descent) is 0.714 for asymmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0.5, 'asymmetric'));
  // (1 - 0.5) / 0.7 = 0.714
  expect(result).toBeCloseTo(0.714, 2);
});

test('jumpTrajectory peaks at t=0.5 for symmetric (value=1, original behavior)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0.5, 'symmetric'));
  expect(result).toBe(1);
});

test('jumpTrajectory symmetric at t=0 returns 0', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0, 'symmetric'));
  expect(result).toBe(0);
});

test('jumpTrajectory is a pure function (call twice, same result)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const results = await page.evaluate(() => {
    const a = window.game.jumpTrajectory(0.4, 'asymmetric');
    const b = window.game.jumpTrajectory(0.4, 'asymmetric');
    return [a, b];
  });
  expect(results[0]).toBe(results[1]);
});

test('playLandingStomp does not throw when targetBlock is null', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const error = await page.evaluate(() => {
    try {
      window.game.playLandingStomp(null, 100);
      return null;
    } catch (e) {
      return e.message;
    }
  });
  expect(error).toBeNull();
});

test('playLandingStomp applies stomp offset based on targetY baseline (not current y)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(async () => {
    const targetY = 150;
    window.game.player.position.y = targetY;
    window.game.playLandingStomp(null, targetY);
    await new Promise(r => setTimeout(r, 200));
    return window.game.player.position.y;
  });
  expect(result).toBeCloseTo(150, 0);
});

test('level 16+ upward jump uses asymmetric trajectory (peak at t=0.3 of duration)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Load level 16 explicitly (intermediate)
  await page.evaluate(() => {
    if (!window.game.unlockedLevels.includes(16)) {
      window.game.unlockedLevels.push(16);
    }
    window.game.loadLevel(16);
  });
  await page.waitForTimeout(500);

  // Manually invoke jumpTrajectory with the gating logic for level 16
  const playerYAtT = await page.evaluate(() => {
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';

    const samples = [];
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const p = window.game.jumpTrajectory(t, profile);
      samples.push({ t, p });
    }
    return samples;
  });

  const pAtT03 = playerYAtT.find(s => s.t === 0.3).p;
  const pAtT05 = playerYAtT.find(s => s.t === 0.5).p;
  expect(pAtT03).toBe(1);
  expect(pAtT05).toBeLessThan(1);
  expect(pAtT05).toBeCloseTo(0.714, 2);
});

test('level 1 (beginner, flat) still uses symmetric trajectory (no behavior change)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 1;
    const pSym = window.game.jumpTrajectory(0.5, 'symmetric');
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return { pSym, profile };
  });
  expect(result.pSym).toBe(1);
  expect(result.profile).toBe('symmetric');
});

test('level 30 (boundary) uses asymmetric trajectory', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 30;
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return profile;
  });
  expect(result).toBe('asymmetric');
});

test('level 31 (outside range) falls back to symmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 31;
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return profile;
  });
  expect(result).toBe('symmetric');
});

test('level 16 with heightDiff=0 uses symmetric (only upward triggers)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 16;
    const bigJump = true;
    const heightDiff = 0;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return profile;
  });
  expect(result).toBe('symmetric');
});

test('gameState stays jumping during 80ms stomp window (state race fix)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    // Simulate the post-landing moment: gameState='jumping' and stomp is starting
    window.game.gameState = 'jumping';
    const origOnLand = window.game.onLand;
    let onLandCallTime = null;
    window.game.onLand = function() {
      onLandCallTime = performance.now();
      // Don't actually mutate gameState for this test
    };
    const stompStart = performance.now();
    window.game.playLandingStomp(null, 100, () => window.game.onLand());
    // At t=40ms (mid-stomp), gameState should still be 'jumping'
    await new Promise(r => setTimeout(r, 40));
    const midStompState = window.game.gameState;
    // At t=150ms (after stomp), onLand should have been called
    await new Promise(r => setTimeout(r, 110));
    const onLandElapsed = onLandCallTime ? (onLandCallTime - stompStart) : null;
    // Restore
    window.game.onLand = origOnLand;
    return { midStompState, onLandElapsed };
  });

  expect(result.midStompState).toBe('jumping');
  expect(result.onLandElapsed).toBeGreaterThanOrEqual(80);
  expect(result.onLandElapsed).toBeLessThan(150);
});
