import { test, expect } from '@playwright/test';

test.describe('Reward Models Loading', () => {
  test('loads crystal, heart, and golden reward models', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(5000);

    // Check if reward models are loaded
    const rewardModels = await page.evaluate(() => {
      return {
        crystal: !!window.game?.rewardModels?.crystal,
        heart: !!window.game?.rewardModels?.heart,
        golden: !!window.game?.rewardModels?.golden,
        modelCount: Object.keys(window.game?.rewardModels || {}).length
      };
    });

    console.log('Reward models:', rewardModels);
    console.log('Console logs:', logs.filter(l => l.includes('reward') || l.includes('Loaded')));

    expect(rewardModels.crystal).toBe(true);
    expect(rewardModels.heart).toBe(true);
    expect(rewardModels.golden).toBe(true);
    expect(rewardModels.modelCount).toBeGreaterThanOrEqual(3);
  });
});