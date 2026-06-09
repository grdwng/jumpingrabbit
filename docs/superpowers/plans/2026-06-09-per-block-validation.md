# Per-Block Levels Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** 加 `validateLevels(data)` 函数 + 在 `createLevels()` 里调一次,让 Dad改 `levels.json`改坏任何字段时启动时立刻看到具体错误,不让坏数据溜进 three.js。

**Architecture:**纯手写校验器,~60 行,放在 `game.html` IIFE 内(跟 `showError`/`showRetryButton` 同层)。在 `createLevels()` 的 `.length ===30`之后、`.map()`之前调用一次。失败 throw → 进现有 `start()` 的 catch →复用现有 `showError + showRetryButton`,零新 UI。

**Tech Stack:** Vanilla JS(无新依赖)、Playwright(E2E 测试沿用现有 dev server `localhost:8080`)

**Spec:** `docs/superpowers/specs/2026-06-09-per-block-validation-design.md`

---

## Impact 分析

`game.html` 未在 CodeGraph索引内(`.codegraph/` 只索引 .js/.ts)。手动 grep确认改动局部性:

|改动点 | 文件:行 | 受影响范围 |
|--------|---------|-----------|
| 新增 `validateLevels(data)` 函数 | `game.html` (新增,放 `showRetryButton`之后) | 仅 IIFE内部 |
| `createLevels()` 加1 行调用 | `game.html:807-827` | 仅 createLevels内部 |
| 新建 spec 文件 | `scripts/levels-validation.spec.js` | 仅测试 |

**跨文件影响**:零。新函数不导出、不被其他文件引用。

---

## File Map

| File | Action |备注 |
|------|--------|------|
| `game.html` | Modify | +62 行(validator)+2 行(createLevels 内调用 + import注释) |
| `scripts/levels-validation.spec.js` | Create | +120 行(7 个 RED 测试)|
| `memory/MEMORY.md` | Modify |追加 "2026-06-09: per-block validator"段 |
|现有21 个 spec.js | 不动 |0改动 |

---

## Task1:写 RED 测试(spec全部失败)

**Files:**
- Create: `scripts/levels-validation.spec.js`

- [] **Step1:写7 个测试,故意改坏 levels.json各种字段**

复用现有 `levels-json-errors.spec.js` 的 backup/restore pattern (`fs.copyFileSync(LEVELS, BACKUP)` in `beforeEach`,restore in `afterEach`)。

```js
// scripts/levels-validation.spec.js
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

// Helper: load + mutate one block on a target level
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
 /Level17 block5: x must be a finite number \(got: "abc"\)/,
 { timeout:5000 }
 );
});

test('R2: shows error when block type is not in enum', async ({ page }) => {
 mutate(17,5, (b) => { b.type = 'foo'; });
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level17 block5: type must be one of start, normal, end \(got: "foo"\)/,
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
 /Level17: needs exactly1 start block \(got0\)/,
 { timeout:5000 }
 );
});

test('R4: shows error when start block is not at (0,0,0)', async ({ page }) => {
 mutate(17,0, (b) => { b.x =5; });
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toContainText(
 /Level17: start block must be at \(0,0,0\) \(got:5,0,0\)/,
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
 /Level17: needs at least6 blocks \(got3\)/,
 { timeout:5000 }
 );
});

test('happy path: valid levels.json loads without error', async ({ page }) => {
 await page.goto(GAME_URL);
 // wait for async fetch + createLevels + validateLevels to resolve
 await expect.poll(
 async () => page.evaluate(() => window.game?.levels?.length ??0),
 { timeout:5000 }
 ).toBe(30);
 await expect(page.locator('#error-message')).toBeHidden();
});

test('retry button recovers after fixing the file', async ({ page }) => {
 mutate(17,5, (b) => { b.x = 'abc'; });
 await page.goto(GAME_URL);
 await expect(page.locator('#error-message')).toBeVisible({ timeout:5000 });
 // Restore + click retry
 fs.copyFileSync(BACKUP, LEVELS);
 await page.click('#retry-button');
 await expect(page.locator('#error-message')).toBeHidden({ timeout:5000 });
});
```

- [] **Step2:跑测试,确认 RED(7 个全失败,因为 validator还没写)**

