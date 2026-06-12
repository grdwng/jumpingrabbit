import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const BACKUP = path.join(ROOT, 'levels.json.bak');
const EDITOR_URL = 'http://localhost:8080/editor.html';
const SAVE_URL = 'http://localhost:8081/levels.json';

let server;
test.beforeAll(async () => {
 server = spawn('node', [path.join(ROOT, 'scripts/save-server.js')], { detached: false, stdio: 'ignore' });
 for (let i = 0; i < 30; i++) {
 try { const r = await fetch(SAVE_URL, { method: 'GET' }); if (r.status) break; } catch {}
 await new Promise(r => setTimeout(r, 200));
 }
});
test.afterAll(() => { if (server) server.kill(); });

test.beforeEach(() => fs.copyFileSync(LEVELS, BACKUP));
test.afterEach(() => {
 if (fs.existsSync(BACKUP)) {
 fs.copyFileSync(BACKUP, LEVELS);
 fs.unlinkSync(BACKUP);
 }
});

test('AC1: editor.html loads with 3D canvas + level dropdown', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await expect(page.locator('canvas')).toBeVisible();
 await expect(page.locator('#level-select')).toBeVisible();
});

test('AC2: switching level populates state.levels[17].blocks', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '17');
 const count = await page.evaluate(() => window.editor.state.levels.find(l => l.id === 17).blocks.length);
 expect(count).toBeGreaterThan(0);
});

test('AC3: selectBlock(0) populates property panel x input', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.evaluate(() => window.editor.selectBlock(0));
 const x = await page.locator('#prop-x').inputValue();
 expect(x).not.toBe('');
});

test('AC4: editing x input updates state + marks dirty', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.evaluate(() => window.editor.selectBlock(0));
 await page.locator('#prop-x').fill('10');
 const dirty = await page.evaluate(() => window.editor.state.dirty);
 expect(dirty).toBe(true);
 const x = await page.evaluate(() => window.editor.state.levels[0].blocks[0].x);
 expect(x).toBe(10);
});

test('AC5: save with invalid type is rejected by validator', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.evaluate(() => window.editor.selectBlock(0));
 // Set type to invalid value via DOM (since <select> only has 3 valid options)
 await page.evaluate(() => {
 document.getElementById('prop-type').value = 'foo';
 document.getElementById('prop-type').dispatchEvent(new Event('input'));
 });
 await page.locator('#save-button').click();
 await expect(page.locator('#error-message')).toContainText(/type must be one of/);
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 expect(data.levels[0].blocks[0].type).not.toBe('foo');
});

test('AC6: valid save writes to levels.json', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.waitForFunction(() => window.editor && window.editor.state.levels && window.editor.state.levels.length === 30);
 await page.evaluate(() => window.editor.selectBlock(1));
 await page.locator('#prop-x').fill('10');
 await page.locator('#save-button').click();
 await expect(page.locator('#save-status')).toHaveText(/^saved$/, { timeout: 5000 });
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 expect(data.levels[0].blocks[1].x).toBe(10);
});

test('AC10: external bad levels.json shows validator error on load', async ({ page }) => {
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 data.levels[0].blocks[0].x = 'abc';
 fs.writeFileSync(LEVELS, JSON.stringify(data));
 await page.goto(EDITOR_URL);
 await expect(page.locator('#error-message')).toContainText(/x must be a finite number/);
});

test('AC11: editing a block does not reset camera position', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.waitForFunction(() => window.editor && window.editor.state.levels && window.editor.state.levels.length === 30);
 await page.waitForTimeout(500); // settle initial frameAll
 await page.evaluate(() => window.editor.selectBlock(1));
 const before = await page.evaluate(() => window.editor.getCameraState());
 // Edit y coordinate (a normal block, not the start block)
 await page.locator('#prop-y').fill('5');
 await page.waitForTimeout(300);
 const after = await page.evaluate(() => window.editor.getCameraState());
 // Camera should not have moved - this was the bug (frameAll called on every prop change)
 expect(after.position.x).toBeCloseTo(before.position.x, 0);
 expect(after.position.y).toBeCloseTo(before.position.y, 0);
 expect(after.position.z).toBeCloseTo(before.position.z, 0);
 expect(after.target.x).toBeCloseTo(before.target.x, 0);
 expect(after.target.y).toBeCloseTo(before.target.y, 0);
 expect(after.target.z).toBeCloseTo(before.target.z, 0);
});
