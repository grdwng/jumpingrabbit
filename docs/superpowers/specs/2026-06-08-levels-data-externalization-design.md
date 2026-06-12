# 关卡数据外置文件化 — Design Spec

**Date**: 2026-06-08
**Status**: Draft — Pending Implementation
**Author**: CC (与 Dad 协作)
**Trigger**: Dad 2026-06-08 需求"各个关卡的方块位置坐标,序号,奖励我们是否可以单独生成数据文件来存放,这样我就可以另行检查订正方块的位置了"

---

## Overview

将 `game.html` 中硬编码的 30 关 blocks 数据(共 ~380 blocks,行 805-1000+)抽取到独立的 `levels.json` 数据文件,让 Dad 可以用文本编辑器快速校对和订正方块位置。运行时由 game.html 通过 `fetch('levels.json')` 加载。`assignReward()` 仍保持 80% 概率随机分配,reward 字段**不写入** JSON。

**Success criteria**:
1. Dad 能用 VS Code / 任何文本编辑器打开 `levels.json` 直接看到 30 关所有 block 坐标
2. 改完 JSON 后,**点游戏内"重试"按钮**立即看到新数据(不用重启 Electron)
3. 现有 25 个 spec 全部通过(接口不变)
4. 启动时间增加 < 100ms,体感无明显差异
5. JSON typo(字段缺失/类型错)立即在游戏内显示具体错误,不静默崩溃

---

## CodeGraph 上下文

> **本项目 CodeGraph 索引范围限制**:`.codegraph/` 索引了 `scripts/*.spec.js`(27 files / 64 nodes),**不索引** `game.html` 单文件(2020 行,过大)。所以本任务的"模块边界"基于 `grep` + `Read` 手动探索。

### 模块边界(基于 grep 探索)

| 文件 / 行 | 职责 | 涉及符号 |
|------|------|------|
| `game.html:349` | Game 构造时调用 `this.createLevels()` | `this.levels` |
| `game.html:805-1000+` | `createLevels()` 方法本体,200 行硬编码 | `createLevels()`, `assignReward()` 闭包 |
| `game.html` 其它位 | 读 `this.levels[i].blocks[j]` 做渲染/碰撞 | 散在 50+ 处的 `level.blocks[].x/y/z/type/reward/custom` |
| `scripts/main.js:6` | `app.commandLine.appendSwitch('no-sandbox')` | 必需,否则 file:// fetch 受限 |
| `scripts/main.js:21` | `webSecurity: false` | 必需,允许 file:// 协议 fetch 跨文件 |
| `scripts/*.spec.js` | 通过 `window.game.levels` 读关卡数据 | 不关心数据来源 |

### 关键符号清单(可能复用)

| 现有符号 | 位置 | 用途 |
|------|------|------|
| `assignReward()` | `game.html:807`(闭包) | 80% 概率随机生成 reward;**保留原逻辑,迁到新 `createLevels()` 内部** |
| `this.levels` | `game.html:349` 实例属性 | 运行时关卡数组;**接口不变** |
| `CUSTOM_DEFAULTS` | `game.html` 隐式默认(width=54, floatAmplitude=1.5, floatSpeed=2.0, opacity=1.0) | JSON 没写 custom 字段时用 runtime 默认填充 |

### 重名/冲突检查

- ✅ `levels.json` 文件名不与现有文件冲突(项目根只有 `game.html`, `index.html`, `package.json` 等)
- ✅ 字段名 `id`, `name`, `blocks`, `x`, `y`, `z`, `type`, `reward`, `custom` 均为普通英文,无与 JS 保留字冲突
- ⚠️ `REDESIGNED_LEVELS` 在 `scripts/level23-27-zigzag.spec.js:9` 是个常量,值为 `[23,24,25,26,27]` — 这是测试用常量,与 JSON 顶层 `levels` 数组**不冲突**(作用域隔离)

---

## Goals & Non-Goals

### Goals
- [ ] Goal 1: `levels.json` 包含 30 关所有 blocks + name,无 reward 字段
- [ ] Goal 2: `game.html` 的 `createLevels()` 改为 async + fetch + map(reward 注入 + custom 默认填充)
- [ ] Goal 3: 主菜单显示 "Loading..." 直到 fetch 完,完成后 enable 开始按钮
- [ ] Goal 4: JSON 错误(404/parse/schema)显示具体错误 UI + 重试按钮
- [ ] Goal 5: 重试按钮实质上替代重启 Electron(Dad 工作流)
- [ ] Goal 6: 现有 25 个 spec 全部通过,新增 1 个 spec 验证 JSON 加载

