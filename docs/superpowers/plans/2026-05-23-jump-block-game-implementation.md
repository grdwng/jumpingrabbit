# 跳跳小方块 — TDD 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with TDD approach.
> 每个任务遵循 Red-Green-Refactor 循环：先写测试→验证失败→写最小实现→验证通过→重构

**Goal:** 用TDD方式构建一个3D卡通风格的跳跳小游戏

**Architecture:** 单HTML文件 + Three.js，内联所有代码。使用模块化结构组织

**Tech Stack:** Three.js (3D渲染), Web Audio API (音效), 单HTML文件

---

## 文件结构

```
index.html              # 主入口，所有代码内联
tests/
└── index.html          # 测试套件
```

---

## TDD 循环说明

每个任务的开发流程：
1. **RED** — 编写失败的测试（游戏功能尚未实现）
2. **GREEN** — 编写最小代码让测试通过
3. **REFACTOR** — 重构优化代码

---

## Task 1: 项目基础搭建

**文件:**
- Create: `index.html`
- Create: `tests/index.html`

**测试先写 (RED):**

```javascript
// tests/index.html 中添加测试
T.test('场景应该存在', () => {
  T.assert(game.scene !== undefined, 'Scene should exist');
});

T.test('相机应该正确配置', () => {
  T.assert(game.camera !== undefined, 'Camera should exist');
  T.assertEqual(game.camera.type, 'PerspectiveCamera', 'Should be PerspectiveCamera');
});

T.test('渲染器应该初始化', () => {
  T.assert(game.renderer !== undefined, 'Renderer should exist');
});
```

- [ ] **Step 1: 编写失败的测试** — 运行 `tests/index.html`，确认测试失败（game未定义）

- [ ] **Step 2: 编写最小实现** — 创建基本的Three.js场景

```javascript
class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7EC8E3);
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // ... 基础光照等
  }
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件，确认全部通过

- [ ] **Step 4: Commit**

```bash
git init && git add index.html tests/index.html && git commit -m "test: 项目基础 - 场景初始化 (TDD)"
```

---

## Task 2: 角色系统

**文件:**
- Modify: `index.html`
- Update: `tests/index.html`

**测试先写 (RED):**

```javascript
T.test('角色配置应该存在', () => {
  T.assert(game.characters !== undefined, 'Characters config should exist');
  T.assertEqual(Object.keys(game.characters).length, 5, 'Should have 5 characters');
});

T.test('应该能创建小兔子角色', () => {
  const rabbit = game.createCharacter('rabbit');
  T.assert(rabbit !== undefined, 'Rabbit character should be created');
  T.assert(rabbit.children.length > 0, 'Rabbit should have child meshes');
});

T.test('应该能创建所有5个角色', () => {
  ['rabbit', 'cat', 'bear', 'boy', 'girl'].forEach(type => {
    const char = game.createCharacter(type);
    T.assert(char !== undefined, `${type} should be creatable`);
  });
});

