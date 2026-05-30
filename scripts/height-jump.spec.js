import { test, expect } from '@playwright/test';

test('向下跳不需要Space键', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 设置玩家在高处 (y=1)，目标在低处 (y=0)，向下跳
  await page.evaluate(() => {
    window.game.playerPosition = { x: 1, y: 1, z: 0 };
    window.game.worldOffset = { x: 0, z: 0 };
  });

  // 只按方向键向下跳（不按Space）
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);

  // 应该成功跳跃（不需要Space）
  const canJump = await page.evaluate(() => {
    return window.game.lastJumpResult !== 'blocked';
  });
  expect(canJump).toBe(true);
});

test('向上跳需要Space键', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 设置玩家在低处 (y=0)，目标在高处 (y=1)，向上跳
  await page.evaluate(() => {
    window.game.playerPosition = { x: 1, y: 0, z: 0 };
    window.game.worldOffset = { x: 0, z: 0 };
    window.game.jumpAttempted = false;
  });

  // 只按方向键向上跳（不按Space）应该被阻止
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);

  const jumpAttempted = await page.evaluate(() => {
    return window.game.jumpAttempted;
  });
  expect(jumpAttempted).toBe(false); // 不应该尝试跳跃
});

test('向上跳带Space键应该成功', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 设置玩家在低处 (y=0)，目标在高处 (y=1)
  await page.evaluate(() => {
    window.game.playerPosition = { x: 1, y: 0, z: 0 };
    window.game.worldOffset = { x: 0, z: 0 };
  });

  // 按Space+方向键向上跳
  await page.keyboard.down('Space');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(500);

  // 应该成功跳跃
  const lastJumpResult = await page.evaluate(() => {
    return window.game.lastJumpResult;
  });
  expect(lastJumpResult).not.toBe('blocked');
});