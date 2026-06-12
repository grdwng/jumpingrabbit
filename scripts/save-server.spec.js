import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const BACKUP = path.join(ROOT, 'levels.json.bak');
const SAVE_URL = 'http://localhost:8081/levels.json';

let server;
test.beforeAll(async () => {
 server = spawn('node', [path.join(ROOT, 'scripts/save-server.js')], {
 detached: false, stdio: 'ignore'
 });
 for (let i = 0; i < 30; i++) {
 try { const r = await fetch(SAVE_URL, { method: 'GET' }); if (r.status) break; } catch {}
 await new Promise(r => setTimeout(r, 200));
 }
 fs.copyFileSync(LEVELS, BACKUP);
});
test.afterAll(() => {
 if (fs.existsSync(BACKUP)) {
 fs.copyFileSync(BACKUP, LEVELS);
 fs.unlinkSync(BACKUP);
 }
 if (server) server.kill();
});

test('GET /levels.json returns current file', async () => {
 const res = await fetch(SAVE_URL);
 expect(res.status).toBe(200);
 const data = await res.json();
 expect(data.levels.length).toBe(30);
});

test('PUT /levels.json writes new content', async () => {
 const res = await fetch(SAVE_URL, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ version: 1, levels: [{ id: 99, name: 'test', blocks: [] }] })
 });
 expect(res.status).toBe(200);
 const written = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 expect(written.levels[0].id).toBe(99);
});

test('PUT rejects body without levels', async () => {
 const res = await fetch(SAVE_URL, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ foo: 'bar' })
 });
 expect(res.status).toBe(400);
});
