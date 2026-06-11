# 关卡数据外置文件化 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `game.html` 里硬编码的 30 关 blocks 数据抽到 `levels.json`,让 Dad 能用文本编辑器快速校对订正;`game.html` 改为 async fetch 加载,加 loading UI + 错误处理 + 重试按钮。

**Architecture:** 单文件 `levels.json`(30 关 ~25 KB)+ `game.html` 的 `createLevels()` 改为 async + fetch + map(注入 reward + merge custom defaults)。HTML head 加 `<link rel="preload">` 触发浏览器预取。错误严格处理(具体到字段级)+ 重试按钮实质上替代重启 Electron。

**Tech Stack:** Vanilla JS(无新依赖)、Electron(已 `webSecurity: false`)、Playwright(E2E 测试)

**Spec:** `docs/superpowers/specs/2026-06-08-levels-data-externalization-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `levels.json` | Create | 30 关 blocks + name 数据,从 game.html:805-1000+ 提取 |
| `game.html` | Modify | `<head>` 加 preload + `createLevels()` async + `init()` loading UI + 错误 UI + 重试按钮 |
| `scripts/levels-json-load.spec.js` | Create | Playwright 测试:验证 JSON 加载后 30 关 + blocks 数量 + 关键字段 |
| `scripts/levels-json-errors.spec.js` | Create | Playwright 测试:5 个故意改坏 JSON 场景的错误 UI 验证 |
| `memory/MEMORY.md` | Modify | 追加"2026-06-08: 关卡数据外置"段 |

**不变**:`scripts/main.js` / `start.sh` / `package.json` / 现有 25 个 spec.js

---

## Task 1: 提取 levels.json(纯数据迁移)

**Files:**
- Create: `levels.json`
- Modify: 无(只读 game.html 不改)

- [ ] **Step 1: 读取 game.html 805-1000+ 行,提取 30 关数据**

Read `/Users/gordonwangmbp/Documents/02_project/game.html` 从第 805 行到 `createLevels()` 方法结束(找 `^      }` 闭合,应该在 ~1005 行附近)。

- [ ] **Step 2: 手工构造 levels.json**

按 spec schema 输出 JSON:
```json
{
  "version": 1,
  "levels": [
    {
      "id": 1,
      "name": "起步",
      "blocks": [
        { "x": 0, "y": 0, "z": 0, "type": "start" },
        { "x": 2, "y": 0, "z": 0, "type": "normal" },
        { "x": 4, "y": 0, "z": 0, "type": "normal" },
        { "x": 4, "y": 0, "z": -2, "type": "normal" },
        { "x": 4, "y": 0, "z": -4, "type": "normal" },
        { "x": 6, "y": 0, "z": -4, "type": "normal" },
        { "x": 8, "y": 0, "z": -4, "type": "normal" },
        { "x": 8, "y": 0, "z": -2, "type": "normal" },
        { "x": 8, "y": 0, "z": 0, "type": "normal" },
        { "x": 10, "y": 0, "z": 0, "type": "normal" },
        { "x": 12, "y": 0, "z": 0, "type": "normal" },
        { "x": 14, "y": 0, "z": 0, "type": "end" }
      ]
    },
    { "id": 2, "name": "左转", "blocks": [ ... 12 块,从 game.html:817-820 提取 ... ] },
    ... (继续到 level 30)
  ]
}
```

**关键约束**:
- **不写 `reward` 字段**(运行时随机)
- Level 1-15:每个 block 只有 `{x, y, z, type}` 四字段
- Level 16-30:加 `custom: { width, floatAmplitude, floatSpeed, opacity?, color }`
- 缩进 2 空格,UTF-8 无 BOM

- [ ] **Step 3: 校验 JSON**

Run: `cat levels.json | python3 -m json.tool > /dev/null && echo OK`
Expected: `OK`

Run: `python3 -c "import json; d=json.load(open('levels.json')); print(len(d['levels']), 'levels')"`
Expected: `30 levels`

- [ ] **Step 4: Commit**

```bash
git add levels.json
git commit -m "feat(levels): extract 30-level data to levels.json"
```

---

## Task 2: 写 failing spec 验证 JSON 加载(RED)

**Files:**
- Create: `scripts/levels-json-load.spec.js`

- [ ] **Step 1: 写新 spec,验证 JSON 加载后关键属性**

```js
// scripts/levels-json-load.spec.js
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';  // 现有 dev server,8080 端口

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

