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
