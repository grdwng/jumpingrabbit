import { test, expect } from '@playwright/test';

test('方块应该能存储高度属性', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 检查方块数据结构是否有y属性 (存在userData中)
  const blockY = await page.evaluate(() => {
    const block = window.game.blocks[0];
    return block.userData.y !== undefined;
  });
  expect(blockY).toBe(true);
});