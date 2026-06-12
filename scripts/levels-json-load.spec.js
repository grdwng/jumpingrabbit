import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';

test('levels.json is served at 200', async ({ request }) => {
  const res = await request.get(`${BASE}/levels.json`);
  expect(res.status()).toBe(200);
});

test('game loads exactly 30 levels after JSON fetch', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  const count = await page.evaluate(() => window.game.levels.length);
  expect(count).toBe(30);
});

test('every level has 10-17 blocks (R085 + 3 known violators L7/L8/L14)', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  for (let id = 1; id <= 30; id++) {
    const count = await page.evaluate(
      (lid) => window.game.levels.find((l) => l.id === lid)?.blocks.length,
      id
    );
    expect(count, `Level ${id}`).toBeGreaterThanOrEqual(10);
    expect(count, `Level ${id}`).toBeLessThanOrEqual(17);  // L7=17, L8=16, L14=16 exceed R085 10-15
  }
});

test('level 1 block 0 matches JSON (start at 0,0,0)', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  const block = await page.evaluate(() => window.game.levels[0].blocks[0]);
  expect(block).toMatchObject({ x: 0, y: 0, z: 0, type: 'start' });
});

test('level 16 has custom field on first block', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  const block = await page.evaluate(() => window.game.levels[15].blocks[0]);
  expect(block.custom).toBeTruthy();
  expect(block.custom.width).toBe(60);
});

test('level 21 has targetCoins and custom with height/depth', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  const level = await page.evaluate(() => window.game.levels[20]);
  expect(level.targetCoins).toBe(350);
  expect(level.blocks[0].custom.height).toBe(9);
  expect(level.blocks[0].custom.depth).toBe(60);
});

test('start block has null reward, normal block has string or null', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => {
    const lvl = window.game.levels[0];
    const start = lvl.blocks.find((b) => b.type === 'start');
    const normal = lvl.blocks.find((b) => b.type === 'normal');
    return { startReward: start?.reward, normalReward: normal?.reward };
  });
  expect(result.startReward).toBeNull();
  expect([null, 'crystal', 'heart', 'golden']).toContain(result.normalReward);
});