### Non-Goals
- ❌ Hot reload(运行时监听文件变化) — 改完手动点"重试"够用
- ❌ JSON Schema 验证(ajv / zod) — YAGNI,等真出错再升级
- ❌ 版本迁移机制 — 只 v1,未来要改直接换文件
- ❌ localStorage 缓存 — 违反"启动加载"原则
- ❌ 拆分多文件(每关一个 .json) — 单文件 30 关 ~25 KB 易管理
- ❌ 拆分 position / reward / custom 多文件 — 单文件职责清晰
- ❌ YAML / TOML / TS module 格式 — 选 JSON(已确认)
- ❌ 把 reward 写死到 JSON — 保持运行时随机(已确认)

---

## Design

### 架构(5 个文件,2 改 2 增 1 不变)

```
02_project/
├── game.html              (改: createLevels() 从 200 行硬编码 → 15 行 fetch+map)
├── levels.json            (新: 30 关 blocks + name,~25 KB)
├── docs/superpowers/specs/2026-06-08-levels-data-externalization-design.md  (新: 本 spec)
├── memory/MEMORY.md       (追加实施记录段)
└── scripts/, start.sh, package.json, ...  (不变)
```

### JSON Schema

```json
{
  "version": 1,
  "levels": [
    { "id": 1, "name": "起步", "blocks": [
      { "x": 0, "y": 0, "z": 0, "type": "start" },
      { "x": 2, "y": 0, "z": 0, "type": "normal" },
      ...
      { "x": 14, "y": 0, "z": 0, "type": "end" }
    ]},
    ...
  ]
}
```

**字段约定**:

| 字段 | 类型 | 必需 | 默认 | 说明 |
|------|------|------|------|------|
| `version` | int | ✅ | — | 顶层 schema 版本 |
| `id` | int 1-30 | ✅ | — | 关卡 ID |
| `name` | string UTF-8 | ✅ | — | 中文关卡名 |
| `blocks[].x/y/z` | int | ✅ | — | 网格坐标,允许负数(范围 -20 ~ +20) |
| `blocks[].type` | enum | ✅ | — | `'start'` / `'normal'` / `'end'` |
| `blocks[].custom` | object | ❌ | (运行时默认) | 仅 level 16-30 出现 |
| `custom.width` | int | ❌ | 54 | 渲染宽度 |
| `custom.floatAmplitude` | float | ❌ | 1.5 | 浮动振幅 |
| `custom.floatSpeed` | float | ❌ | 2.0 | 浮动速度 |
| `custom.opacity` | float 0-1 | ❌ | 1.0 | 透明度 |
| `custom.color` | hex int | ❌ | 随机 | 0xRRGGBB |

**关键: 不存 `reward` 字段**(运行时 `assignReward()` 80% 概率随机分配)

### 加载机制(数据流)

```
[Electron win.loadFile('game.html')]
     ↓
[HTML 解析]
     ├─ <link rel="preload" href="levels.json" as="fetch" crossorigin>  预取
     └─ <script> 内嵌 game.js 执行
          ↓
          [new Game()]
               ↓
               this.levels = await this.createLevels()   ← 改成 async
                    ├─ fetch('levels.json')             (~3-10ms)
                    ├─ response.json()                  (~1-3ms)
                    └─ map() → 注入 reward + merge custom defaults
          ↓
     [主菜单 ready,开始按钮 enable]
     ↓
[用户点"开始"] → [正常游戏流程,不再 fetch]
```

### `createLevels()` 改写(关键代码)