Run: `npx playwright test scripts/levels-validation.spec.js`
Expected:7 failed
- R1-R5失败:error message不会出现(validator 不存在,createLevels正常通过,游戏正常加载)
- happy path失败:首次跑游戏正常加载,但因为 validator 没接,逻辑上也"应该 pass" — 这是 RED阶段的边缘情况,只要 R1-R5失败就算 RED
- retry失败:同上

如果只有1-2 个失败(说明现有可能已经部分校验了)→调 spec顺序或加更多断言。

- [] **Step3: 不 commit(等 Task2一起)**

---

## Task2:实现 validator(GREEN)

**Files:**
- Modify: `game.html`(新增函数 + 修改 `createLevels` 加1 行调用)

- [] **Step1: 在 `game.html` 的 `showRetryButton()`之后加 `validateLevels(data)` 函数**

打开 `game.html`,找到第2072 行(`showRetryButton`末尾的 `}`之后)。在该 `}`之后、第2074 行 `window.game = new Game()`之前,插入:

```js
// Validate levels.json per-block schema (2026-06-09)
function validateLevels(data) {
 const TYPES = ['start', 'normal', 'end'];
 const MIN_BLOCKS =6;
 for (const lvl of data.levels) {
 if (!Array.isArray(lvl.blocks)) {
 throw new Error(`Level ${lvl.id}: blocks must be an array`);
 }
 if (lvl.blocks.length < MIN_BLOCKS) {
 throw new Error(`Level ${lvl.id}: needs at least ${MIN_BLOCKS} blocks (got ${lvl.blocks.length})`);
 }
 let startCount =0, endCount =0;
 lvl.blocks.forEach((b, idx) => {
 for (const k of ['x', 'y', 'z']) {
 if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) {
 throw new Error(`Level ${lvl.id} block ${idx}: ${k} must be a finite number (got: ${JSON.stringify(b[k])})`);
 }
 }
 if (!TYPES.includes(b.type)) {
 throw new Error(`Level ${lvl.id} block ${idx}: type must be one of ${TYPES.join(', ')} (got: ${JSON.stringify(b.type)})`);
 }
 if (b.type === 'start') startCount++;
 if (b.type === 'end') endCount++;
 });
 if (startCount !==1) throw new Error(`Level ${lvl.id}: needs exactly1 start block (got ${startCount})`);
 if (endCount !==1) throw new Error(`Level ${lvl.id}: needs exactly1 end block (got ${endCount})`);
 const start = lvl.blocks.find((b) => b.type === 'start');
 if (start.x !==0 || start.y !==0 || start.z !==0) {
 throw new Error(`Level ${lvl.id}: start block must be at (0,0,0) (got: ${start.x},${start.y},${start.z})`);
 }
 }
}
```

- [] **Step2: 在 `createLevels()` 里 map 前调用 validator**

打开 `game.html:807-827`,在 `return data.levels.map(...)`之前加一行 `validateLevels(data);`:

改前(第813-814 行之间):
```js
if (!data.levels || data.levels.length !==30) {
 throw new Error(`Expected30 levels, got ${data.levels?.length ||0}`);
}
return data.levels.map(level => ({
```

改后:
```js
if (!data.levels || data.levels.length !==30) {
 throw new Error(`Expected30 levels, got ${data.levels?.length ||0}`);
}
validateLevels(data); // ← NEW: per-block schema (2026-06-09)
return data.levels.map(level => ({
```

- [] **Step3:跑新 spec,确认 GREEN(7 个全过)**

Run: `npx playwright test scripts/levels-validation.spec.js`
Expected:7 passed

如果失败 → 看 error message格式跟 spec AC 是否完全匹配(尤其 R1-R5 的 "(got: ...)" 部分)。

- [] **Step4:跑全部 spec,确认0回归**

Run: `npx playwright test`
Expected:21 existing +7 new =28 passed

如果 existing失败 → 大概率是 happy path 测试时机问题(`window.game.levels`初始化比预期慢),加 `await expect.poll(...).toBe(30)`替换 `waitForTimeout`。

---

## Task3:手动验证 +写 memory + commit

**Files:**
- Modify: `memory/MEMORY.md`

- [] **Step1:手动验证(Electron启动 app,故意改坏看 UI)**

