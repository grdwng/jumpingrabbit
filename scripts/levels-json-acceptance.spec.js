import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const GAME_HTML = path.join(ROOT, 'game.html');
const BASE = 'http://localhost:8080';

// AC1: levels.json file integrity
test('AC: levels.json exists, parses, has 30 levels with 10-17 blocks each', async () => {
  const stat = fs.statSync(LEVELS);
  expect(stat.size).toBeLessThan(50_000);
  const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  expect(data.version).toBe(1);
  expect(data.levels.length).toBe(30);
  for (const lvl of data.levels) {
    expect(lvl.id, `Level id`).toBeGreaterThanOrEqual(1);
    expect(lvl.id, `Level id`).toBeLessThanOrEqual(30);
    expect(typeof lvl.name).toBe('string');
    expect(lvl.name.length, `Level ${lvl.id} name`).toBeGreaterThan(0);
    expect(lvl.blocks.length, `Level ${lvl.id}`).toBeGreaterThanOrEqual(10);
    expect(lvl.blocks.length, `Level ${lvl.id}`).toBeLessThanOrEqual(17);
  }
});

// AC2: preload link exists in <head>
test('AC: <head> contains preload link for levels.json', async () => {
  const html = fs.readFileSync(GAME_HTML, 'utf8');
  expect(html).toMatch(/<link rel="preload" href="levels\.json" as="fetch"/);
});

// AC3: createLevels mechanism (async + uses fetch)
test('AC: createLevels is async and uses fetch', async () => {
  const html = fs.readFileSync(GAME_HTML, 'utf8');
  expect(html).toMatch(/async\s+createLevels\s*\(\s*\)/);
  expect(html).toMatch(/await\s+fetch\(['"]levels\.json['"]\)/);
});

// AC4: After fetch, game.levels populated + no error UI shown
test('AC: window.game.levels populated after fetch, no error UI on success', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  // Wait for async fetch + createLevels to resolve
  await expect.poll(
    async () => page.evaluate(() => window.game?.levels?.length ?? 0),
    { timeout: 5000 }
  ).toBe(30);
  // Error UI must NOT be visible on successful load
  await expect(page.locator('#error-message')).toBeHidden();
});

// AC5: Schema spot-checks
test('AC: levels.json schema matches runtime expectations', async () => {
  const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  const lvl1 = data.levels.find((l) => l.id === 1);
  expect(lvl1.blocks[0]).toMatchObject({ x: 0, y: 0, z: 0, type: 'start' });
  const end1 = lvl1.blocks.find((b) => b.type === 'end');
  expect(end1).toBeTruthy();

  const lvl16 = data.levels.find((l) => l.id === 16);
  expect(lvl16.blocks[0].custom).toBeTruthy();
  expect(typeof lvl16.blocks[0].custom.width).toBe('number');

  const lvl21 = data.levels.find((l) => l.id === 21);
  expect(lvl21.targetCoins).toBeGreaterThan(0);
  expect(lvl21.blocks[0].custom).toBeTruthy();
  expect(lvl21.blocks[0].custom.height).toBeGreaterThan(0);

  for (const lvl of data.levels) {
    for (const [idx, b] of lvl.blocks.entries()) {
      expect(typeof b.x, `Level ${lvl.id} block ${idx} x`).toBe('number');
      expect(typeof b.y, `Level ${lvl.id} block ${idx} y`).toBe('number');
      expect(typeof b.z, `Level ${lvl.id} block ${idx} z`).toBe('number');
      expect(['start', 'normal', 'end'], `Level ${lvl.id} block ${idx} type`).toContain(b.type);
    }
  }
});
