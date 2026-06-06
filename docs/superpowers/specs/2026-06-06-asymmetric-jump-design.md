# 中级 16-30 关卡 — 抛物线非对称跳跃设计规格

**日期**: 2026-06-06
**版本**: v1.0
**状态**: 待批准
**范围**: `game.html` 单文件改动（`Game` class 内部）

---

## 1. 概述

中级 16-30 关卡存在大量 heightDiff=1 的"上台阶"跳跃。当前 `startJump`（`game.html:1426-1529`）对所有跳跃使用同一条对称抛物线 `4*t*(1-t)`，峰值出现在 t=0.5。这导致上台阶时兔子的爬升感被对称中点削弱，落点也不够"踩实"。

本次改动：

1. **轨迹非对称**：上台阶（bigJump + heightDiff=1）时使用 30/70 抛物线（前 30% 时间爬升到峰值，后 70% 时间下降），让"跳上去"的手感更明显。
2. **落地踩实反馈**：上台阶落地瞬间加 80ms 二级动画 — 兔子 y 微弹 + 目标方块 5 帧高光闪。
3. **范围限定**：仅对 16-30 关生效；1-15（平面）和高级 31+ 行为不变。

---

## 2. 适用条件

profile 选择逻辑：

```
profile = (bigJump === true
           && heightDiff > 0
           && currentLevel ∈ [16, 30])
        ? 'asymmetric'
        : 'symmetric'
```

| 跳跃类型 | 条件 | profile |
|----------|------|---------|
| Space+方向上台阶 | 关卡 16-30 且 heightDiff=1 | **asymmetric** |
| Space+方向上台阶 | 关卡 1-15 | symmetric（原行为）|
| 普通方向键（heightDiff=0）| 任何关卡 | symmetric |
| 向下跳（heightDiff<0）| 任何关卡 | symmetric |
| 原地跳（Space 单按）| 任何关卡 | symmetric |

---

## 3. 组件 & 接口

### 3.1 `jumpTrajectory(t, profile)` 纯函数

**位置**：`Game` class 新增方法。
**职责**：把归一化时间 t∈[0,1] 映射到 y 比例∈[0,1]（0=起点，1=峰值）。
**无副作用**：不读不写 `this`。

```js
jumpTrajectory(t, profile) {
  if (profile === 'asymmetric') {
    if (t <= 0.3) {
      const s = t / 0.3;
      return 4 * s * (1 - s);          // 爬升段：s=0→0, s=0.5→1, s=1→1
    }
    const s = (t - 0.3) / 0.7;
    return 4 * s * (1 - s);            // 下降段：s=0→1, s=0.5→1, s=1→0
  }
  return 4 * t * (1 - t);              // 对称：原行为
}
```

**关键值**：

| t | symmetric | asymmetric |
|---|-----------|------------|
| 0.0 | 0.000 | 0.000 |
| 0.15 | 0.510 | 1.000（爬升峰值）|
| 0.30 | 0.840 | 1.000（峰值切换点）|
| 0.50 | 1.000 | 0.714 |
| 0.65 | 0.910 | 0.500 |
| 1.00 | 0.000 | 0.000 |

爬升段用 0-1 线性插值（piecewise linear），下降段也用 0-1 线性插值（拼接后在 t=0.3 处一阶连续但**二阶不连续** — 这是 30/70 非对称的本质）。

### 3.2 `playLandingStomp(targetBlock, targetY, onComplete)` 方法

**位置**：`Game` class 新增方法。
**职责**：上台阶落地后 80ms 二级动画。
**不改 `gameState`** — 仅动 `player.position.y` 临时偏移和 `targetBlock.material.emissive` 临时闪烁。
**回调**：`onComplete`（可选）在动画收尾完成后被调用一次（y 归位 + emissive 恢复之后）。`startJump` 传入 `() => this.onLand()` 来延迟释放 `gameState='jumping'` 锁，保证 80ms stomp 窗口期间玩家输入被拦截。

