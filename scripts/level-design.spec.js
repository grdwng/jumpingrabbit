import { test, expect } from '@playwright/test';

test('beginner levels (1-15) should have 10-15 blocks each', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  for (let levelId = 1; levelId <= 15; levelId++) {
    const blockCount = await page.evaluate((id) => {
      const level = window.game.levels.find(l => l.id === id);
      return level ? level.blocks.length : 0;
    }, levelId);

    expect(blockCount, `Level ${levelId} should have 10-15 blocks`).toBeGreaterThanOrEqual(10);
    expect(blockCount, `Level ${levelId} should have 10-15 blocks`).toBeLessThanOrEqual(15);
  }
});

test('intermediate levels (16-30) should have 10-15 blocks each', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  for (let levelId = 16; levelId <= 30; levelId++) {
    const blockCount = await page.evaluate((id) => {
      const level = window.game.levels.find(l => l.id === id);
      return level ? level.blocks.length : 0;
    }, levelId);

    expect(blockCount, `Level ${levelId} should have 10-15 blocks`).toBeGreaterThanOrEqual(10);
    expect(blockCount, `Level ${levelId} should have 10-15 blocks`).toBeLessThanOrEqual(15);
  }
});

test('intermediate levels (16-30) should have 20-50% elevated blocks (y > 0)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  for (let levelId = 16; levelId <= 30; levelId++) {
    const heightStats = await page.evaluate((id) => {
      const level = window.game.levels.find(l => l.id === id);
      if (!level) return null;

      const totalBlocks = level.blocks.length;
      const elevatedBlocks = level.blocks.filter(b => (b.y || 0) > 0).length;
      const percentage = (elevatedBlocks / totalBlocks) * 100;

      return { totalBlocks, elevatedBlocks, percentage };
    }, levelId);

    expect(heightStats, `Level ${levelId} should exist`).not.toBeNull();
    expect(heightStats.percentage, `Level ${levelId} should have 20-50% elevated blocks`).toBeGreaterThanOrEqual(20);
    expect(heightStats.percentage, `Level ${levelId} should have 20-50% elevated blocks`).toBeLessThanOrEqual(50);
  }
});

test('each level should have start and end blocks', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  for (let levelId = 1; levelId <= 30; levelId++) {
    const blockTypes = await page.evaluate((id) => {
      const level = window.game.levels.find(l => l.id === id);
      if (!level) return { hasStart: false, hasEnd: false };
      const types = level.blocks.map(b => b.type);
      return { hasStart: types.includes('start'), hasEnd: types.includes('end') };
    }, levelId);

    expect(blockTypes.hasStart, `Level ${levelId} should have start block`).toBe(true);
    expect(blockTypes.hasEnd, `Level ${levelId} should have end block`).toBe(true);
  }
});