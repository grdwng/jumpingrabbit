import { test, expect } from '@playwright/test';

test.describe('Rabbit Positioning on Blocks', () => {
  test('rabbit stands ON TOP of starting block, not beside it', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(`Page Error: ${err.message}`));

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // Start the game
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Check rabbit Y position - should be ABOVE block top (3.6 + offset)
    // Rabbit should be visible on/near the starting block at screen center
    const rabbitScreenPos = await page.evaluate(() => {
      // Find player object and check its world position
      const player = window.game?.player;
      if (!player) return null;
      return {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z
      };
    });

    console.log('Rabbit position:', rabbitScreenPos);

    // Rabbit should be at X=0, Z=0 (center of screen)
    expect(rabbitScreenPos.x).toBe(0);
    expect(rabbitScreenPos.z).toBe(0);

    // Rabbit Y should be > blockConfig.height (3.6) since it stands ON TOP
    // With the fix, it should be around 4.4 (3.6 + 0.8 offset)
    expect(rabbitScreenPos.y).toBeGreaterThan(3.6);

    // No errors
    expect(errors.length).toBe(0);
  });

  test('rabbit returns to correct Y position after landing', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // Start the game
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Press arrow key to jump
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000); // Wait for jump animation

    // After landing, rabbit Y should still be > 3.6
    const rabbitY = await page.evaluate(() => window.game?.player?.position?.y);
    console.log('Rabbit Y after jump:', rabbitY);

    // Should return to position on top of block
    expect(rabbitY).toBeGreaterThan(3.6);
  });
});