```js
playLandingStomp(targetBlock, targetY, onComplete) {
  const STOMP_DURATION = 80;            // ms
  const DIP = 2.5;                      // 下压幅度（世界单位）
  const REBOUND = 0.9;                  // 回弹终值
  const stompStart = performance.now();

  const origEmissive = (targetBlock && targetBlock.material && targetBlock.material.emissive)
    ? targetBlock.material.emissive.getHex()
    : null;

  const animate = (now) => {
    const t = Math.min((now - stompStart) / STOMP_DURATION, 1);

    // 微弹曲线：t=0→0, t=0.5→-DIP, t=1→REBOUND
    let offset;
    if (t < 0.5) {
      offset = -DIP * (t / 0.5);        // 0 → -2.5
    } else {
      const s = (t - 0.5) / 0.5;        // 0 → 1
      offset = -DIP + (REBOUND + DIP) * s;  // -2.5 → 0.9
    }
    this.player.position.y = targetY + offset;

    // 方块高光闪（白色 emissive 强度 0.6 → 0）
    if (targetBlock && targetBlock.material && targetBlock.material.emissive) {
      const intensity = 0.6 * (1 - t);
      targetBlock.material.emissive.setRGB(intensity, intensity, intensity);
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // 收尾：玩家 y 归位 + emissive 恢复 + 调 onComplete
      this.player.position.y = targetY;
      if (origEmissive !== null && targetBlock.material.emissive) {
        targetBlock.material.emissive.setHex(origEmissive);
      }
      if (onComplete) onComplete();
    }
  };
  requestAnimationFrame(animate);
}
```

**关键设计点**：
- 用传入的 `targetY` 作基准，避免在 `this.player.position.y` 上累加（防止漂移）。
- 收尾**显式归位** `player.position.y = targetY`，即使 timing 偏差也保证最后落点正确。

### 3.3 `startJump` 改动

仅 3 处微小改动，控制在 10 行内。

**改动 A**：函数入口新增 profile 选择（约 5 行）：

```js
// 在 const startTime = performance.now() 之后
const currentHeight = this.playerPosition.y || 0;
const targetHeight = isInPlace
  ? currentHeight
  : (targetBlock ? (targetBlock.userData.y || 0) : currentHeight);
const heightDiff = targetHeight - currentHeight;
const isIntermediateLevel = this.currentLevel >= 16 && this.currentLevel <= 30;
const profile = (bigJump && heightDiff > 0 && isIntermediateLevel)
  ? 'asymmetric'
  : 'symmetric';
```

**改动 B**：animate 闭包内的抛物线计算（1 行替换）：

```js
// 原：const parabola = 4 * t * (1 - t);
const parabola = this.jumpTrajectory(t, profile);
```

**改动 C**：动画结束的 `else` 分支（`t >= 1`），stomp 路径把 `onLand` 作为 `onComplete` 回调传进去（保证 80ms stomp 窗口期间 `gameState='jumping'` 锁不被释放）：

```js
if (profile === 'asymmetric' && targetBlock && !isInPlace) {
  this.playLandingStomp(targetBlock, targetY, () => this.onLand());
} else {
  this.onLand();
}
```

---

## 4. 数据流

```
按键 (Space + Arrow)
  ↓
onKeyDown → executeJump(dir, bigJump=true)
  ↓ (jumpAllowed)
startJump(dir, targetBlock, bigJump=true)
  │
  ├─ 计算 heightDiff, profile
  ├─ startY, targetY, jumpHeight（不变）
  │
  └─ animate(now):
       parabola = this.jumpTrajectory(t, profile)
       player.y = startY + (jumpHeight - startY) * parabola
       ... （body sway / scale / blocks 平移）
       if (t < 1) requestAnimationFrame(animate)
       else:
         player.position.set(0, targetY, 0)
         if (profile === 'asymmetric' && targetBlock) {
           this.playLandingStomp(targetBlock, targetY, () => onLand())  // onComplete = onLand
         } else {
           onLand()
         }
```

stomp 是独立 raf 循环；与 `startJump` 内的 raf 互不干扰。
两者结束时各自清理：stomp 自然结束 → 玩家 y 归位 + emissive 恢复 + 调用 `onLand` → `gameState = 'waiting'`；非 stomp 路径立即调 `onLand`。

---

## 5. 错误处理