T.test('角色切换应该工作', () => {
  game.switchCharacter('cat');
  T.assertEqual(game.currentCharacter, 'cat', 'Current character should be cat');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认角色相关测试失败

- [ ] **Step 2: 编写最小实现** — 添加角色配置和createCharacter方法

```javascript
// 角色配置
this.characters = {
  rabbit: { name: '小兔子', color: 0xFFB6C1, bodyHeight: 0.6, earLength: 0.3 },
  cat: { name: '小猫咪', color: 0xFFA500, bodyHeight: 0.5 },
  bear: { name: '小熊', color: 0x8B4513, bodyHeight: 0.6 },
  boy: { name: '小男孩', color: 0x4169E1, bodyHeight: 0.7 },
  girl: { name: '小女孩', color: 0xFF69B4, bodyHeight: 0.65 }
};

this.currentCharacter = 'rabbit';

createCharacter(type) {
  const config = this.characters[type];
  const group = new THREE.Group();
  // 创建身体、头部、角色特定部件
  // ... 详细实现
  return group;
}

switchCharacter(type) {
  if (!this.characters[type]) return;
  this.scene.remove(this.player);
  this.currentCharacter = type;
  this.player = this.createCharacter(type);
  this.player.position.set(0, 0.5, 0);
  this.scene.add(this.player);
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 角色系统 - 5款角色模型 (TDD)"
```

---

## Task 3: 方块系统

**测试先写 (RED):**

```javascript
T.test('方块配置应该存在', () => {
  T.assert(game.blockConfig !== undefined, 'Block config should exist');
  T.assertEqual(game.blockConfig.width, 1.2, 'Width should be 1.2');
});

T.test('应该能创建普通方块', () => {
  const block = game.createBlock(0, 0, 'normal', 'coin');
  T.assert(block !== undefined, 'Block should be created');
  T.assertEqual(block.userData.type, 'normal', 'Block type should be normal');
});

T.test('应该能创建带奖励的方块', () => {
  const coinBlock = game.createBlock(0, 0, 'normal', 'coin');
  T.assertEqual(coinBlock.userData.reward, 'coin', 'Should have coin reward');
});

T.test('应该能创建起点和终点方块', () => {
  const startBlock = game.createBlock(0, 0, 'start', null);
  const endBlock = game.createBlock(0, 0, 'end', null);
  T.assertEqual(startBlock.userData.type, 'start', 'Block type should be start');
  T.assertEqual(endBlock.userData.type, 'end', 'Block type should be end');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认方块相关测试失败

- [ ] **Step 2: 编写最小实现** — 添加方块配置和createBlock方法

```javascript
this.blockConfig = { width: 1.2, height: 0.5, depth: 1.2 };

this.rewardGeometries = {
  coin: new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16),
  energy: new THREE.OctahedronGeometry(0.15),
  heart: new THREE.SphereGeometry(0.12, 16, 16)
};

createBlock(x, z, type = 'normal', reward = null) {
  const group = new THREE.Group();
  group.userData = { type, reward, x, z };
  // 创建方块几何体和材质
  // 根据类型添加边框效果
  // 添加奖励物品
  group.position.set(x * this.blockConfig.width, 0, z * this.blockConfig.depth);
  return group;
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 方块系统 - 带奖励的3D方块 (TDD)"
```

---

## Task 4: 跳跃机制和碰撞检测

**测试先写 (RED):**

```javascript
T.test('方向映射应该正确', () => {
  T.assertEqual(game.directionMap['ArrowUp'].x, 0, 'ArrowUp x should be 0');
  T.assertEqual(game.directionMap['ArrowUp'].z, -1, 'ArrowUp z should be -1');
  T.assertEqual(game.directionMap['ArrowRight'].x, 1, 'ArrowRight x should be 1');
});

T.test('游戏初始状态应该是waiting', () => {
  T.assertEqual(game.gameState, 'waiting', 'Initial state should be waiting');
});

T.test('跳跃持续时间应该正确', () => {
  T.assertEqual(game.jumpDuration, 400, 'Jump duration should be 400ms');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认跳跃相关测试失败

- [ ] **Step 2: 编写最小实现** — 添加方向映射、跳跃方法和碰撞检测

```javascript
this.gameState = 'waiting';
this.jumpDuration = 400;

this.directionMap = {
  'ArrowUp': { x: 0, z: -1 },
  'ArrowDown': { x: 0, z: 1 },
  'ArrowLeft': { x: -1, z: 0 },
  'ArrowRight': { x: 1, z: 0 }
};

startJump(direction) {
  this.gameState = 'jumping';
  // 跳跃动画实现
  // 完成后调用 onJumpComplete
}

onJumpComplete(x, z) {
  const block = this.checkBlockAt(x, z);
  if (block) {
    this.collectRewardAt(x, z);
    if (block.userData.type === 'end') {
      this.onVictory();
    } else {
      this.gameState = 'waiting';
    }
  } else {
    this.onDeath();
  }
}

checkBlockAt(x, z) {
  // 碰撞检测逻辑
}

onDeath() {
  this.lives--;
  if (this.lives <= 0) {
    this.onGameOver();
  } else {
    this.resetPlayerPosition();
  }
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 跳跃机制 - 方向键控制和碰撞检测 (TDD)"
```

---

## Task 5: 跟随相机系统

**测试先写 (RED):**

```javascript
T.test('相机偏移量应该正确', () => {
  T.assert(game.cameraOffset !== undefined, 'Camera offset should exist');
  T.assertEqual(game.cameraOffset.y, 5, 'Camera Y offset should be 5');
  T.assertEqual(game.cameraOffset.z, 8, 'Camera Z offset should be 8');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认相机偏移测试失败

- [ ] **Step 2: 编写最小实现** — 添加相机跟随逻辑

```javascript
this.cameraOffset = new THREE.Vector3(0, 5, 8);
this.cameraLookOffset = new THREE.Vector3(0, 0, -2);

updateCamera() {
  if (!this.player) return;
  const targetPos = this.player.position.clone().add(this.cameraOffset);
  this.camera.position.lerp(targetPos, 0.1);
  const lookAt = this.player.position.clone().add(this.cameraLookOffset);
  this.camera.lookAt(lookAt);
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 跟随相机系统 (TDD)"
```

---

## Task 6: 奖励系统

**测试先写 (RED):**

```javascript
T.test('初始分数应该是0', () => {
  T.assertEqual(game.score, 0, 'Initial score should be 0');
});

T.test('初始生命应该是3', () => {
  T.assertEqual(game.lives, 3, 'Initial lives should be 3');
});

T.test('初始能量应该是0', () => {
  T.assertEqual(game.energyCount, 0, 'Initial energy should be 0');
});

T.test('初始不应该有护盾', () => {
  T.assertEqual(game.hasShield, false, 'Initial should not have shield');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认奖励相关测试失败

- [ ] **Step 2: 编写最小实现** — 添加奖励收集和应用逻辑

```javascript
this.lives = 3;
this.score = 0;
this.energyCount = 0;
this.hasShield = false;

applyReward(type) {
  switch (type) {
    case 'coin':
      this.score += 100;
      break;
    case 'energy':
      this.energyCount++;
      if (this.energyCount >= 5) {
        this.energyCount = 0;
        this.activateShield();
      }
      break;
    case 'heart':
      this.lives = Math.min(this.lives + 1, 5);
      break;
  }
}

activateShield() {
  this.hasShield = true;
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 奖励系统 - 金币/能量/爱心 (TDD)"
```

---

## Task 7: 生命值和游戏状态机

**测试先写 (RED):**

```javascript
T.test('游戏状态应该可以转换', () => {
  game.gameState = 'paused';
  T.assertEqual(game.gameState, 'paused', 'State should be paused');
  game.gameState = 'playing';
  T.assertEqual(game.gameState, 'playing', 'State should be playing');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认状态转换测试失败（如果状态转换没有正确实现）

- [ ] **Step 2: 编写最小实现** — 添加游戏状态管理和UI更新

```javascript
onGameOver() {
  this.gameState = 'gameover';
  // 显示游戏结束UI
}

onVictory() {
  this.gameState = 'victory';
  // 显示胜利UI
  this.triggerCelebration();
}

resetLevelState() {
  this.lives = 3;
  this.score = 0;
  this.energyCount = 0;
  this.hasShield = false;
  this.gameState = 'waiting';
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 生命值和游戏状态机 (TDD)"
```

---

## Task 8: 关卡系统

**测试先写 (RED):**

```javascript
T.test('关卡数量应该是20', () => {
  T.assertEqual(game.levels.length, 20, 'Should have 20 levels');
});

T.test('第一关应该有起点和终点', () => {
  const level1 = game.levels[0];
  const hasStart = level1.blocks.some(b => b.type === 'start');
  const hasEnd = level1.blocks.some(b => b.type === 'end');
  T.assert(hasStart, 'Level 1 should have start block');
  T.assert(hasEnd, 'Level 1 should have end block');
});

T.test('应该能加载关卡', () => {
  game.loadLevel(1);
  T.assert(game.blocks.length > 0, 'Level 1 should load blocks');
  T.assertEqual(game.currentLevel, 1, 'Current level should be 1');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认关卡测试失败

- [ ] **Step 2: 编写最小实现** — 添加20关数据和加载逻辑

```javascript
this.levels = [
  { id: 1, name: '起步', blocks: [...] },
  { id: 2, name: '转向', blocks: [...] },
  // ... 共20关
];

loadLevel(levelId) {
  const level = this.levels.find(l => l.id === levelId);
  if (!level) return;

  this.currentLevel = levelId;
  this.blocks.forEach(block => this.scene.remove(block));
  this.blocks = [];

  level.blocks.forEach(data => {
    const block = this.createBlock(data.x, data.z, data.type, data.reward);
    this.scene.add(block);
    this.blocks.push(block);
  });

  // 重置玩家位置
  this.resetLevelState();
}

nextLevel() {
  if (this.currentLevel < this.levels.length) {
    this.loadLevel(this.currentLevel + 1);
  }
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 关卡系统 - 20关卡数据 (TDD)"
```

---

## Task 9: UI系统

**测试先写 (RED):**

```javascript
T.test('HUD元素应该存在', () => {
  T.assert(document.getElementById('hud') !== null, 'HUD element should exist');
  T.assert(document.getElementById('lives') !== null, 'Lives element should exist');
  T.assert(document.getElementById('score') !== null, 'Score element should exist');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认UI元素测试失败

- [ ] **Step 2: 编写最小实现** — 添加HUD HTML结构和更新逻辑

```html
<div id="hud" style="display:none;">
  <span id="lives">❤️❤️❤️</span>
  <span id="level">关卡 1</span>
  <span id="score">0</span>
</div>
```

```javascript
updateLivesDisplay() {
  const el = document.getElementById('lives');
  if (el) el.textContent = '❤️'.repeat(this.lives);
}

updateScoreDisplay() {
  const el = document.getElementById('score');
  if (el) el.textContent = this.score;
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: UI系统 - HUD和菜单 (TDD)"
```

---

## Task 10: 通关庆祝和彩蛋系统

**测试先写 (RED):**

```javascript
T.test('彩蛋关卡应该定义正确', () => {
  T.assert(game.easterEggLevels !== undefined, 'Easter egg levels should exist');
  T.assert(game.easterEggLevels.includes(5), 'Level 5 should be easter egg');
  T.assert(game.easterEggLevels.includes(10), 'Level 10 should be easter egg');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认彩蛋测试失败

- [ ] **Step 2: 编写最小实现** — 添加庆祝动画和彩蛋逻辑

```javascript
this.easterEggLevels = [5, 10, 15, 20];

triggerCelebration() {
  this.triggerScreenFlash();
  this.triggerStarExplosion();
  this.startCharacterDance();
  this.checkEasterEgg();
}

checkEasterEgg() {
  if (this.easterEggLevels.includes(this.currentLevel)) {
    this.triggerEasterEgg();
  }
}

triggerEasterEgg() {
  this.triggerCoinRain();
  this.triggerFireworks();
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 庆祝和彩蛋系统 (TDD)"
```

---

## Task 11: 音效系统

**测试先写 (RED):**

```javascript
T.test('AudioManager应该存在', () => {
  T.assert(game.audio !== undefined, 'Audio should exist');
});

T.test('应该能播放音效', () => {
  T.assert(typeof game.audio.playSound === 'function', 'playSound should be a function');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认音效测试失败

- [ ] **Step 2: 编写最小实现** — 添加AudioManager类

```javascript
class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playSound(type) {
    if (this.muted || !this.ctx) return;
    // Web Audio API 实现各种音效
  }

  toggleMute() {
    this.muted = !this.muted;
  }
}

this.audio = new AudioManager();
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 音效系统 (TDD)"
```

---

## Task 12: 背景主题和配色

**测试先写 (RED):**

```javascript
T.test('背景主题应该定义正确', () => {
  T.assertEqual(Object.keys(game.backgroundThemes).length, 5, 'Should have 5 themes');
  T.assert(game.backgroundThemes.sky !== undefined, 'Sky theme should exist');
  T.assert(game.backgroundThemes.night !== undefined, 'Night theme should exist');
});
```

- [ ] **Step 1: 编写失败的测试** — 确认主题测试失败

- [ ] **Step 2: 编写最小实现** — 添加主题配置和应用方法

```javascript
this.backgroundThemes = {
  sky: { name: '蓝天白云', sky: 0x7EC8E3, ground: 0x98D9A4 },
  sunset: { name: '夕阳余晖', sky: 0xFF7F50, ground: 0x8B4513 },
  night: { name: '星空夜景', sky: 0x1a1a2e, ground: 0x2d3436 },
  forest: { name: '森林绿意', sky: 0x90EE90, ground: 0x228B22 },
  candy: { name: '糖果色彩', sky: 0xFFB6C1, ground: 0xDDA0DD }
};

this.currentTheme = 'sky';

applyTheme(themeName) {
  const theme = this.backgroundThemes[themeName];
  if (!theme) return;
  this.currentTheme = themeName;
  this.scene.background = new THREE.Color(theme.sky);
}
```

- [ ] **Step 3: 验证测试通过** — 运行测试套件

- [ ] **Step 4: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 背景主题系统 (TDD)"
```

---

## Task 13: 最终集成和测试

- [ ] **Step 1: 运行完整测试套件** — 确保所有测试通过

```bash
# 在浏览器中打开 tests/index.html
# 确认所有测试通过
```

- [ ] **Step 2: 功能验证**
- [ ] 方向键控制跳跃
- [ ] 跳跃动画流畅
- [ ] 方块生成和奖励显示
- [ ] 碰撞检测正确
- [ ] 生命值系统运作
- [ ] 过关判断正确
- [ ] 庆祝动画触发
- [ ] UI显示正确

- [ ] **Step 3: Commit**

```bash
git add index.html tests/index.html && git commit -m "test: 完成游戏核心功能 - 最终集成 (TDD)"
```

---

## 自检清单

**TDD流程检查:**
- [ ] 每个任务都先写测试（RED阶段）
- [ ] 验证测试失败后才编写实现
- [ ] 编写最小代码让测试通过（GREEN阶段）
- [ ] 重构优化（REFACTOR阶段）
- [ ] 每个commit都是"test:"前缀

**功能覆盖检查:**
- [ ] 方向键控制跳跃，固定1格距离
- [ ] 跳跃动画流畅，400ms
- [ ] 方块正确生成，Cartoon风格 (1.2x0.5x1.2)
- [ ] 三种奖励正确收集和显示
- [ ] 生命值系统正常运作
- [ ] 跳空检测正确，触发死亡
- [ ] 关卡切换正常
- [ ] 20个关卡全部可玩
- [ ] 通关评价1-3星显示
- [ ] 5款可切换角色
- [ ] 通关庆祝动画和彩蛋
- [ ] 背景主题切换
- [ ] 方块配色方案

---

## 执行选择

**Plan complete and saved to `docs/superpowers/plans/2026-05-23-jump-block-game-implementation.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** — 使用 subagent-driven-development + TDD，每个任务派遣子代理执行 Red-Green-Refactor 循环

**2. Inline Execution** — 使用 executing-plans + TDD，在session中按批次执行

**Which approach?**