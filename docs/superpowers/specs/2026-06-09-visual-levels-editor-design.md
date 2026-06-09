# Visual Levels Editor — Design Spec

**Date**:2026-06-09
**Status**: Approved — Pending Implementation
**Author**: CC (with Dad)
**Related**: `2026-06-08-levels-data-externalization-design.md` (data 源)
`2026-06-09-per-block-validation-design.md` (validator 校验)

---

## Overview

Dad 已经在手动 review/edit `levels.json`,但平文本难看出 3D 空间关系。本 spec 加一个**visual editor**,让 Dad 在 3D 场景里**点选方块 → 右侧改坐标 → 保存回 `levels.json`**,改完游戏点「重试」立即看到。

**关键约束**:Dad 选了 3D 预览 + 属性面板 + 独立 HTML 文件(`editor.html`)。

**Success criteria**: 浏览器打开 `http://localhost:8080/editor.html`,能 30 关切换、点选方块、编辑坐标、保存到 `levels.json`,期间 validator 不报错。

---

## CodeGraph 上下文

### 复用的现有资产

| 资产 | 文件:行 | 复用方式 |
|------|---------|----------|
| Three.js 场景初始化 | `game.html:900-1100`(参考) | **复制 + 简化**,只渲染方块网格,不渲染兔子/奖励/UI |
| block 渲染逻辑 | `game.html:1188-1280` `createBlock()` | 抽公共函数? 不 — 两个文件用不同简化版,game.html 已有复杂版,editor 写新简化版 |
| validateLevels() | `game.html:2076-2106` | **直接 import 不可行**(IIFE 局部),editor 重新内联一份(30 行)|
| levels.json 结构 | `levels.json` | **直接 fetch**,跟 game 一样 |
| dev server 8080 | 现有 `npx http-server . -p8080` | 复用,editor.html 走同一 server |
| Level 1-30 blocks 范围 | `R085:10-15 块,3 known violators L7/L8/L14` | 复用,UI 提示每关块数 |

### 重名/冲突检查

`codegraph_search query="editor"` → 0 结果 ✅ 无冲突

新文件:`editor.html`(根目录,跟 `game.html` 同级)。

---

## Goals & Non-Goals

### Goals

- G1:独立 `editor.html`,浏览器 `http://localhost:8080/editor.html` 直接打开
- G2:左侧 3D 场景,显示当前关所有方块(start/end 用颜色区分,选中的高亮 outline)
- G3:右侧属性面板:Level 选择 + 当前选中 block 的 x/y/z/type 输入框 + 删除按钮
- G4:鼠标点 3D 方块 → 自动选中 + 右侧填充属性
- G5:右侧改 x/y/z → 3D 实时移动方块
- G6:Level 切换(下拉框 1-30)→ 3D 重渲染
- G7:保存按钮 → 写回 `levels.json`
- G8:保存前**复用 validator** 校验,失败弹错不写盘
- G9:键盘快捷键(方向键移动选中方块 ±2、Delete 删除)

### Non-Goals

- NG1:不渲染兔子/奖励/UI/HUD — 只画方块网格
- NG2:不接 game.html 的 game state — editor 独立状态
- NG3:不接 Git / 版本控制 — Dad 自己 `git checkout levels.json` 备份
- NG4:不接 undo/redo — v2 再加(command pattern + history stack)
- NG5:不接多人协作 — 单用户本地编辑
- NG6:不接 Electron preload Node fs — 浏览器版,保存用 fetch PUT(见 §保存策略)
- NG7:不接增量保存(每个改动自动 save)— 显式 Save 按钮(防误操作)
- NG8:不接"添加新方块" — v2 再加(简单 append 即可,但要处理 ID/序号)
- NG9:不接多选 / 框选 / 复制粘贴 — v2

---

## Design

### 文件结构

```
editor.html       # 新建,自包含(同 game.html 风格)
levels.json       # 现有,editor 读写它
memory/MEMORY.md  # 追加 "2026-06-09: visual editor" 段
```

### 页面布局(单文件 HTML)

```
┌─────────────────────────────────────────────────────────────┐
│ <header> Visual Levels Editor  [Level: 17 ▼] [Save] [Reset] │  ← 顶栏
├──────────────────────────────────────────┬──────────────────┤
│                                          │ Properties       │
│                                          │ ─────────────    │
│                                          │ Block 5 of 11    │
│        [3D Three.js 场景]                  │                  │
│        (OrbitControls 鼠标拖拽)            │ x:  [  8  ]     │
│        选中方块金色 outline                 │ y:  [  5  ]     │
│                                          │ z:  [  2  ]     │
│                                          │ type: normal ▼   │
│                                          │                  │
│                                          │ [Delete]         │
│                                          │                  │
│                                          │ ─────────────    │
│                                          │ Stats            │
│                                          │ Blocks: 11 ✓     │
│                                          │ Start: (0,0,0) ✓│
│                                          │ End: present ✓  │
│                                          │ Reachable: ?    │
├──────────────────────────────────────────┴──────────────────┤
│ <footer> keyboard: ← → ↑ ↓ 移动 ±2, Del 删除, Esc 取消选择   │
└─────────────────────────────────────────────────────────────┘
```

### 3D 场景(简化版)

