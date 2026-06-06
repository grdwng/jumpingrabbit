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