Run: `./start.sh`(后台启动 Electron)
手动:
1. 主菜单正常显示关卡列表 → happy path ✓
2.终端改 `levels.json` level17 第5块 `x` 为 `"abc"` → 主菜单显示红框 `"Level17 block5: x must be a finite number (got: \"abc\")"` + 重试按钮 ✓
3.改回正确数据 → 点重试按钮 →错误隐藏,关卡列表显示 ✓
4. 关 Electron

- [] **Step2:追加 memory段**

在 `memory/MEMORY.md`末尾(2026-06-09 关卡数据外置化段之后)追加:

```markdown
##2026-06-09: per-block validator 加固 ✅

**触发**: Dad确认 "可以直接 review/edit levels.json" —担心改坏字段没人拦。
**Spec**: `docs/superpowers/specs/2026-06-09-per-block-validation-design.md`
**Plan**: `docs/superpowers/plans/2026-06-09-per-block-validation.md`

**改动**(增量 ~64 行):
- `game.html`: 新增 `validateLevels(data)` IIFE 内函数(~60 行),`createLevels()` 在 `.length ===30`之后、`.map()`之前调用一次
- `scripts/levels-validation.spec.js`: 新建,7 个 RED 测试(5规则 + happy path + retry)

**5 条规则**:
- R1: x/y/z必须是 finite number
- R2: type ∈ {start, normal, end}
- R3: 每关恰好1 个 start +1 个 end
- R4: start必须在 (0,0,0)
- R5: 每关 ≥6块

**错误流**(零新 UI):throw → 进 `start()` catch →复用现有 `showError + showRetryButton`
**错误格式**: `"Level N block i: field rule (got: actual)"` — 可定位到 JSON 行

**测试**:21 existing +7 new =28 passed

**YAGNI拒绝**:
- ajv/zod schema库(项目历史决策)
-路径可达性校验(Δx=±2) —留 v2,跟2026-06-07 silent no-op bug 同类
- `custom` 内层校验、`targetCoins`范围、`name`字符串内容
-拆独立 `.js` 文件

**Dad 工作流改进**:改坏字段 → 游戏启动时红框立刻报"哪关哪块哪个字段" + retry按钮,不用靠 console调试。
```

- [] **Step3:提交(分两个 commit,按项目惯例)**

```bash
git add scripts/levels-validation.spec.js
git commit -m "test(levels): add7 RED tests for per-block validation"

git add game.html
git commit -m "feat(levels): add validateLevels + per-block schema check"

git add memory/MEMORY.md
git commit -m "docs(memory): per-block validator feature"
```

---

## Verification

整体验收:

- [] `npx playwright test scripts/levels-validation.spec.js` →7 passed
- [] `npx playwright test`(全 suite)→28 passed(21 existing +7 new),0回归
- [] Electron手动:故意改坏字段 → 红框 + 具体错误 + retry按钮显示;改回 + 点 retry →恢复正常
- [] happy path:合法 levels.json → 主菜单正常显示30 关列表
- [] git log:3 个新 commit(2 feat +1 docs),无中间临时 commit

---

## Self-Review

对照 spec:

| Spec AC | Plan Task |
|---------|-----------|
| AC1: `validateLevels` 在 IIFE 内 | Task2 Step1 ✓ |
| AC2: `createLevels` 在 map 前调用 | Task2 Step2 ✓ |
| AC3: x 非数字 → 具体错误 | Task1 Step1 (R1 test) ✓ |
| AC4: type非法 → 具体错误 | Task1 Step1 (R2 test) ✓ |
| AC5:缺 start → 具体错误 | Task1 Step1 (R3 test) ✓ |
| AC6: start 不在原点 → 具体错误 | Task1 Step1 (R4 test) ✓ |
| AC7: <6块 → 具体错误 | Task1 Step1 (R5 test) ✓ |
| AC8: retry恢复 | Task1 Step1 (retry test) + Task3 Step1手动 ✓ |
| AC9:21 existing pass | Task2 Step4 ✓ |
| AC10:7 new pass | Task2 Step3 ✓ |

**Placeholder scan**: 无 TBD / "implement later" / "similar to..."

**Type consistency**: 单文件 `game.html`,无跨文件符号依赖。`validateLevels`跟 `showError`同一作用域,共用 `Error`消息字符串构造方式。
