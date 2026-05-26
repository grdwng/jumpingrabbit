import { test, expect } from '@playwright/test';

/**
 * TDD Tests for Issue 1: GLB Reward Models Loading
 *
 * RED Phase: These tests define the expected behavior.
 * The tests should FAIL initially (models not loading),
 * then PASS when the fix is implemented.
 */
test.describe('Issue 1: GLB Reward Models Loading', () => {
  test('reward models should load before game becomes interactive', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`[ERROR] ${msg.text()}`);
      }
    });

    await page.goto('http://localhost:8080/index.html');

    // Wait for potential model loading
    await page.waitForTimeout(3000);

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
    console.log('Errors:', logs);

    // All three reward models must be loaded
    expect(rewardModels.crystal, 'crystal.glb should be loaded').toBe(true);
    expect(rewardModels.heart, 'heart.glb should be loaded').toBe(true);
    expect(rewardModels.golden, 'golden.glb should be loaded').toBe(true);
    expect(rewardModels.modelCount, 'should have at least 3 models loaded').toBeGreaterThanOrEqual(3);
  });

  test('reward models should not produce silent failures', async ({ page }) => {
    const errors = [];
    const loadLogs = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.text().includes('Failed to load reward')) {
        loadLogs.push(msg.text());
      }
    });

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(5000);

    // No error-level messages about reward loading
    expect(errors.filter(e => e.includes('reward') || e.includes('glb') || e.includes('GLB')),
      'should not have GLB loading errors').toHaveLength(0);

    // No "Failed to load" messages
    expect(loadLogs, 'should not have failed load messages').toHaveLength(0);

    // Verify models actually exist
    const modelCount = await page.evaluate(() => Object.keys(window.game?.rewardModels || {}).length);
    expect(modelCount, 'models should be loaded').toBeGreaterThanOrEqual(3);
  });

  test('blocks with rewards should display the reward models', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Find blocks that have rewards
    const blocksWithRewards = await page.evaluate(() => {
      const blocksWithReward = window.game.blocks.filter(b => b.userData.reward);
      return blocksWithReward.length;
    });

    console.log('Blocks with rewards:', blocksWithRewards);

    // At least some blocks should have rewards (80% of normal blocks)
    expect(blocksWithRewards, 'should have blocks with rewards assigned').toBeGreaterThan(0);

    // Check if any reward mesh is visible
    const rewardVisibility = await page.evaluate(() => {
      let visibleRewards = 0;
      window.game.blocks.forEach(block => {
        block.children.forEach(child => {
          if (child.userData.isReward && child.visible) {
            visibleRewards++;
          }
        });
      });
      return visibleRewards;
    });

    console.log('Visible rewards:', rewardVisibility);
    expect(rewardVisibility, 'visible rewards should be greater than 0').toBeGreaterThan(0);
  });
});