| 场景 | 行为 |
|------|------|
| `targetBlock` 为 null（原地跳、边界外）| `playLandingStomp(null, targetY)` → 玩家微弹照常，方块闪分支跳过 |
| `targetBlock.material.emissive` 不存在 | `if (targetBlock && ... && material.emissive)` 守卫，恢复分支同样守卫 |
| 关卡 1-15 或 31+ | profile = 'symmetric'，行为完全等同现状 |
| `currentLevel` 字段缺失或为 undefined | 实施时验证字段名；若缺失则用 `this.currentLevel || 1` fallback |
| 玩家在 stomp 期间按键 | `onLand()` 推迟到 stomp 完成后才调用，所以 `gameState === 'jumping'` 持续整个 80ms 期间，`executeJump` 被拦截，不会触发新 `startJump` — 安全 |
| 多次起跳导致 stomp 重叠 | executeJump 被 `gameState === 'jumping'` 拦截，stomp 期间不会触发新 startJump — 安全 |
| 玩家在微弹过程中 y 被外力改了 | 不会发生：stomp 是唯一改 player.y 的路径，期间 gameState='jumping' 阻塞一切输入 |

---

## 6. 测试计划

### 6.1 单元测试

| 用例 | 期望 |
|------|------|
| `jumpTrajectory(0, 'asymmetric')` | 0 |
| `jumpTrajectory(0.3, 'asymmetric')` | 1（峰值）|
| `jumpTrajectory(0.5, 'asymmetric')` | ≈ 0.714 |
| `jumpTrajectory(1, 'asymmetric')` | 0 |
| `jumpTrajectory(0.5, 'symmetric')` | 1（原峰值）|
| `jumpTrajectory` 多次调用无副作用 | 状态不变（纯函数）|
| `playLandingStomp(null, targetY)` | 不抛错；玩家 y 偏移基准是 targetY |
| profile 选择矩阵 | (bigJump, heightDiff, level) → expected profile 全覆盖 |

### 6.2 集成测试（Playwright）

| 用例 | 步骤 | 期望 |
|------|------|------|
| 关卡 16 上台阶 | 加载关卡 16，按 Space+方向键 | 1) y 轨迹是 30/70 形态 2) 落地后 80ms 内下压 2.5 3) 方块 emissive 临时变白 4) 最后 y 归位 |
| 关卡 1 回归 | 加载关卡 1，按方向键 | 1) y 轨迹是 50/50 对称抛物线 2) 无 stomp 触发 |
| 关卡 16 普通方向键 | 不按 Space，按方向键（同层）| profile = 'symmetric'，无 stomp |
| 关卡 16 向下跳 | 按方向键到低台阶 | profile = 'symmetric'，无 stomp |

### 6.3 视觉验证

`./start.sh` 跑游戏，人工试关卡 16-20 上台阶，确认：
- 上台阶时兔子明显"先快爬升、再慢下降"的手感
- 落地有"踩实"的高光闪
- 平面跳和向下跳手感与改动前一致

---

## 7. 验收标准

- [ ] `jumpTrajectory` 纯函数行为与 §3.1 一致
- [ ] `playLandingStomp` 不抛错、玩家 y 基准 = targetY、emissive 收尾恢复
- [ ] profile 选择逻辑与 §2 表一致
- [ ] 关卡 16-30 上台阶：30/70 抛物线 + 落地微弹 + 目标方块闪
- [ ] 关卡 1-15 行为完全不变（回归）
- [ ] 关卡 16-30 水平跳和向下跳行为不变（回归）
- [ ] 单元测试覆盖率 100%（`jumpTrajectory` 和 profile 选择）
- [ ] 集成测试覆盖 §6.2 全部用例
- [ ] 视觉验证通过（§6.3）

---

## 8. 未做（YAGNI）

- ❌ `stompActive` 标志打断输入（80ms 阻塞可接受）
- ❌ 重构 `gameState` 状态机
- ❌ 抽象 `JumpProfile` 数据对象
- ❌ 音效"咚"
- ❌ 微弹缩放/旋转（仅 y 偏移）
- ❌ 高级 31-35 关卡优化

---

## 9. 已知风险 & 实施前验证

| 风险 | 验证步骤 |
|------|----------|
| `targetBlock.material.emissive` 缺失（`MeshLambertMaterial` 无 emissive）| 实施前 `grep blockMaterials` 确认材质类型；若全用 `MeshPhysicalMaterial` 则无风险；否则用 `material.color` 临时 multiplyScalar 替代 |
| `currentLevel` 字段名不对 | 实施前 grep `this.currentLevel` 或 `this.level` 确认变量名 |
| `blockMaterials` 是共享对象，emissive 改动会污染其他方块 | 实施前看是否每个 block 有独立 material clone；若有 clone 则改 emissive 仅影响目标方块；若共享则需先 clone targetBlock 的 material |

---

## 10. 下一步

批准后进入 writing-plans 阶段，生成实施计划。
