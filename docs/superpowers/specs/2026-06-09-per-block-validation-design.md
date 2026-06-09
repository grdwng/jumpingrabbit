# Per-Block Levels Validation — Design Spec

**Date**:2026-06-09
**Status**: Approved — Pending Implementation
**Author**: CC (with Dad)
**Related**: `2026-06-08-levels-data-externalization-design.md` (parent spec)

---

## Overview

`levels.json` was externalized on2026-06-08 so Dad could review/edit block data directly. The current `createLevels()` only validates **HTTP status, JSON syntax, and total level count** — per-block field errors silently propagate to three.js and crash or behave weirdly.

This spec adds a **per-block schema validator** that runs at startup, surfaces field-level errors in the existing error UI with a "重试" button, so every reasonable edit mistake is caught before the game tries to render.

**Success criteria**: editing `levels.json` with any of5 common field errors produces a clear, locatable error message in <1s, with the retry button able to recover after fix.

---

## CodeGraph上下文

### 模块边界

`game.html` 当前未进入 CodeGraph索引(`.codegraph/`索引的是 JS/TS 文件,`game.html` 是 mixed HTML+JS 单文件)。手动 grep出的关键位置:

|位置 |职责 |
|------|------|
| `game.html:807-827` | `async createLevels()` — fetch +校验(仅 length)+ map |
| `game.html:815-827` | assignReward + CUSTOM_DEFAULT + blocks.map |
| `game.html:2055-2072` | `showError(msg)` + `showRetryButton()` 全局 UI辅助 |
| `game.html:2074-2075` | `window.game = new Game(); window.game.start()`入口 |
| `scripts/levels-json-errors.spec.js` |现有5 个错误路径测试(HTTP/JSON/length/retry可见/retry恢复) |
| `scripts/levels-json-acceptance.spec.js` |5 个 acceptance criteria(已经隐含"字段类型对"的检查 AC5) |

###关键符号清单(可能复用的)

|现有符号 |位置 |用途 |
|---------|------|------|
| `showError(msg)` | `game.html:2056` | **直接复用** — 显示具体错误消息 |
| `showRetryButton()` | `game.html:2060` | **直接复用** — retry走 `window.game.retryLoad()` |
| `window.game.retryLoad()` | (commit `9776856` 加的) |重新 fetch + createLevels |
| `levels-json-errors.spec.js` 的 backup/restore pattern | `scripts/levels-json-errors.spec.js:5-16` | **复用** — 新 spec 用同一套 fixture 管理 |

### 重名/冲突检查

```
codegraph_search query="validateLevels" →0 结果 ✅ 无冲突
```

新函数名定为 `validateLevels(data)`,作用域为 `game.html` IIFE内部(跟 `showError`/`showRetryButton`同一层)。

---

## Goals & Non-Goals

### Goals

- G1:启动时对 `levels.json` 每个 block 的字段做5 项校验,任何一项失败 throw明确错误
- G2:错误消息格式:`"Level {N} block {idx}: {field} {rule} (got: {actual})"` — 可定位到具体行
- G3: validator失败走现有 `showError + showRetryButton`路径,不新做 UI
- G4: retry按钮恢复逻辑不变(2026-06-09 已修)
- G5:现有21 个 spec零回归;新增7 个 spec 全 GREEN

### Non-Goals

- NG1: **路径可达性校验**(Δx=±2 且 Δz=±2)— 这是路径逻辑层,不是字段层,单独 v2 task
- NG2:引入 ajv / zod / 其他 schema库 — 项目历史决策 YAGNI,手写足够
- NG3:校验 `custom`字段内层(width/height/depth 等)— 数据已经能跑通,过度校验
- NG4:校验 `targetCoins` 取值范围 — `>0`已经在 acceptance spec覆盖
- NG5:校验 `name`字符串内容(去重、长度上限)—纯展示字段,出错不影响游戏
- NG6: 把 validator拆到独立 `.js` 文件 — game.html 单文件架构,拆出去要新加 `<script>`加载,over-engineering for ~60 行

---

## Design

###架构

```
async createLevels() {
 const res = await fetch('levels.json');
 if (!res.ok) throw new Error(`Failed to load levels: HTTP ${res.status}`);
 const data = await res.json(); // ← JSON syntax错在这里爆
 if (!data.levels || data.levels.length !==30) {
 throw new Error(`Expected30 levels, got ${data.levels?.length ||0}`);
 }
 validateLevels(data); // ← NEW: per-block校验
 return data.levels.map(...); // ← map 不变
}
```

`validateLevels(data)`:

