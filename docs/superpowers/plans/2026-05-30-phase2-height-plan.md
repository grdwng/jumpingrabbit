# 第二阶段：高度跳跃系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现第二阶段高度跳跃系统，玩家可以在不同高度的方块间跳跃

**Architecture:** 
- 在现有 game.html 中增加高度维度支持
- 方块数据结构增加 y（高度）属性
- 跳跃逻辑根据高度差判断是否需要Space键
- 使用Playwright进行E2E测试

**Tech Stack:** Three.js (3D渲染), Playwright (E2E测试), Electron

---

## 文件结构

```
game.html                    # 主要游戏文件，所有逻辑内联
scripts/shield-test.spec.js  # 参考：现有测试模式
docs/superpowers/specs/2026-05-30-phase2-height-design.md  # 设计规格
```

---

## Task 1: 方块数据结构增加高度属性

**Files:**
- Modify: `game.html` — 方块数据结构添加 `y` 属性

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/height-block.spec.js 中
test('方块应该能存储高度属性', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 检查方块数据结构是否有y属性
  const blockY = await page.evaluate(() => {
    const block = window.game.blocks[0];
    return block.y !== undefined;
  });
  expect(blockY).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/height-block.spec.js --project=chromium`
Expected: FAIL — "Cannot read property 'y' of undefined" 或类似错误

- [ ] **Step 3: 最小实现**

在 game.html 中搜索方块数据结构定义，添加 y 属性：

```javascript
// 方块数据结构从:
{x: 0, z: 0, type: 'start'}
// 改为:
{x: 0, y: 0, z: 0, type: 'start'}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/height-block.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/height-block.spec.js
git commit -m "feat(height): add y property to block data structure"
```

---

## Task 2: 方块高度渲染（视觉表现）

**Files:**
- Modify: `game.html` — 修改方块创建逻辑，根据y值设置不同高度

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/height-render.spec.js 中
test('不同高度的方块应该有不同颜色', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 检查层级0方块（y=0）的颜色
  const level0Color = await page.evaluate(() => {
    const mesh = window.game.blockMeshes.find(m => m.block.y === 0);
    return mesh ? mesh.material.color.getHex() : null;
  });

  // 检查层级1方块（y=1）的颜色
  const level1Color = await page.evaluate(() => {
    const mesh = window.game.blockMeshes.find(m => m.block.y === 1);
    return mesh ? mesh.material.color.getHex() : null;
  });

  console.log('Level 0 color:', level0Color.toString(16));
  console.log('Level 1 color:', level1Color.toString(16));
  
  // 不同层级应该有不同颜色
  expect(level0Color).not.toBe(level1Color);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/height-render.spec.js --project=chromium`
Expected: FAIL — "Cannot read property 'y' of undefined" 或类似错误

- [ ] **Step 3: 最小实现**

在 game.html 中搜索方块创建逻辑，修改位置计算：

```javascript
// 当前: this.mesh.position.set(block.x * blockConfig.width, ...)
this.mesh.position.set(
  block.x * blockConfig.width,
  block.y * blockConfig.height,  // 新增：y方向位置
  block.z * blockConfig.depth
);
```

添加高度颜色区分（根据设计规格）：
- y=0: 正常暖黄色
- y=1: 略微偏亮
- y=2: 明显偏亮

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/height-render.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/height-render.spec.js
git commit -m "feat(height): render blocks at different heights with color variation"
```

---

## Task 3: 跳跃高度判定逻辑

**Files:**
- Modify: `game.html` — 修改跳跃输入处理，根据高度差决定是否需要Space键

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/height-jump.spec.js 中
test('向下跳不需要Space键', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 设置玩家在高处
  await page.evaluate(() => {
    window.game.playerPosition = { x: 1, y: 1, z: 0 };
  });

  // 只按方向键向下跳（不按Space）
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);

  // 应该成功跳跃（不需要Space）
  const canJump = await page.evaluate(() => {
    return window.game.lastJumpResult !== 'blocked';
  });
  expect(canJump).toBe(true);
});

test('向上跳需要Space键', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 设置玩家在低处
  await page.evaluate(() => {
    window.game.playerPosition = { x: 1, y: 0, z: 0 };
  });

  // 只按方向键向上跳（不按Space）应该无效
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);

  const jumpAttempted = await page.evaluate(() => {
    return window.game.jumpAttempted;
  });
  expect(jumpAttempted).toBe(false); // 不应该尝试跳跃
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/height-jump.spec.js --project=chromium`
Expected: FAIL — 测试预期不正确或功能未实现

- [ ] **Step 3: 最小实现**

在 game.html 中搜索键盘输入处理，添加高度差判断：

```javascript
// 伪代码逻辑：
handleKeyDown(event) {
  const direction = getDirection(event);
  const targetPos = calculateTargetPosition(direction);
  const heightDiff = targetPos.y - currentPos.y;

  if (heightDiff > 0 && !event.shiftKey) {
    // 向上跳但没按Space，忽略
    return;
  }

  if (heightDiff > 1) {
    // 高度差大于1，不能跳
    return;
  }

  // 执行跳跃
  this.executeJump(direction);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/height-jump.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/height-jump.spec.js
git commit -m "feat(height): add height-based jump validation"
```

---

## Task 4: 高度跳跃动画

**Files:**
- Modify: `game.html` — 修改跳跃动画，根据高度差实现平滑过渡

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/height-animation.spec.js 中
test('向上跳动画应该平滑上升到目标高度', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 记录跳跃前位置
  await page.evaluate(() => {
    window.game.playerPosition = { x: 1, y: 0, z: 0 };
  });

  // 执行向上跳（需要Space）
  await page.keyboard.down('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Space');
  
  await page.waitForTimeout(100); // 动画刚开始

  // 检查y坐标是否在上升过程中
  const midY = await page.evaluate(() => window.game.player.mesh.position.y);
  expect(midY).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/height-animation.spec.js --project=chromium`
Expected: FAIL

- [ ] **Step 3: 最小实现**

修改跳跃动画，根据高度差计算目标Y位置：

```javascript
// 在跳跃动画中：
const startY = this.mesh.position.y;
const targetY = targetBlock.y * blockConfig.height + characterHeight;
const deltaY = targetY - startY;

// 动画曲线：跳跃高度差影响动画时长/曲线
const jumpDuration = 400 + deltaY * 50; // 每高度+50ms
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/height-animation.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/height-animation.spec.js
git commit -m "feat(height): smooth jump animation with height variation"
```

---

## Task 5: 中级关卡数据（15关）

**Files:**
- Modify: `game.html` — 添加中级关卡配置（21-35关）

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/intermediate-levels.spec.js 中
test('中级应该有15关', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 检查关卡数量（21-35）
  const levelCount = await page.evaluate(() => {
    return window.game.levels.filter(l => l.id >= 21 && l.id <= 35).length;
  });
  expect(levelCount).toBe(15);
});

test('第21关应该有高度变化的方块', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 加载第21关
  await page.evaluate(() => {
    window.game.loadLevel(21);
  });
  await page.waitForTimeout(500);

  // 检查是否有不同高度的方块
  const hasHeightVariation = await page.evaluate(() => {
    const heights = window.game.blocks.map(b => b.y);
    return new Set(heights).size > 1;
  });
  expect(hasHeightVariation).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/intermediate-levels.spec.js --project=chromium`
Expected: FAIL — 15关不存在

- [ ] **Step 3: 最小实现**

在 game.html 中添加中级关卡数据（21-35）：

```javascript
// 中级关卡（高度变化）
// 在现有levels数组中添加21-35关
{
  id: 21,
  name: "初见高低",
  blocks: [
    {x: 0, y: 0, z: 0, type: 'start'},
    {x: 1, y: 0, z: 0, reward: 'coin'},
    {x: 1, y: 1, z: 0, reward: 'energy'},  // 高1格的方块
    // ... 更多方块
  ],
  targetCoins: 350
},
// ... 15关设计
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/intermediate-levels.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/intermediate-levels.spec.js
git commit -m "feat(levels): add 15 intermediate levels with height variation"
```

---

## Task 6: 阶段解锁逻辑

**Files:**
- Modify: `game.html` — 初级20关通关后解锁中级

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/phase-unlock.spec.js 中
test('通关初级20关后中级解锁', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 完成初级20关
  await page.evaluate(() => {
    window.game.currentLevel = 20;
    window.game.onVictory();
  });
  await page.waitForTimeout(500);

  // 检查中级是否解锁
  const intermediateUnlocked = await page.evaluate(() => {
    return window.game.unlockedLevels.includes(21);
  });
  expect(intermediateUnlocked).toBe(true);
});

test('中级未解锁时不能进入', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 设置当前为第1关（初级未完成）
  await page.evaluate(() => {
    window.game.currentLevel = 1;
  });

  // 尝试加载中级关卡
  const canLoad = await page.evaluate(() => {
    try {
      window.game.loadLevel(21);
      return true;
    } catch (e) {
      return false;
    }
  });
  expect(canLoad).toBe(false); // 应该不能加载
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/phase-unlock.spec.js --project=chromium`
Expected: FAIL

- [ ] **Step 3: 最小实现**

添加解锁状态和数据：

```javascript
// 游戏状态中添加：
this.unlockedLevels = [1]; // 初始只有第1关可玩

// 通关后解锁下一关
onVictory() {
  // 现有逻辑...

  // 初级通关后解锁中级
  if (this.currentLevel === 20) {
    // 解锁第21-35关
    for (let i = 21; i <= 35; i++) {
      this.unlockedLevels.push(i);
    }
  }
}

// 加载关卡前检查
loadLevel(levelId) {
  if (!this.unlockedLevels.includes(levelId)) {
    throw new Error('Level not unlocked');
  }
  // ...加载逻辑
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/phase-unlock.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/phase-unlock.spec.js
git commit -m "feat(phase): add intermediate level unlock after completing beginner"
```

---

## Task 7: 高度视觉辅助（颜色/阴影）

**Files:**
- Modify: `game.html` — 根据高度层级设置不同颜色/阴影

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/height-visual.spec.js 中
test('层级2方块应该有更浅的阴影', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 检查层级2方块的阴影
  const level2Shadow = await page.evaluate(() => {
    const mesh = window.game.blockMeshes.find(m => m.block.y === 2);
    return mesh ? mesh.material.shadow : null;
  });
  // 层级2应该没有阴影或很浅
  expect(level2Shadow.opacity).toBeLessThan(0.3);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/height-visual.spec.js --project=chromium`
Expected: FAIL

- [ ] **Step 3: 最小实现**

根据设计规格修改方块材质：

```javascript
// 根据y值调整颜色和阴影
function getBlockMaterial(block) {
  const baseMaterial = this.blockMaterials.normal;
  
  if (block.y === 0) {
    // 层级0: 标准暖黄色
    return baseMaterial.clone().setHex(0xFFE5A0);
  } else if (block.y === 1) {
    // 层级1: 略微偏亮
    return baseMaterial.clone().setHex(0xFFF0B0);
  } else {
    // 层级2: 明显偏亮，无阴影
    return baseMaterial.clone().setHex(0xFFFFC8);
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/height-visual.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/height-visual.spec.js
git commit -m "feat(height): add visual distinction for height levels"
```

---

## Task 8: 整合测试（完整流程）

**Files:**
- Modify: `game.html` — 确保所有高度系统集成正常工作

- [ ] **Step 1: 写失败的测试**

```javascript
// 在 scripts/height-integration.spec.js 中
test('完整流程：开始游戏 -> 跳到高处 -> 跳到低处 -> 通关', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // 跳过几关到达有高度差的关卡
  await page.evaluate(() => {
    window.game.loadLevel(21);
  });
  await page.waitForTimeout(500);

  // 向上跳（需要Space）
  await page.keyboard.down('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Space');
  await page.waitForTimeout(500);

  // 检查玩家高度
  const playerHeight = await page.evaluate(() => window.game.player.mesh.position.y);
  expect(playerHeight).toBeGreaterThan(0);

  // 向下跳（不需要Space）
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);

  const playerHeightAfter = await page.evaluate(() => window.game.player.mesh.position.y);
  expect(playerHeightAfter).toBeLessThan(playerHeight);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx playwright test scripts/height-integration.spec.js --project=chromium`
Expected: FAIL

- [ ] **Step 3: 最小实现**

确保所有系统正确连接，修复任何集成问题。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx playwright test scripts/height-integration.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add game.html scripts/height-integration.spec.js
git commit -m "test(height): integration test for complete height system flow"
```

---

## 验收检查

完成所有Task后运行：

```bash
npx playwright test scripts/height-*.spec.js scripts/intermediate-*.spec.js scripts/phase-*.spec.js --project=chromium
```

确认所有测试通过。

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-30-phase2-height-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**