import { test, expect } from '@playwright/test';

test('y=2 blocks should be brighter than y=0 blocks', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Create blocks with different y values directly and check their lightness
  const result = await page.evaluate(() => {
    // Create blocks directly
    const block0 = window.game.createBlock(0, 0, 0, 'normal', null);
    const block1 = window.game.createBlock(0, 1, 0, 'normal', null);
    const block2 = window.game.createBlock(0, 2, 0, 'normal', null);

    const getLightness = (block) => {
      const mesh = block.children.find(c => c.isMesh);
      if (mesh && mesh.material && mesh.material.color) {
        const hsl = {};
        mesh.material.color.getHSL(hsl);
        return hsl.l;
      }
      return null;
    };

    return {
      y0_lightness: getLightness(block0),
      y1_lightness: getLightness(block1),
      y2_lightness: getLightness(block2),
      block0UserDataY: block0.userData.y,
      block1UserDataY: block1.userData.y,
      block2UserDataY: block2.userData.y,
    };
  });

  console.log('Block lightness by y:', result);

  // Verify y values are preserved
  expect(result.block0UserDataY).toBe(0);
  expect(result.block1UserDataY).toBe(1);
  expect(result.block2UserDataY).toBe(2);

  // y=2 should be brighter than y=0 (at least 10% more lightness)
  expect(result.y2_lightness).toBeGreaterThan(result.y0_lightness);

  // Verify brightness progression: each level should be progressively brighter
  expect(result.y1_lightness).toBeGreaterThan(result.y0_lightness);
  expect(result.y2_lightness).toBeGreaterThan(result.y1_lightness);
});

test('y=2 blocks should not cast shadow', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const block0 = window.game.createBlock(0, 0, 0, 'normal', null);
    const block1 = window.game.createBlock(0, 1, 0, 'normal', null);
    const block2 = window.game.createBlock(0, 2, 0, 'normal', null);

    const getCastShadow = (block) => {
      const mesh = block.children.find(c => c.isMesh);
      return mesh ? mesh.castShadow : null;
    };

    return {
      y0_castShadow: getCastShadow(block0),
      y1_castShadow: getCastShadow(block1),
      y2_castShadow: getCastShadow(block2),
    };
  });

  console.log('Block shadow by y:', result);

  // y=0 and y=1 should cast shadow, y=2 should not
  expect(result.y0_castShadow).toBe(true);
  expect(result.y1_castShadow).toBe(true);
  expect(result.y2_castShadow).toBe(false);
});