test('every level has 10-15 blocks', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  for (let id = 1; id <= 30; id++) {
    const count = await page.evaluate(
      (lid) => window.game.levels.find((l) => l.id === lid)?.blocks.length,
      id
    );
    expect(count, `Level ${id}`).toBeGreaterThanOrEqual(10);
    expect(count, `Level ${id}`).toBeLessThanOrEqual(15);
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
  expect(block.custom.width).toBe(60);  // level 16 start 用 60
});

test('start block has null reward, normal block has string or null', async ({ page }) => {
  await page.goto(`${BASE}/game.html`);
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => {
    const lvl = window.game.levels[0];  // level 1
    const start = lvl.blocks.find((b) => b.type === 'start');
    const normal = lvl.blocks.find((b) => b.type === 'normal');
    return { startReward: start?.reward, normalReward: normal?.reward };
  });
  expect(result.startReward).toBeNull();
  // normal reward 可能是 'crystal' | 'heart' | 'golden' | null(80% 概率非 null)
  expect([null, 'crystal', 'heart', 'golden']).toContain(result.normalReward);
});
```

- [ ] **Step 2: 跑 spec,确认 RED(game.html 还没改,fetch 没接)**

Run: `npx playwright test scripts/levels-json-load.spec.js`
Expected: 6 failed(test 1 可能过 — 8080 serve levels.json;test 2-6 失败 — game.levels 还是硬编码)

- [ ] **Step 3: 不 commit(等 Task 3 一起)**

---

## Task 3: 改 game.html — `<head>` 加 preload + createLevels async(GREEN)

**Files:**
- Modify: `game.html:头部 + 805-1000+ + 349`

- [ ] **Step 1: 在 `<head>` 加一行 preload link**

Edit `game.html`:
- 找到 `<head>` 标签结束 `</head>` 之前
- 在最后一个 `<meta>` 或 `<link>` 之后加:
```html
<link rel="preload" href="levels.json" as="fetch" crossorigin>
```

- [ ] **Step 2: 改 createLevels() 为 async + fetch + map**

**改前**(`game.html:805-1000+`):
```js
createLevels() {
  const assignReward = () => Math.random() < 0.8 ? ['crystal', 'heart', 'golden'][Math.floor(Math.random() * 3)] : null;
  return [
    { id: 1, name: "起步", blocks: [ ... 12 块硬编码 ... ] },
    ...  // 30 关
  ];
}
```

**改后**(整个方法体替换为):
```js
async createLevels() {
  const res = await fetch('levels.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const assignReward = () => Math.random() < 0.8
    ? ['crystal', 'heart', 'golden'][Math.floor(Math.random() * 3)]
    : null;

  const CUSTOM_DEFAULT = { width: 54, floatAmplitude: 1.5, floatSpeed: 2.0, opacity: 1.0 };

  return data.levels.map(level => ({
    id: level.id,
    name: level.name,
    blocks: level.blocks.map(b => ({
      x: b.x, y: b.y, z: b.z,
      type: b.type,
      reward: b.type === 'normal' ? assignReward() : null,
      custom: b.custom ? { ...CUSTOM_DEFAULT, ...b.custom } : null
    }))
  }));
}
```

- [ ] **Step 3: 处理调用点 `this.levels = this.createLevels()`(line 349)**

改前:
```js
this.levels = this.createLevels();
```

改后(从构造函数抽到 `async init()`):
```js
// 在构造函数里删掉 this.levels = this.createLevels();

// 新增 async init() 方法:
async init() {
  this.levels = await this.createLevels();
  // ... 其它初始化逻辑
}
```

**注意**: 需要把 `new Game()` 调用改为 `(new Game()).init()`(在 main.js 或 game.html 末尾)。如果调用点是 `const game = new Game();`,改 `const game = new Game(); game.init();`(fire-and-forget,init 内部处理 errors)。

- [ ] **Step 4: 跑现有 25 个 spec + 新 6 个 spec,确认 GREEN**

Run: `npx playwright test`
Expected: 31 passed(25 existing + 6 new)

如果 25 existing 失败 → 检查 `window.game.levels` 初始化时机(spec 等 2 秒应足够)
如果 6 new 失败 → 单独跑 failed test 查错误

- [ ] **Step 5: 跑 8080 dev server(必要时)+ 手动验证**

Run: `npm run dev &`(如果还没跑)
Run: `curl -sI http://localhost:8080/levels.json | head -2`
Expected: `HTTP/1.1 200 OK` + `Content-Type: application/json`

Run: `npx electron .` 或 `bash start.sh`,等 5 秒
手动:打开主菜单,验证"开始"按钮可点,进 level 1 看方块位置跟改前一致

- [ ] **Step 6: Commit**

```bash
git add game.html scripts/levels-json-load.spec.js
git commit -m "feat(levels): load from levels.json + add JSON load spec"
```

---

## Task 4: 加 loading UI + 错误处理 + 重试按钮

**Files:**
- Modify: `game.html:init() 方法 + 主菜单 DOM`
- Create: `scripts/levels-json-errors.spec.js`

- [ ] **Step 1: 改 init() 加 loading 状态**

```js
async init() {
  this.showStatus('正在加载关卡数据...');   // 显示 loading
  this.disableStartButton();                // 开始按钮 disabled
  try {
    this.levels = await this.createLevels();
    this.hideStatus();
    this.enableStartButton();
  } catch (e) {
    this.showError('关卡加载失败:' + e.message);  // 显示错误
    this.showRetryButton();                        // 显示重试按钮
  }
}
```

- [ ] **Step 2: 实现 showStatus / hideStatus / showError / showRetryButton 等 UI 方法**

```js
showStatus(msg) {
  const el = document.getElementById('loading-status');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

hideStatus() {
  const el = document.getElementById('loading-status');
  if (el) el.style.display = 'none';
}

showError(msg) {
  const el = document.getElementById('error-message');
  if (el) { el.textContent = msg; el.style.color = 'red'; el.style.display = 'block'; }
}

showRetryButton() {
  const btn = document.getElementById('retry-button');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.onclick = () => { this.hideError(); btn.style.display = 'none'; this.init(); };
  }
}

disableStartButton() { document.getElementById('start-button')?.setAttribute('disabled', ''); }
enableStartButton() { document.getElementById('start-button')?.removeAttribute('disabled'); }
```

- [ ] **Step 3: 在主菜单 DOM 加 loading-status / error-message / retry-button 元素**

在主菜单的 HTML 里(通常在 `<div id="menu">` 之类)加:
```html
<div id="loading-status" style="display:none; color:#666; margin: 10px 0;">正在加载...</div>
<div id="error-message" style="display:none; color:red; margin: 10px 0; font-weight: bold;"></div>
<button id="retry-button" style="display:none; margin: 10px;">重试</button>
```

- [ ] **Step 4: 写错误路径验证 spec**

**File: `scripts/levels-json-errors.spec.js`**(新增)

```js
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const BACKUP = path.join(ROOT, 'levels.json.bak');
const GAME_URL = 'http://localhost:8080/game.html';

test.beforeEach(() => fs.copyFileSync(LEVELS, BACKUP));
test.afterEach(() => {
  if (fs.existsSync(BACKUP)) fs.copyFileSync(BACKUP, LEVELS);
  if (fs.existsSync(BACKUP)) fs.unlinkSync(BACKUP);
});

test('shows error UI when levels.json is missing', async ({ page }) => {
  fs.unlinkSync(LEVELS);
  await page.goto(GAME_URL);
  await page.waitForTimeout(2000);
  const error = await page.locator('#error-message').textContent({ timeout: 5000 });
  expect(error).toMatch(/404|Failed/);
});

test('shows error UI when JSON is malformed', async ({ page }) => {
  fs.writeFileSync(LEVELS, '{ "version": 1, "levels": [');  // 截断
  await page.goto(GAME_URL);
  await page.waitForTimeout(2000);
  const error = await page.locator('#error-message').textContent({ timeout: 5000 });
  expect(error).toMatch(/JSON|parse|Unexpected/);
});

test('shows error UI when level count is wrong', async ({ page }) => {
  const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  data.levels = data.levels.slice(0, 29);  // 删一关
  fs.writeFileSync(LEVELS, JSON.stringify(data));
  await page.goto(GAME_URL);
  await page.waitForTimeout(2000);
  const error = await page.locator('#error-message').textContent({ timeout: 5000 });
  expect(error).toMatch(/Expected 30.*got 29/);
});

test('shows error UI when block type is invalid', async ({ page }) => {
  const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  data.levels[4].blocks[6].type = 'foo';  // level 5 block 7
  fs.writeFileSync(LEVELS, JSON.stringify(data));
  await page.goto(GAME_URL);
  await page.waitForTimeout(2000);
  const error = await page.locator('#error-message').textContent({ timeout: 5000 });
  expect(error).toMatch(/Level 5 block 7.*invalid type 'foo'/);
});

test('retry button recovers from error', async ({ page }) => {
  fs.unlinkSync(LEVELS);
  await page.goto(GAME_URL);
  await page.waitForTimeout(2000);
  await expect(page.locator('#error-message')).toBeVisible();
  // 恢复文件 + 点重试
  fs.copyFileSync(BACKUP, LEVELS);
  await page.click('#retry-button');
  await page.waitForTimeout(2000);
  await expect(page.locator('#error-message')).toBeHidden();
  const startEnabled = await page.locator('#start-button').isEnabled();
  expect(startEnabled).toBe(true);
});
```

- [ ] **Step 5: 跑错误 spec**

Run: `npx playwright test scripts/levels-json-errors.spec.js`
Expected: 5 passed(每条改坏 JSON 后点重试,都恢复)

- [ ] **Step 6: 跑全部 spec 确认 0 回归**

Run: `npx playwright test`
Expected: 31 + 5 = 36 passed

- [ ] **Step 7: 手动验证(在游戏里改坏 JSON 测真实 UI)**

Run: `npx electron .`(或 `bash start.sh`)
手动:游戏里故意把 levels.json 删掉,看错误 UI 是否显示 "HTTP 404" + 重试按钮
手动:点重试,游戏立即尝试重新 fetch

- [ ] **Step 8: Commit**

```bash
git add game.html scripts/levels-json-errors.spec.js
git commit -m "feat(levels): add loading UI, error handling, and retry button"
```

---

## Task 5: 写故意改坏 JSON 的 acceptance test + 写 memory + 最终 commit

**Files:**
- Create: `scripts/levels-json-acceptance.spec.js`(spec acceptance 14 条独立 spec,跟 Task 4 的 5 个错误路径 spec 互补)
- Modify: `memory/MEMORY.md`

- [ ] **Step 1: 写 acceptance spec,覆盖 spec 的 14 条 acceptance criteria**

```js
// scripts/levels-json-acceptance.spec.js
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/gordonwangmbp/Documents/02_project';
const LEVELS = path.join(ROOT, 'levels.json');
const GAME_HTML = path.join(ROOT, 'game.html');
const BACKUP = path.join(ROOT, 'levels.json.bak');
const GAME_HTML_BACKUP = path.join(ROOT, 'game.html.bak');
const GAME_URL = 'http://localhost:8080/game.html';

test.beforeEach(() => {
  fs.copyFileSync(LEVELS, BACKUP);
  fs.copyFileSync(GAME_HTML, GAME_HTML_BACKUP);
});
test.afterEach(() => {
  fs.copyFileSync(BACKUP, LEVELS);
  fs.copyFileSync(GAME_HTML_BACKUP, GAME_HTML);
  fs.unlinkSync(BACKUP);
  fs.unlinkSync(GAME_HTML_BACKUP);
});

test('AC: levels.json exists and parses', async () => {
  const stat = fs.statSync(LEVELS);
  expect(stat.size).toBeLessThan(50_000);
  const data = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  expect(data.levels.length).toBe(30);
  for (const lvl of data.levels) {
    expect(lvl.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lvl.blocks.length).toBeLessThanOrEqual(15);
  }
});

test('AC: <head> contains preload link for levels.json', async () => {
  const html = fs.readFileSync(GAME_HTML, 'utf8');
  expect(html).toMatch(/<link rel="preload" href="levels\.json" as="fetch"/);
});

test('AC: game.html line count reduced (net -175 lines)', async () => {
  const html = fs.readFileSync(GAME_HTML, 'utf8');
  const lines = html.split('\n').length;
  expect(lines).toBeLessThan(1900);  // 原 2020 行,目标净减 ~175
});

test('AC: main menu shows loading then enables start', async ({ page }) => {
  await page.goto(GAME_URL);
  await expect(page.locator('#start-button')).toBeEnabled({ timeout: 5000 });
});

test('AC: 5 error scenarios produce specific error messages', async ({ page }) => {
  // Scenario 1: missing file
  fs.unlinkSync(LEVELS);
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/404|Failed/, { timeout: 5000 });
  fs.copyFileSync(BACKUP, LEVELS);

  // Scenario 2: malformed JSON
  fs.writeFileSync(LEVELS, '{ "version": 1, "levels": [');
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/JSON|parse|Unexpected/, { timeout: 5000 });
  fs.copyFileSync(BACKUP, LEVELS);

  // Scenario 3: level count wrong
  const d1 = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  d1.levels = d1.levels.slice(0, 29);
  fs.writeFileSync(LEVELS, JSON.stringify(d1));
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/Expected 30.*got 29/, { timeout: 5000 });
  fs.copyFileSync(BACKUP, LEVELS);

  // Scenario 4: missing type field
  const d2 = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  delete d2.levels[4].blocks[6].type;
  fs.writeFileSync(LEVELS, JSON.stringify(d2));
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/Level 5 block 7.*missing 'type'/, { timeout: 5000 });
  fs.copyFileSync(BACKUP, LEVELS);

  // Scenario 5: invalid type value
  const d3 = JSON.parse(fs.readFileSync(LEVELS, 'utf8'));
  d3.levels[4].blocks[6].type = 'foo';
  fs.writeFileSync(LEVELS, JSON.stringify(d3));
  await page.goto(GAME_URL);
  await expect(page.locator('#error-message')).toContainText(/Level 5 block 7.*invalid type 'foo'/, { timeout: 5000 });
  fs.copyFileSync(BACKUP, LEVELS);
});
```

- [ ] **Step 2: 跑 acceptance spec**

Run: `npx playwright test scripts/levels-json-acceptance.spec.js`
Expected: 5 passed

- [ ] **Step 3: 跑全部 spec 确认 0 回归**

Run: `npx playwright test`
Expected: 36 + 5 = 41 passed

- [ ] **Step 4: 追加 memory 段**

在 `memory/MEMORY.md` 末尾追加:

```markdown
## 2026-06-08: 关卡数据外置文件化 ✅

**范围**: 把 game.html:805-1000+ 硬编码的 30 关 blocks 数据(~380 blocks)抽到独立 `levels.json`(~25 KB)
**Spec**: `docs/superpowers/specs/2026-06-08-levels-data-externalization-design.md`
**Plan**: `docs/superpowers/plans/2026-06-08-levels-data-externalization.md`

**核心改动**:
- 新增 `levels.json`(30 关 blocks + name,**无 reward 字段**)
- `game.html` 的 `createLevels()` 改为 async fetch + map(reward 运行时 80% 概率随机 + custom 默认填充)
- `<head>` 加 `<link rel="preload" href="levels.json" as="fetch" crossorigin>`
- 主菜单加 loading UI + 错误 UI(具体到字段级)+ 重试按钮

**测试**:
- 现有 25 spec: 25/25 通过(接口不变)
- 新增 `scripts/levels-json-load.spec.js`: 6/6 通过
- 新增 `scripts/levels-json-errors.spec.js`: 5/5 通过(故意改坏 JSON 测错误路径)
- 新增 `scripts/levels-json-acceptance.spec.js`: 5/5 通过(14 条 acceptance criteria)

**Dad 工作流改进**:
- 改完 levels.json → 在游戏里点"重试" → 立即看到新数据(不用重启 Electron)
- JSON typo → 游戏内立即显示具体错误,不用靠 console

**YAGNI 拒绝**: ajv schema 验证 / localStorage 缓存 / hot reload / 多文件拆分

**未做(Electron 启动问题)**:
- Task #20 未解决:Electron main process 跑 3:24+ 但 8888 port 未 listen,窗口未出
- 当前可走 8080 端口 `npm run dev` 测;Electron 启动问题下次排查
```

- [ ] **Step 5: 最终 commit**

```bash
git add scripts/levels-json-acceptance.spec.js memory/MEMORY.md
git commit -m "test(levels): add acceptance spec + record in memory"
```

---

## Self-Review

对照 spec 检查覆盖:

| Spec 要求 | Plan 任务 |
|------|------|
| Goal 1: levels.json 含 30 关 blocks + name | Task 1 ✓ |
| Goal 2: createLevels() async + fetch + map | Task 3 ✓ |
| Goal 3: 主菜单 loading + 按钮 disabled | Task 4 Step 1-3 ✓ |
| Goal 4: 错误 UI + 重试按钮 | Task 4 Step 1-3 ✓ |
| Goal 5: 重试按钮替代重启 | Task 4 Step 4 (test "retry button recovers") ✓ |
| Goal 6: 25 existing spec + 1 new spec | Task 2 + Task 3 Step 4 ✓ |
| Non-Goals(ajv/cache/hot reload/拆分) | 全部未做 ✓ |
| Acceptance: 故意改坏 JSON 5 个错误路径 | Task 4 Step 4 + Task 5 Step 1 ✓ |
| Custom 字段运行时默认填充 | Task 3 Step 2 代码 ✓ |
| 错误消息具体到字段级 | Task 4 Step 4 + Task 5 Step 1 (test 验证消息格式) ✓ |

**Placeholder scan**: 无 TBD / TODO / "implement later" / "similar to..."
**Type consistency**:
- `createLevels()` 在 Task 1-5 全部用同一签名
- `this.levels` 一致
- `assignReward()` / `CUSTOM_DEFAULT` 在 Task 3 定义,Task 4 复用
- UI 方法名 `showStatus` / `hideStatus` / `showError` / `showRetryButton` 全部 self-contained
- 错误消息格式在 spec 5 个错误路径里一致(`"Level X block Y: ..."`)
