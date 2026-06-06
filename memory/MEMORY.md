# Project: Jumping Rabbit (跳跳小方块)

**Type**: 3D block-jumping game
**Framework**: Three.js (Electron)
**File**: Single HTML file (`game.html`)

## Architecture

- Three.js scene with PerspectiveCamera at (0, 144, 144)
- Block grid system: 54×7.2×54 units per block
- Jump: 2 blocks per move (direction × 2)
- Height system: y=0,1,2 for intermediate levels (21-35)
- Space+Arrow for upward jump when heightDiff=1

## Key Systems

| System | Details |
|--------|---------|
| **Blocks** | Floating animation (sin wave), 8 material types |
| **Rewards** | GLB models: crystal, heart, golden |
| **Characters** | Rabbit (GLB), procedural cat/bear/boy/girl |
| **Audio** | Web Audio API, 8 sound types |
| **Levels** | 35 total (1-20 beginner, 21-35 height) |

## Game State

```
menu → waiting → jumping → [landing/fall/victory]
```

## Controls

- Arrow keys: Jump 2 blocks
- Space+Arrow: Upward jump (height diff = 1)
- Down/same level: Unrestricted

## Files

- `game.html` — Main game (1634 lines)
- `scripts/*.spec.js` — Playwright tests
- `CLAUDE.md` — Project rules

## Current Issue

Level 21 blocks count is too low (only 8 blocks, should be 10-15).
See `docs/superpowers/specs/2026-05-30-phase2-height-design.md` for design spec.

## 2026-06-06: R135 完成 ✅

**范围**: 仅 16-20 (中级, 5 关), 1-15 + 21-30 不动
**Commit**: f94356e "feat(R135): 优化中级关卡 16-20 立体感"

**修改内容**:
- 块数 12-14 (R085 满足)
- 鲜艳颜色 11-13 种/关 (R109/R110 满足)
- Z 曲折 z={0,2} (R118 满足, R121 平行移动满足)
- Y 范围 5-11 (R091 满足)

**测试**: scripts/r135-verify.spec.js ✅ 1 passed (3.3s)

**遗留问题**:
- Level 21 块数太少 (8 块 → 10-15) — 下一步
- blocks 阴影 (R135 任务 4) — 未做
- 兔子落点 (R135 任务 3) — 未做
- 黄色线条 bug (R135 任务 6) — 未做
- 21-30 整体优化 — 范围外

## 2026-06-06: R135 进度更新（Dad 确认）

**已完成**（Dad 实测无问题）:
- ✅ blocks 阴影 (R135 任务 4)
- ✅ 兔子落点 (R135 任务 3)
- ✅ 黄色线条 bug (R135 任务 6) → 升级为"黄色线团"bug 调查中（见下）

**仍在查**:
- 🔍 "黄色线团" bug（屏幕中心，一团乱糟糟线条/圈圈，偶尔出现 1-2 秒自动消失）
  - Headless 3D 场景扫描 (level 15-20): 0 transient yellow, 12 永久 golden 奖励 mesh
  - DOM 元素扫描: 0 yellow
  - 3D 时序扫描 (T+0/50/200/400/800/1500ms): 0 transient
  - 等待 Dad 现场截图到 test-results/dad-yellow-bug.png 用 VLM 定位

**仍遗留（真实未做）**:
- ~~Level 21 块数太少 (8 → 10-15)~~ → **已调查，决策：不改**

  实际状态（headless 验证 2026-06-06）:
  - 12 块（在 R085 10-15 范围内）
  - 11 段转换，10/11 依赖 big jump（dy=+1），1/11 是 normal
  - 路径单调：z=0 单轴直线，y 0→9 中间 y=4 短暂下降 1
  - memory 的"8 块"数字是 stale / 记录错

  Dad 决定保留现状（"初见高度差"主题允许高 big-jump 比例）。后续如要改进可考虑加 z 方向 rest 块。

## 2026-06-06: Level 19 终点不可达修复 ✅

**症状**: Dad 报告 level 19 终点方块"不连续"——无法用方向键一步步跳过去。

**根因**（headless 验证）:
- 倒数第 2 块 `(14, y=2, z=2)`
- 终点 `(16, y=1, z=0)`
- Δ = (x:+2, y:-1, z:-2) — 单次方向键只能改一个轴，不可能同时改 x 和 z
- 4 向无对角键，无法一次跳到

**修复**: 在 `(14,2,2)` 和 `(16,1,0)` 之间插入桥接方块 `(14, y=1, z=0)` (color 0xE91E63 pink)
- (14,2,2) → (14,1,0): ArrowUp, Δz=-2, heightDiff=-1, **普通跳** ✓
- (14,1,0) → (16,1,0): ArrowRight, Δx=+2, heightDiff=0, **普通跳** ✓