```js
/**
 * Validate levels.json data against per-block schema.
 * Throws on first violation with specific "Level N block i: field rule (got: value)" message.
 * @param {{levels: Array<{id: number, name: string, blocks: Array<{x,y,z,type}>}>}} data
 */
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
 // R1: coords must be numbers
 for (const k of ['x', 'y', 'z']) {
 if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) {
 throw new Error(`Level ${lvl.id} block ${idx}: ${k} must be a finite number (got: ${JSON.stringify(b[k])})`);
 }
 }
 // R2: type in enum
 if (!TYPES.includes(b.type)) {
 throw new Error(`Level ${lvl.id} block ${idx}: type must be one of ${TYPES.join(', ')} (got: ${JSON.stringify(b.type)})`);
 }
 if (b.type === 'start') startCount++;
 if (b.type === 'end') endCount++;
 });
 // R3: each level needs exactly1 start +1 end
 if (startCount !==1) throw new Error(`Level ${lvl.id}: needs exactly1 start block (got ${startCount})`);
 if (endCount !==1) throw new Error(`Level ${lvl.id}: needs exactly1 end block (got ${endCount})`);
 // R4: start block at (0,0,0)
 const start = lvl.blocks.find(b => b.type === 'start');
 if (start.x !==0 || start.y !==0 || start.z !==0) {
 throw new Error(`Level ${lvl.id}: start block must be at (0,0,0) (got: ${start.x},${start.y},${start.z})`);
 }
 }
}
```

###5 条规则(优先级)

| # |规则 |错误消息示例 |
|---|------|------------|
| R1 | `x`, `y`, `z`必须是 finite number | `"Level17 block5: x must be a finite number (got: \"abc\")"` |
| R2 | `type` ∈ {start, normal, end} | `"Level17 block5: type must be one of start, normal, end (got: \"foo\")"` |
| R3 | 每关恰好1 个 start +1 个 end | `"Level17: needs exactly1 start block (got0)"` |
| R4 | start块必须在 (0,0,0) | `"Level17: start block must be at (0,0,0) (got:2,0,0)"` |
| R5 | 每关 ≥6块 | `"Level17: needs at least6 blocks (got3)"` |

R1→R2→R5 在循环内,R3→R4 在循环后(需要完整扫一遍才能判断)。

###错误流

```
createLevels() throw
 ↓
window.game.start() 中的 catch (已经存在,会调 showError + showRetryButton)
 ↓
showError(msg) → #error-message 红框显示具体消息
 ↓
showRetryButton() → #retry-button 可点 → retryLoad()重新跑 createLevels
```

无需新 UI。错误消息自然显示在主菜单中央,retry按钮在下方。

### 与现有 acceptance spec 的关系

`levels-json-acceptance.spec.js` AC5已经在做字段类型断言(`expect(typeof b.x).toBe('number')` 等)。validator 上线后,**AC5还能继续 pass**(因为现有 levels.json本身就是合法的)。新增的 spec 是**破坏性测试**(故意改坏字段,验证 validator拦得住)。

###数字常量

| 常量 | 值 |理由 |
|------|---|------|
| `MIN_BLOCKS` |6 | 当前30 关 blocks数量最少是10(R085范围),6 是**绝对下限**,给 Dad 编辑留余量,不卡现有数据 |
| `TYPES` | `['start', 'normal', 'end']` |跟现有 `createBlock`接受的 type 一致 |

---

## File Plan

| File | Action | Purpose |
|------|--------|---------|
| `game.html` | Modify | 加 `validateLevels(data)` 函数(在 `showRetryButton`之前或之后都行);在 `createLevels()` 里 map 前调用 |
| `scripts/levels-validation.spec.js` | Create | 新7 个 RED 测试:5 个规则各1 个 +1 个 valid pass +1 个 retry恢复 |
| `docs/superpowers/plans/2026-06-09-per-block-validation.md` | Create |实施计划 |

**改动量估算**:
- `game.html`: +60 行(validator)+2 行(createLevels调一次)
- 新 spec: +~120 行
-旧 spec:0改动

---

## Acceptance Criteria

- AC1: `game.html` 含 `function validateLevels(data)`,作用域在 IIFE内部(不是全局污染)
- AC2: `createLevels()` 在 `.map()` 前调用 `validateLevels(data)`,失败 throw
- AC3:故意把 `levels.json` level17 第5块的 `x`改成 `"abc"`,浏览器主菜单显示错误 `"Level17 block5: x must be a finite number (got: \"abc\")"`
- AC4:故意改 `type: "foo"`,显示 `"Level17 block5: type must be one of start, normal, end (got: \"foo\")"`
- AC5:故意删掉 start块,显示 `"Level17: needs exactly1 start block (got0)"`
- AC6:故意改 start块的 `x:5`,显示 `"Level17: start block must be at (0,0,0) (got:5,0,0)"`
- AC7:故意删到3块,显示 `"Level17: needs at least6 blocks (got3)"`
- AC8:改回正确数据,点 retry按钮 →错误隐藏 + 关卡列表显示
- AC9:现有21 spec全部 pass(回归)
- AC10: 新7 spec全部 pass

---

## Open Questions

无。所有决策点(手写 vs ajv /5 条 vs6 条 /复用现有 UI)已在需求阶段跟 Dad 对齐。
