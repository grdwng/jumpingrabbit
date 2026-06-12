# Visual Levels Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- []`) syntax.

**Goal:** 加 `editor.html`(3D 预览 + 属性面板)+ `save-server.js`(PUT endpoint),让 Dad 在浏览器里可视化 review/edit 关卡,保存直写 `levels.json`。

**Architecture:** 单文件 `editor.html`(Three.js 简化场景 + 原生 HTML form + vanilla JS);最小 Express `save-server.js` 听 8081 端口接 PUT;editor 调 fetch PUT 保存;validator 内联复制(~30 行);包 dev 启动并行跑两 server。

**Tech Stack:** Three.js, Express 4, Playwright(E2E), Node fetch(API 测试)

**Spec:** `docs/superpowers/specs/2026-06-09-visual-levels-editor-design.md`

---

## Impact 分析

| 改动点 | 文件 | 受影响 |
|--------|------|--------|
| 新 editor.html | 根目录 | 仅 dev server 静态服务 |
| 新 save-server.js | scripts/ | 听 8081,无 cross-file import |
| 新 2 spec | scripts/ | 0 existing spec 改 |
| package.json | +`dev:editor` script | npm 启动命令扩展 |

**跨文件影响**:零。两个新文件都是独立的。Express 是 dev-only 依赖(`npm install --save-dev` 或已有的 node_modules 检查)。

---

## File Map

| File | Action | 备注 |
|------|--------|------|
| `editor.html` | Create | ~400 行,自包含 |
| `scripts/save-server.js` | Create | ~30 行 |
| `scripts/save-server.spec.js` | Create | API unit 测试 ~50 行 |
| `scripts/visual-editor.spec.js` | Create | E2E 测试 ~120 行 |
| `package.json` | Modify | +`"dev:editor": "node scripts/save-server.js & npx http-server . -p8080"` |
| `memory/MEMORY.md` | Modify | 追加 "2026-06-09: visual editor" 段 |
| 现有 60 spec | 不动 | 0 改动 |

**Express 检查**:先 `node -e "require('express')"` 确认已装,没有就 `npm install --save-dev express`。

---

## Task 1:写 RED 测试

**Files:**
- Create: `scripts/save-server.spec.js`(API unit)
- Create: `scripts/visual-editor.spec.js`(E2E)

- [] **Step 1.1: 写 save-server API 测试(Node 直接 fetch,不需要 browser)**

```js
// scripts/save-server.spec.js
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

test('PUT rejects non-JSON body', async () => {
 const res = await fetch(SAVE_URL, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: 'not json'
 });
 expect(res.status).toBe(400);
});
```

- [] **Step 1.2: 写 visual-editor E2E 测试(load + select + edit + save)**

```js
// scripts/visual-editor.spec.js
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const BACKUP = path.join(ROOT, 'levels.json.bak');
const EDITOR_URL = 'http://localhost:8080/editor.html';

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

test('AC2: switching level renders that level blocks', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '17');
 const count = await page.evaluate(() => window.editor.state.levels.find(l => l.id === 17).blocks.length);
 expect(count).toBeGreaterThan(0);
});

test('AC3: clicking a block selects it + populates property panel', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.evaluate(() => window.editor.selectBlock(0));
 await expect(page.locator('#prop-x')).not.toHaveValue('');
});

test('AC4: editing x input updates 3D block + marks dirty', async ({ page }) => {
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
 await page.locator('#prop-type').selectOption('foo');
 await page.locator('#save-button').click();
 await expect(page.locator('#error-message')).toContainText(/type must be one of/);
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 expect(data.levels[0].blocks[0].type).not.toBe('foo');
});

test('AC6: valid save writes to levels.json', async ({ page }) => {
 await page.goto(EDITOR_URL);
 await page.selectOption('#level-select', '1');
 await page.evaluate(() => window.editor.selectBlock(0));
 await page.locator('#prop-x').fill('10');
 await page.locator('#save-button').click();
 await expect(page.locator('#save-status')).toContainText(/saved/i, { timeout: 5000 });
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 expect(data.levels[0].blocks[0].x).toBe(10);
});

test('AC10: external bad levels.json shows validator error on load', async ({ page }) => {
 const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
 data.levels[0].blocks[0].x = 'abc';
 fs.writeFileSync(LEVELS, JSON.stringify(data));
 await page.goto(EDITOR_URL);
 await expect(page.locator('#error-message')).toContainText(/x must be a finite number/);
});
```

- [] **Step 1.3: 跑测试,确认 RED(全部失败,因为 save-server / editor.html 还没写)**

Run: `npx playwright test scripts/save-server.spec.js scripts/visual-editor.spec.js --reporter=line`
Expected: 大部分 fail(save-server 没启 → connection refused,editor.html 404)

---

## Task 2:实现 save-server(GREEN)

**Files:**
- Create: `scripts/save-server.js`
- Modify: `package.json`(+script)

- [] **Step 2.1: 检查 express 是否已装**

Run: `node -e "require('express')" && echo OK || echo MISSING`
如果 MISSING → `npm install --save-dev express`

- [] **Step 2.2: 写 save-server.js**