```js
// game.html 改后:
async createLevels() {
  const res = await fetch('levels.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // 保留原 80% 概率随机 reward 逻辑
  const assignReward = () => Math.random() < 0.8
    ? ['crystal', 'heart', 'golden'][Math.floor(Math.random() * 3)]
    : null;

  // custom 字段缺失时用 runtime 默认
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

```html
<!-- game.html <head> 加一行 -->
<link rel="preload" href="levels.json" as="fetch" crossorigin>
```

```js
// 主菜单 init() 改写,加 loading 状态
async init() {
  this.showStatus('正在加载关卡数据...');   // 灰底文字,开始按钮 disabled
  try {
    this.levels = await this.createLevels();
    this.hideStatus();
    this.enableStartButton();
  } catch (e) {
    this.showError('关卡加载失败:' + e.message);
    // 不 enable 开始按钮
  }
}
```

### 错误处理(严格优先于宽松)

**阻塞启动的错误**(全屏红色错误 UI + 重试按钮):

| 错误 | 检测 | 错误消息示例 |
|------|------|------|
| 文件 404 | `res.ok` false | `"HTTP 404"` |
| JSON parse 失败 | `JSON.parse` 抛错 | `"Unexpected token } in JSON at position 123"` |
| 顶层不是对象 / `levels` 不是数组 | type check | `"levels must be an array"` |
| 关卡数 ≠ 30 | `data.levels.length !== 30` | `"Expected 30 levels, got 29"` |
| 某关缺 `id` / `name` / `blocks` | key check | `"Level 5: missing 'id' field"` |
| block 缺 `x` / `y` / `z` / `type` | key check | `"Level 5 block 7: missing 'type' field"` |
| `type` 非法 | enum check | `"Level 5 block 7: invalid type 'foo'"` |
| `x/y/z` 非整数 | type check | `"Level 5 block 7: x must be integer"` |
| `start` 或 `end` 数 ≠ 1 | count check | `"Level 5: expected 1 'start', got 0"` |

**不阻塞(console.warn)**:

| 警告 | 条件 |
|------|------|
| blocks 数不在 10-15 | R085 规则违反 |
| 坐标超出 -20 ~ +20 | 视觉可能异常 |
| `custom` 字段名不在白名单 | merge 时忽略未知字段 |

**降级策略(全部拒绝)**:
- ❌ 硬编码 fallback — 违反 YAGNI + 跟"严格"哲学冲突
- ❌ 跳过坏关继续 — 会让 Dad 校对时漏掉 typo
- ❌ localStorage 缓存 — 改完要清缓存更麻烦

**重试机制**:
- 错误 UI 上一个"重试"按钮
- 点击 → `await this.createLevels()` 再跑一次
- **实质上免了重启 Electron**(Dad 改完 JSON 点重试即可)

---

## File Plan

| File | Action | Purpose |
|------|--------|---------|
| `levels.json` | Create | 30 关 blocks + name 数据,从 game.html:805-1000+ 提取 |
| `game.html` | Modify | `createLevels()` 改写 + `<head>` 加 preload + `init()` 加 loading 状态 |
| `docs/superpowers/specs/2026-06-08-levels-data-externalization-design.md` | Create | 本 spec |
| `scripts/levels-json-load.spec.js` | Create | 新增 6 个 test 验证 JSON 加载 |
| `memory/MEMORY.md` | Modify | 追加"2026-06-08: 关卡数据外置"段 |

---

## Acceptance Criteria

- [ ] `levels.json` 存在,30 关,每关 10-15 块,UTF-8 编码,缩进 2 空格
- [ ] `game.html` 的 `createLevels()` 改为 async,代码量净减 ~175 行
- [ ] `<head>` 含 `<link rel="preload" href="levels.json" as="fetch" crossorigin>`
- [ ] 主菜单启动时显示 "Loading...",fetch 完成后 enable 开始按钮
- [ ] 故意删除 levels.json → 启动显示 404 错误 UI + 重试按钮
- [ ] 故意改坏 JSON 语法(删一个 `}`)→ 启动显示 parse error
- [ ] 故意删 level 5 整个 → 启动显示 "Expected 30 levels, got 29"
- [ ] 故意删 level 5 第 7 块的 `type` 字段 → 启动显示 "Level 5 block 7: missing 'type' field"
- [ ] 故意改一个 `type` 为 "foo" → 启动显示 "Level 5 block 7: invalid type 'foo'"
- [ ] 现有 25 个 spec 全部通过(0 改动)
- [ ] 新增 `scripts/levels-json-load.spec.js` 6 个 test 全部通过
- [ ] 启动时间增加 < 100ms
- [ ] `ls -la levels.json` < 50 KB
- [ ] Dad 视觉验证:level 1-15 + 16-30 各 3 关,位置/custom 渲染/reward 跟改前一致
- [ ] Dad 视觉验证:高度跳跃(16+) 30/70 trajectory 手感没变

---

## Open Questions

(无 — 所有决策已通过 brainstorming 3 个澄清问题 + 5 sections 确认)
