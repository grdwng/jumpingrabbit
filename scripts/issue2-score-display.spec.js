import { test, expect } from '@playwright/test';

/**
 * TDD Tests for Issue 2: Score display terminology
 *
 * RED Phase: These tests define the expected behavior.
 * - "本关得分" (level score) should show ONLY the level completion bonus (100)
 * - "累计积分" (accumulated points) should show coins × 20 ONLY (excludes level bonus)
 * - Victory dialog should show these two separate values
 */
test.describe('Issue 2: Score display terminology', () => {
  test('victory dialog shows level score separately from accumulated points', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set up: collected some coins, then complete level
    await page.evaluate(() => {
      window.game.coinCount = 5;  // 5 coins = 100 points from coins
      window.game.score = 0;       // Reset score
      window.game.totalScore = 0; // Reset accumulated
      window.game.updateHUD();
    });

    // Trigger victory
    await page.evaluate(() => {
      window.game.onVictory();
    });

    await page.waitForTimeout(1000);

    // Check victory dialog
    const dialogText = await page.locator('#victory-overlay').textContent();
    console.log('Victory dialog text:', dialogText);

    // Dialog should contain "本关得分" and "累计积分" (not just one score)
    expect(dialogText, 'dialog should show level score label').toMatch(/本关得分/);
    expect(dialogText, 'dialog should show accumulated points label').toMatch(/累计积分/);
  });

  test('level score shows only 100 for level completion', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set coins but no score yet
    await page.evaluate(() => {
      window.game.coinCount = 5;
      window.game.score = 0;
      window.game.totalScore = 0;
      window.game.updateHUD();
    });

    await page.evaluate(() => {
      window.game.onVictory();
    });

    await page.waitForTimeout(1000);

    // Find the paragraph containing "本关得分"
    const levelScoreText = await page.locator('#victory-overlay p').filter({ hasText: '本关得分' }).textContent();
    console.log('Level score text:', levelScoreText);

    // Should show exactly 100 (just the level bonus, not coins)
    expect(levelScoreText, 'level score should be exactly 100').toMatch(/100/);
    expect(levelScoreText, 'level score should NOT include coin calculation').not.toMatch(/5.*20|20.*5/);
  });

  test('accumulated points shows only coins × 20', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set 5 coins
    await page.evaluate(() => {
      window.game.coinCount = 5;
      window.game.score = 0;
      window.game.totalScore = 0;
      window.game.updateHUD();
    });

    await page.evaluate(() => {
      window.game.onVictory();
    });

    await page.waitForTimeout(1000);

    // Find the paragraph containing "累计积分"
    const accumulatedText = await page.locator('#victory-overlay p').filter({ hasText: '累计积分' }).textContent();
    console.log('Accumulated points text:', accumulatedText);

    // Should show 100 (5 coins × 20), NOT 200 (which would include level bonus)
    expect(accumulatedText, 'accumulated should be 100 (5 coins × 20)').toMatch(/100/);
    expect(accumulatedText, 'accumulated should NOT be 200 (which would include level bonus)').not.toMatch(/200/);
  });

  test('HUD displays accumulated points correctly', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Complete first level with 3 coins
    await page.evaluate(() => {
      window.game.coinCount = 3;
      window.game.score = 0;
      window.game.totalScore = 0;
      window.game.updateHUD();
    });

    await page.evaluate(() => {
      window.game.onVictory();
    });

    await page.waitForTimeout(1000);

    // Check HUD shows accumulated score = coins × 20 = 60
    const hudScore = await page.locator('#score').textContent();
    console.log('HUD score after level 1:', hudScore);
    expect(hudScore, 'HUD should show accumulated points from coins only').toMatch(/60/);

    // Continue to next level
    await page.click('button:has-text("进入下一关")');
    await page.waitForTimeout(500);

    // Complete second level with 4 coins
    await page.evaluate(() => {
      window.game.coinCount = 4;
      window.game.updateHUD();
    });

    await page.evaluate(() => {
      window.game.onVictory();
    });

    await page.waitForTimeout(1000);

    // HUD should show total = 60 (first level coins) + 80 (second level coins) = 140
    const hudScore2 = await page.locator('#score').textContent();
    console.log('HUD score after level 2:', hudScore2);
    expect(hudScore2, 'HUD should show combined accumulated points').toMatch(/140/);
  });
});