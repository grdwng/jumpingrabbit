import { test, expect } from '@playwright/test';

test('不同高度的方块应该渲染在不同Y位置', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Check blocks with y values - use baseY which is the static Y before floating animation
  const blocksWithY = await page.evaluate(() => {
    return window.game.blocks.map(b => ({
      y: b.userData.y,
      baseY: b.userData.baseY
    }));
  });

  // Group by y value
  const byY = {};
  blocksWithY.forEach(b => {
    if (!byY[b.y]) byY[b.y] = [];
    byY[b.y].push(b.baseY);
  });

  console.log('Blocks by Y level:', JSON.stringify(byY, null, 2));

  // All blocks at y=0 should have same baseY
  if (byY[0]) {
    const uniquePosY = [...new Set(byY[0])];
    expect(uniquePosY.length).toBe(1);
    expect(uniquePosY[0]).toBe(0);
  }

  // If there are blocks at y=1, they should be higher than y=0
  if (byY[0] && byY[1]) {
    expect(byY[1][0]).toBeGreaterThan(byY[0][0]);
  }
});