- PerspectiveCamera 起手位置 `(0, 80, 120)`,看向原点
- OrbitControls 鼠标左键拖旋转、右键平移、滚轮缩放
- 地面参考网格 `GridHelper(200, 20)` 灰白线
- 方块用 简化版 `createBlock(x, y, z, type)`,size 固定 54×9×54
- 颜色:
  - start:绿色 `0x4CAF50`
  - end:红色 `0xF44336`
  - normal:`0x2196F3`(蓝)
  - **selected**:同色 + 金色 `0xFFD700` outline(`LineSegments + EdgesGeometry`,线宽 2)
- 无动画(不浮、不旋转)— 静态展示,方便对坐标

### 状态管理

```js
const state = {
 levels: [], // 全 30 关(from fetch)
 currentLevelId: 1,
 selectedBlockIdx: null, // null = 没选
 dirty: false, // 有未保存改动
};
```

- 选方块:`state.selectedBlockIdx = idx`,重建选中 outline,填右侧 input
- 改 input:更新 `state.levels[currentLevelId].blocks[idx]`,重建 3D 场景,`state.dirty = true`
- 切 level:if dirty,弹确认 "未保存,放弃改动?"
- Save:跑 validator,失败弹错,成功 POST 写回 + 清 dirty
- Reset:重 fetch levels.json,丢未保存改动

### 保存策略(关键决策)

浏览器没法直接写文件。3 个选项:

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A. fetch PUT 到 dev server** | 浏览器原生,无依赖 | 当前 `http-server` 不支持 PUT,得换成 express / 写个 `save-server.js` |
| **B. 下载 JSON 文件** | 浏览器原生,无后端 | Dad 得手动替换 levels.json,2 步 |
| **C. 复制到剪贴板** | 浏览器原生,无后端 | 同上,Dad 还得打开编辑器粘贴 |

**选择 A** — 加一个最小 `scripts/save-server.js`(Express 路由):
- 监听 8081(避开现有 8080)
- 接受 `PUT /levels.json`,body 是完整 JSON,fs.writeFile 写回
- 简单 CORS(只允许 8080 来源)
- 跟 `http-server` 并行跑(npm run dev:editor 一起启)

editor.html 在保存时 `fetch('http://localhost:8081/levels.json', { method: 'PUT', body: JSON.stringify(levels) })`。

### Validator 复用

`validateLevels()` 在 `game.html` IIFE 内部,**没法跨文件 import**。方案:
- editor.html 内联一份**相同实现**(~30 行)
- 后续 v2 可抽到 `validator.js` 共用;v1 接受轻微重复

### 键盘快捷键

| 键 | 行为 |
|----|------|
| ← → ↑ ↓ | 选中方块 x/z 移动 ±2(y 不变,因游戏跳跃是 Δx/Δz 维度) |
| Delete / Backspace | 删除选中块(带 confirm) |
| Esc | 取消选择 |
| Ctrl+S | 保存 |
| 1-9, 0 | 快速切 level(1→level 1, 0→level 10,Shift+0→level 20) |

**v2 候选**: Shift+方向 = ±4 大跳, Alt+方向 = y ±1 上下

---

## File Plan

| File | Action | Purpose |
|------|--------|---------|
| `editor.html` | Create | 主 UI(~400 行) |
| `scripts/save-server.js` | Create | 最小 Express save endpoint(~30 行) |
| `scripts/visual-editor.spec.js` | Create | Playwright E2E:load / 切换 / 选中 / 编辑 / 保存 / 错误路径 |
| `scripts/visual-editor-api.spec.js` | Create | Node 直接测 save-server(无需 browser) |
| `package.json` | Modify | 加 `"dev:editor": "...concurrently http-server + save-server"` |
| `memory/MEMORY.md` | Modify | 追加 "2026-06-09: visual editor" 段 |
| `docs/superpowers/plans/2026-06-09-visual-levels-editor.md` | Create | 实施计划 |

**改动量估算**:
- `editor.html`: 新建 ~400 行
- `scripts/save-server.js`: 新建 ~30 行
- 新 spec:~150 行
- `package.json`: +5 行

---

## Acceptance Criteria

- AC1: `http://localhost:8080/editor.html` 可访问,显示 3D 空场景 + 顶栏
- AC2: 自动 fetch levels.json,30 关可下拉切换,3D 渲染当前关所有方块
- AC3: 鼠标点 3D 方块 → 该方块金色 outline,右侧 input 填充 x/y/z/type
- AC4: 右侧改 x 输入框 → 3D 方块实时移动 + 顶部 [Save] 按钮变橙色提示有改动
- AC5: type 改非法值(如 "foo")→ Save 时弹 `Level N block i: type must be one of...` 错误,不写盘
- AC6: 点 [Save] → fetch PUT 8081 → 文件实际更新 + `dirty` 清除
- AC7: 方向键移动选中方块 ±2(在 3D 场景里,只动 x/z)
- AC8: Delete 删除选中块(有 confirm)
- AC9: dirty 状态下切 level → 弹确认"放弃改动?"
- AC10: 手动改坏 levels.json 外部 → editor 打开 → 顶栏显示 validator 错误(红框)+ 不让编辑
- AC11: 现有 60 spec 0 回归

---

## Open Questions

无。3 个决策点(UI 形态、启动方式、保存策略)已跟 Dad 对齐。validator 复用方式选"内联重复"v1 接受。