**测试**: `scripts/level19-path-reachability.spec.js` ✅ 1 passed
- 12/12 transitions 单轴可达
- 所有 12 段都是 normal jump（不依赖 big jump）
- 满足 Dad 要求"普通的一步步跳过去是基本的方式必须存在"

**改动范围**: `game.html` 第 962 行加 1 行，blocks 12 → 13（仍符合 R085 10-15 范围）

**注意**: 修复后 level 19 blocks 顺序的"权威定义"在 `game.html` 而非 spec 文件；测试通过 `window.game.levels` 读运行时数据，避免硬编码漂移。

## 2026-06-06: 非对称跳跃设计完成 ✅

**范围**: 16-30 关卡（中级），仅 heightDiff=1 的上台阶跳
**Commit**: 734da3a "docs: asymmetric jump design for intermediate levels 16-30"

**设计要点**:
- 抛物线 30/70 非对称（前陡后缓），t=0.3 到峰值
- 总时长 400ms 不变，extraHeight=35 不变
- 落地 80ms 二级动画：兔子 y 微弹（下压 2.5 → 回弹 0.9）+ 目标方块 emissive 闪
- 抽 jumpTrajectory(t, profile) 纯函数 + playLandingStomp(targetBlock, targetY) 方法
- startJump 改动 < 10 行
- 其他跳跃（水平/向下/原地）保持原 50/50

**实施前需验证**:
- targetBlock.material.emissive 是否存在（材质类型）
- currentLevel 字段名
- blockMaterials 是否每个方块独立 clone

**下一步**: 调用 writing-plans 写实施计划

## 2026-06-06: 非对称跳跃实施完成 ✅

**Commits**:
- 734da3a docs: asymmetric jump design
- f199f4c docs: asymmetric jump implementation plan
- 2575e73 feat(jump): add jumpTrajectory pure function
- ebb8c78 feat(jump): add playLandingStomp method
- f619ad9 feat(jump): wire startJump to profile + stomp
- a75dc8c test(jump): integration + regression tests

**公式修正**: 原计划 4*s*(1-s) 在 t=0.3 不可能到峰值（parabola 峰值在 s=0.5）。改用分段线性 `t/0.3` 上升 + `(1-t)/0.7` 下降 — t=0.3 时值=1, t=0.5 时值=0.714。

**测试**: scripts/asymmetric-jump.spec.js — 14 passed
- jumpTrajectory 7 个（边界 + 对称/非对称 + 纯函数）
- playLandingStomp 2 个（null block + y 基准归位）
- level 16 集成 1 个（验证 profile 选取 + 轨迹形态）
- 回归 4 个（level 1/30/31 + heightDiff=0）

**回归**: scripts/height-jump.spec.js — 3 passed ✅
**已知 pre-existing 失败**: scripts/intermediate-levels.spec.js — 2 failed，与本次改动无关（loadLevel 被 unlockedLevels gate 拦截；stash 验证 f619ad9 时已存在）。下次专项修。

**视觉验证**: ./start.sh 跑 16-20 关，看上台阶手感（快升慢降 + 踩实闪）。1-15 关行为不变。

## 2026-06-06: 视觉验证通过 ✅

**Electron 启动**: `./start.sh` → `npm start` → `electron .` → main.js 启本地资源服务在 **8888** 端口（不是 8080）；窗口通过 `win.loadFile('game.html')` 直接加载本地文件，GLB 模型走 8888 server。**8080 上的 http-server 是单独留给浏览器测试用的**。

**人工试关结果**（Dad 实测 Level 16-20 上台阶）:
- ✅ 30/70 轨迹：明显"快升慢降"
- ✅ 落地踩实：兔子小弹一下
- ✅ 方块闪：目标方块发亮
- ✅ Level 1-15 回归：行为不变

**Headless 客观数据补充**:
- scripts/visual-verify-asymmetric.spec.js — 2 passed, 1 partial
- 30/70 证据：Level 16 peak y=28.98 @ t=338ms > mid-flight y=24.70 @ t=740ms（峰值在前半段）
- 80ms stomp 证据：直接调用 playLandingStomp，y 从 100.72 → 98.65（下压 2.07，目标 2.5）
- Level 1 回归：profile=symmetric, p(0.5)=1.0, p(0.3)=0.84 ✅

**Commits**:
- e20ee75 docs(spec): sync asymmetric jump design with implementation（0.612→0.714 修正 + onComplete 文档化）
- 3935d7e test(jump): visual verification spec for 30/70 trajectory + 80ms stomp

**Feature 完成**: 非对称跳跃从 spec → plan → 实施 → 测试 → 视觉验证全链路闭环 ✅
