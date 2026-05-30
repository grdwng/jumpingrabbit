import { test, expect } from '@playwright/test';

test('中级应该有15关', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 检查关卡数量（21-35）
  const levelCount = await page.evaluate(() => {
    return window.game.levels.filter(l => l.id >= 21 && l.id <= 35).length;
  });
  expect(levelCount).toBe(15);
});

test('第21关应该有高度变化的方块', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(3000);

  // 直接加载第21关（不点击开始游戏避免长时间加载）
  const result = await page.evaluate(() => {
    window.game.loadLevel(21);
    const heights = window.game.blocks.map(b => b.userData.y);
    return {
      count: window.game.blocks.length,
      heights: heights,
      uniqueHeights: new Set(heights).size
    };
  });

  expect(result.count).toBeGreaterThan(0);
  expect(result.uniqueHeights).toBeGreaterThan(1);
});