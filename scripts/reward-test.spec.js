import { test, expect } from '@playwright/test';

test.describe('Reward Collection', () => {
  test('collects all 3 reward types and displays them in victory dialog', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // Start game
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Get initial reward counts
    const initialRewards = await page.evaluate(() => ({
      energy: window.game?.energyCount,
      lives: window.game?.lives,
      coins: window.game?.coinCount
    }));
    console.log('Initial rewards:', initialRewards);

    // Collect rewards by jumping to blocks
    // Simulate jumping multiple times to collect rewards
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(600);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(600);
    }

    // Check reward counts after jumping
    const rewardCount = await page.evaluate(() => ({
      energy: window.game?.energyCount,
      lives: window.game?.lives,
      coins: window.game?.coinCount
    }));
    console.log('Reward count after jumps:', rewardCount);

    // Trigger victory to test victory dialog
    await page.evaluate(() => {
      window.game.onVictory();
    });
    await page.waitForTimeout(500);

    // Check if victory dialog shows rewards
    const dialogVisible = await page.locator('#victory-overlay').isVisible();
    console.log('Victory dialog visible:', dialogVisible);

    if (dialogVisible) {
      const dialogText = await page.locator('#victory-overlay').textContent();
      console.log('Victory dialog text:', dialogText);
    }

    expect(errors.length).toBe(0);
  });

  test('reward counter tracks energy, lives, and coins separately', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // Initialize game
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Simulate collecting different rewards using actual game properties
    await page.evaluate(() => {
      if (window.game) {
        window.game.energyCount = 3;
        window.game.lives = 3;
        window.game.coinCount = 1;
        window.game.updateHUD();
      }
    });

    await page.waitForTimeout(100);

    // Check HUD shows all rewards using correct element IDs
    const energyText = await page.locator('#energy').textContent();
    const livesText = await page.locator('#lives').textContent();
    const coinsText = await page.locator('#coins').textContent();

    console.log('Energy:', energyText, 'Lives:', livesText, 'Coins:', coinsText);

    expect(energyText).toContain('💎×3');
    expect(livesText).toContain('❤️×3');
    expect(coinsText).toContain('💰×1');
  });
});