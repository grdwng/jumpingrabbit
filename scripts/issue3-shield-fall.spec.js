import { test, expect } from '@playwright/test';

/**
 * TDD Tests for Issue 3: Shield consumption on fall causes app freeze
 *
 * RED Phase: These tests define the expected behavior.
 * When player falls with shield > 0:
 * - Shield should decrement by 1
 * - Level should reload
 * - Player position should reset
 * - Game state should be 'waiting'
 * - App should NOT freeze
 */
test.describe('Issue 3: Shield consumption on fall', () => {
  test('falling with shield consumes shield and reloads level', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // Start game
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set up state: 1 shield, 1 life, game in 'waiting' state
    await page.evaluate(() => {
      window.game.shieldCount = 1;
      window.game.lives = 1;
      window.game.gameState = 'waiting';
      window.game.updateHUD();
    });

    await page.waitForTimeout(500);

    // Simulate falling
    await page.evaluate(() => {
      window.game.onFall();
    });

    // Wait for level reload
    await page.waitForTimeout(1000);

    // Check no JS errors occurred
    expect(errors, 'no page errors should occur').toHaveLength(0);

    // Check shield was consumed
    const shieldCount = await page.evaluate(() => window.game.shieldCount);
    console.log('Shield count after fall:', shieldCount);
    expect(shieldCount, 'shield should be decremented').toBe(0);

    // Check game state is 'waiting' (level reloaded and ready)
    const gameState = await page.evaluate(() => window.game.gameState);
    console.log('Game state after fall:', gameState);
    expect(gameState, 'game state should be waiting').toBe('waiting');
  });

  test('app should not freeze when falling with shield', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set shield and trigger fall multiple times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.game.shieldCount = 1;
        window.game.lives = 3;
        window.game.updateHUD();
      });

      await page.evaluate(() => {
        window.game.onFall();
      });

      // App should remain responsive - wait a bit and check
      await page.waitForTimeout(500);

      // Try to interact with game (simulate keypress)
      const canInteract = await page.evaluate(() => {
        return window.game.gameState === 'waiting' || window.game.gameState === 'gameover';
      });

      expect(canInteract, `iteration ${i}: app should remain interactive`).toBe(true);
    }

    // No errors should have occurred
    expect(errors, 'no errors during multiple falls').toHaveLength(0);
  });

  test('falling with no shield triggers game over', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set 0 shields, 1 life
    await page.evaluate(() => {
      window.game.shieldCount = 0;
      window.game.lives = 1;
      window.game.updateHUD();
    });

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.game.onFall();
    });

    await page.waitForTimeout(1000);

    // Should be game over
    const gameState = await page.evaluate(() => window.game.gameState);
    console.log('Game state after fall with no shield:', gameState);
    expect(gameState, 'game state should be gameover').toBe('gameover');

    // No errors
    expect(errors, 'no errors').toHaveLength(0);
  });

  test('player position resets correctly after shield consumption', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // Set shield
    await page.evaluate(() => {
      window.game.shieldCount = 1;
      window.game.updateHUD();
    });

    await page.waitForTimeout(500);

    // Get initial player position
    const initialPos = await page.evaluate(() => {
      return {
        x: window.game.player.position.x,
        y: window.game.player.position.y,
        z: window.game.player.position.z,
        worldOffsetX: window.game.worldOffset.x,
        worldOffsetZ: window.game.worldOffset.z
      };
    });
    console.log('Initial player position:', initialPos);

    // Trigger fall
    await page.evaluate(() => {
      window.game.onFall();
    });

    await page.waitForTimeout(1000);

    // Get new player position
    const newPos = await page.evaluate(() => {
      return {
        x: window.game.player.position.x,
        y: window.game.player.position.y,
        z: window.game.player.position.z,
        worldOffsetX: window.game.worldOffset.x,
        worldOffsetZ: window.game.worldOffset.z
      };
    });
    console.log('Player position after shield reload:', newPos);

    // Player should be back at origin (0, baseY, 0)
    expect(newPos.x, 'player X should be at start position').toBe(0);
    expect(newPos.z, 'player Z should be at start position').toBe(0);
    expect(newPos.worldOffsetX, 'worldOffset X should be 0').toBe(0);
    expect(newPos.worldOffsetZ, 'worldOffset Z should be 0').toBe(0);
  });
});