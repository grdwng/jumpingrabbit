import { test, expect } from '@playwright/test';

test('通关初级20关后中级解锁', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 完成初级20关
  await page.evaluate(() => {
    window.game.currentLevel = 20;
    window.game.onVictory();
  });
  await page.waitForTimeout(500);

  // 检查中级是否解锁
  const intermediateUnlocked = await page.evaluate(() => {
    return window.game.unlockedLevels.includes(21);
  });
  expect(intermediateUnlocked).toBe(true);
});

test('中级未解锁时不能进入', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Level 21 should not be unlocked initially
  const initialUnlocked = await page.evaluate(() => {
    return window.game.unlockedLevels.includes(21);
  });
  expect(initialUnlocked).toBe(false);

  // Attempt to load level 21 directly
  await page.evaluate(() => {
    window.game.loadLevel(21);
  });

  // Should still be on level 1 or whatever was loaded before
  const currentLevel = await page.evaluate(() => {
    return window.game.currentLevel;
  });
  expect(currentLevel).not.toBe(21);
});
