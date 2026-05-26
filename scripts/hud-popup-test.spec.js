import { test, expect } from '@playwright/test';

test.describe('HUD Display', () => {
  test('status bar shows all reward types - energy, lives, and coins', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // Start game
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set reward counts manually using actual game properties
    await page.evaluate(() => {
      window.game.energyCount = 3;
      window.game.lives = 3;
      window.game.coinCount = 2;
      window.game.updateHUD();
    });

    await page.waitForTimeout(100);

    // Check HUD shows energy, lives, and coins
    const energyText = await page.locator('#energy').textContent();
    const livesText = await page.locator('#lives').textContent();
    const coinsText = await page.locator('#coins').textContent();

    console.log('Energy:', energyText, 'Lives:', livesText, 'Coins:', coinsText);

    expect(energyText).toContain('💎×3');
    expect(livesText).toContain('❤️×3');
    expect(coinsText).toContain('💰×2');
  });
});

test.describe('Victory Popup Size', () => {
  test('victory popup text is large enough', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Trigger victory
    await page.evaluate(() => {
      window.game.onVictory();
    });
    await page.waitForTimeout(500);

    // Check popup is visible and has large text
    const popup = page.locator('#victory-overlay');
    await expect(popup).toBeVisible();

    const title = popup.locator('h2');
    const titleFontSize = await title.evaluate(el => window.getComputedStyle(el).fontSize);
    console.log('Title font size:', titleFontSize);

    // Title should be at least 4.5em (4.5 * 16 = 72px minimum)
    expect(parseFloat(titleFontSize)).toBeGreaterThanOrEqual(72);
  });
});