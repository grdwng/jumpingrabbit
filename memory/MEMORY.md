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
