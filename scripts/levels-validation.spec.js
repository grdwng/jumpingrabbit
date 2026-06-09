import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const BACKUP = path.join(ROOT, 'levels.json.bak');
const GAME_URL = 'http://localhost:8080/game.html';

test.beforeEach(() => fs.copyFileSync(LEVELS, BACKUP));
test.afterEach(() => {
 if (fs.existsSync(BACKUP)) {
 fs.copyFileSync(BACKUP, LEVELS);
 fs.unlinkSync(BACKUP);
 }
});

function mutate(targetLevelId, blockIdx, mutator) {
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 const lvl = data.levels.find((l) => l.id === targetLevelId);
 mutator(lvl.blocks[blockIdx]);
 fs.writeFileSync(LEVELS, JSON.stringify(data));
}

test('R1: shows error when block coordinate is not a number', async ({ page }) => {
 mutate(17,5, (b) => { b.x = 'abc'; });
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level 17 block 5: x must be a finite number \(got: "abc"\)/,
 { timeout:5000 }
 );
});

test('R2: shows error when block type is not in enum', async ({ page }) => {
 mutate(17,5, (b) => { b.type = 'foo'; });
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level 17 block 5: type must be one of start, normal, end \(got: "foo"\)/,
 { timeout:5000 }
 );
});

test('R3: shows error when start block is missing', async ({ page }) => {
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 const lvl = data.levels.find((l) => l.id ===17);
 lvl.blocks = lvl.blocks.filter((b) => b.type !== 'start');
 fs.writeFileSync(LEVELS, JSON.stringify(data));
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level 17: needs exactly 1 start block \(got 0\)/,
 { timeout:5000 }
 );
});

test('R4: shows error when start block is not at (0,0,0)', async ({ page }) => {
 mutate(17,0, (b) => { b.x =5; });
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level 17: start block must be at \(0,0,0\) \(got: 5,0,0\)/,
 { timeout:5000 }
 );
});

test('R5: shows error when level has fewer than6 blocks', async ({ page }) => {
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 const lvl = data.levels.find((l) => l.id ===17);
 lvl.blocks = lvl.blocks.slice(0,3);
 fs.writeFileSync(LEVELS, JSON.stringify(data));
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level 17: needs at least 6 blocks \(got 3\)/,
 { timeout:5000 }
 );
});

test('happy path: valid levels.json loads without error', async ({ page }) => {
 await page.goto(GAME_URL);
 await expect.poll(
 async () => page.evaluate(() => window.game?.levels?.length ??0),
 { timeout:5000 }
 ).toBe(30);
 await expect(page.locator('#error-message')).toBeHidden();
});

test('retry button recovers after fixing the file', async ({ page }) => {
 fs.unlinkSync(LEVELS);
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toBeVisible({ timeout:5000 });
 fs.copyFileSync(BACKUP, LEVELS);
 await page.click('#retry-button');
 await expect(page.locator('#error-message')).toBeHidden({ timeout:5000 });
});
