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

test('shows error UI when levels.json is missing', async ({ page }) => {
  fs.unlinkSync(LEVELS);
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#error-message')).toContainText(/HTTP|Failed/, { timeout: 5000 });
});

test('shows error UI when JSON is malformed', async ({ page }) => {
  fs.writeFileSync(LEVELS, '{ "version": 1, "levels": [');
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/JSON|parse|Unexpected/, { timeout: 5000 });
});

test('shows error UI when level count is wrong', async ({ page }) => {
  const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  data.levels = data.levels.slice(0, 29);
  fs.writeFileSync(LEVELS, JSON.stringify(data));
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/30|levels/i, { timeout: 5000 });
});

test('retry button is visible on error', async ({ page }) => {
  fs.unlinkSync(LEVELS);
  await page.goto(GAME_URL);
  await expect(page.locator('#retry-button')).toBeVisible({ timeout: 5000 });
});

test('retry button can recover after fixing the file', async ({ page }) => {
  fs.unlinkSync(LEVELS);
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toBeVisible({ timeout: 5000 });
  // Restore file (afterEach will clean up properly)
  fs.copyFileSync(BACKUP, LEVELS);
  await page.click('#retry-button');
  // After retry, error should hide
  await expect(page.locator('#error-message')).toBeHidden({ timeout: 5000 });
});
