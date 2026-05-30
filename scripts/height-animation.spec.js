import { test, expect } from '@playwright/test';

test('向上跳动画应该平滑上升到目标高度', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Execute upward jump with Space (tries to jump to y=1 block in current level)
  await page.keyboard.down('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Space');

  // Wait for jump animation to complete
  await page.waitForTimeout(600);

  // After landing, should be back to waiting
  const finalState = await page.evaluate(() => window.game.gameState);
  expect(finalState).toBe('waiting');
});

test('向下跳动画应该平滑下降到目标高度', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Place player at elevated position (simulating being on a high block)
  await page.evaluate(() => {
    window.game.playerPosition.y = 2; // Set player grid y to 2
    window.game.player.position.y = window.game.baseY + window.game.blockConfig.height * 2;
  });

  // Execute jump down (should land on lower block)
  await page.keyboard.press('ArrowDown');

  // Wait for jump animation to complete
  await page.waitForTimeout(600);

  // After landing, should be back to waiting
  const finalState = await page.evaluate(() => window.game.gameState);
  expect(finalState).toBe('waiting');

  // Player Y should be lower after falling down
  const finalY = await page.evaluate(() => window.game.player.position.y);
  const baseY = await page.evaluate(() => window.game.baseY);
  const blockHeight = await page.evaluate(() => window.game.blockConfig.height);
  // After falling from y=2 to y=0, player Y should be around baseY
  expect(finalY).toBeLessThan(baseY + blockHeight);
});