```js
// scripts/save-server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const ROOT = path.join(__dirname, '..');
const LEVELS = path.join(ROOT, 'levels.json');

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
 res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
 res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
 res.header('Access-Control-Allow-Headers', 'Content-Type');
 if (req.method === 'OPTIONS') return res.sendStatus(200);
 next();
});

app.get('/levels.json', (req, res) => {
 res.sendFile(LEVELS);
});

app.put('/levels.json', (req, res) => {
 if (!req.body || !req.body.levels) {
 return res.status(400).json({ error: 'body must have .levels' });
 }
 try {
 fs.writeFileSync(LEVELS, JSON.stringify(req.body, null, 2));
 res.json({ ok: true });
 } catch (e) {
 res.status(500).json({ error: e.message });
 }
});

app.listen(8081, () => console.log('save-server on :8081'));
```

- [] **Step 2.3: 跑 save-server 测试,确认 GREEN**

Run: `npx playwright test scripts/save-server.spec.js --reporter=line`
Expected:3 passed

---

## Task 3:实现 editor.html(GREEN)

**Files:**
- Create: `editor.html`

- [] **Step 3.1: 写 editor.html 骨架 + 3D 场景 + 选关 + 选块**

```html
<!doctype html>
<html><head>
 <meta charset="utf-8">
 <title>Visual Levels Editor</title>
 <style>/* layout per spec */</style>
</head><body>
 <header>
 <h1>Visual Levels Editor</h1>
 <select id="level-select"></select>
 <button id="save-button">Save</button>
 <button id="reset-button">Reset</button>
 <span id="save-status"></span>
 </header>
 <main>
 <div id="three-container"></div>
 <aside id="properties">
 <h3>Properties</h3>
 <div id="no-selection">Click a block in the 3D view</div>
 <div id="selection-panel" style="display:none">
 <label>x: <input id="prop-x" type="number"></label>
 <label>y: <input id="prop-y" type="number"></label>
 <label>z: <input id="prop-z" type="number"></label>
 <label>type:
 <select id="prop-type">
 <option value="start">start</option>
 <option value="normal">normal</option>
 <option value="end">end</option>
 </select>
 </label>
 <button id="delete-button">Delete</button>
 </div>
 <div id="stats"></div>
 </aside>
 </main>
 <div id="error-message" style="display:none; color:red; font-weight:bold; padding:10px; background:white; border:2px solid red;"></div>
 <script type="importmap">{
 "imports": {
 "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
 "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
 }
 }</script>
 <script type="module">
 // 1. fetch levels.json
 // 2. setup Three.js scene
 // 3. populate level-select dropdown
 // 4. selectBlock(idx): highlight + populate panel
 // 5. input change handlers: update state.levels + rerender + mark dirty
 // 6. Save button: validateLevels + fetch PUT
 // 7. validateLevels() 内联复制
 window.editor = { state: {}, selectBlock: (i) => { /* ... */ } };
 </script>
</body></html>
```

- [] **Step 3.2: 跑 E2E 测试,确认 GREEN**

Run: `npx playwright test scripts/visual-editor.spec.js --reporter=line`
Expected:7 passed

- [] **Step 3.3: 跑全 suite 验 0 回归**

Run: `npx playwright test --reporter=line 2>&1 | tail -5`
Expected:60 +10 = 70 passed,0 failed

---

## Task 4:手动验证 + commit + memory

- [] **Step 4.1: 启动 dev:editor**
- [] **Step 4.2: 浏览器打开 `http://localhost:8080/editor.html`,手动测:切关、点块、改坐标、保存**
- [] **Step 4.3: 4 个 commit:save-server spec + visual-editor spec + save-server.js + editor.html + memory**
- [] **Step 4.4: 任务树 #13 → completed**

---

## Verification

- [] `npx playwright test scripts/save-server.spec.js` → 3 passed
- [] `npx playwright test scripts/visual-editor.spec.js` → 7 passed
- [] `npx playwright test`(全 suite)→ 70 passed,0 回归
- [] 浏览器手动:切关、点块、改 x 实时移动、Save 写文件、点 retry 在 game 里看新数据
- [] 4 commits 干净落地

---

## Self-Review

| Spec AC | Plan Task |
|---------|-----------|
| AC1-AC2(load + level switch) | Task 1.2 + Task 3.1 |
| AC3-AC4(选 + 改同步) | Task 1.2 + Task 3.1 |
| AC5(validator 拦截) | Task 3.1(内联 validateLevels)|
| AC6(Save 写盘) | Task 2.2(PUT endpoint)+ Task 3.1(Save handler)|
| AC7(键盘移动) | Task 3.1(keydown handler)|
| AC8(Delete) | Task 3.1(delete button)|
| AC9(dirty confirm) | Task 3.1(level-select change handler)|
| AC10(外部坏 JSON 拦截) | Task 3.1(load 时 validateLevels + 显示)|
| AC11(0 回归) | Task 3.3 |

**风险**:
- Three.js via importmap 在 headless Playwright 可能慢或失败 → AC3 的 3D raycast 测试如果挂,改用 `window.editor.selectBlock(0)` 直接调 API(测试代码里已经这么写)
- Express 未装 → Step 2.1 显式检查 + 装
- save-server 在 spec 之前必须启动 → beforeAll 里 spawn + 重试

**Placeholder scan**:无 TBD / 模糊。
