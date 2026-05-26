# 护盾系统与得分系统修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复护盾显示、护盾消耗逻辑、得分系统分离

**Architecture:** 修改 index.html 中的 Game 类：添加 totalScore 字段，修复 onFall() 中 baseY 未定义问题，添加 loadCurrentLevel 方法

**Tech Stack:** Electron + Three.js

---

## Task 1: 修复 onFall() 中 baseY 未定义问题

**Files:**
- Modify: `index.html:1229-1256`

- [ ] **Step 1: 查看当前 onFall 代码**

```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.audio.playSound('jump');
    this.gameState = 'waiting';
    return;
  }
  // ...
  this.player.position.set(0, baseY, 0);  // baseY 未定义
}
```

- [ ] **Step 2: 修复 - 移除未使用的 baseY 引用，改为计算正确位置**

```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.audio.playSound('jump');
    this.loadLevel(this.currentLevel);
    return;
  }
  // ... 后续代码不变
}
```

- [ ] **Step 3: 验证修复**

运行 `npm run build` 确保无编译错误

---

## Task 2: 添加 loadCurrentLevel 方法（护盾消耗后重新加载当前关卡）

**Files:**
- Modify: `index.html:974-993` (loadLevel 方法后添加新方法)

- [ ] **Step 1: 在 loadLevel 方法后添加 loadCurrentLevel 方法**

```javascript
loadCurrentLevel() {
  const baseY = this.blockConfig.height - this.scaledBottom + 3.1;
  this.player.position.set(0, baseY, 0);
  this.worldOffset = { x: 0, z: 0 };
  this.gameState = 'waiting';
  this.updateHUD();
}
```

- [ ] **Step 2: 修改 onFall 中护盾消耗逻辑使用新方法**

```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.audio.playSound('jump');
    this.loadCurrentLevel();
    return;
  }
  // ...
}
```

- [ ] **Step 3: 验证修复**

运行 `npm run build` 确保无编译错误

---

## Task 3: 添加 totalScore 字段并修改得分逻辑

**Files:**
- Modify: `index.html:339-345` (初始化) 和 `index.html:1138-1147` (onVictory)

- [ ] **Step 1: 在 Game 构造函数中添加 totalScore 字段**

```javascript
this.score = 0;
this.totalScore = 0;  // 新增：累积总分
this.coinCount = 0;
this.energyCount = 0;
this.shieldCount = 0;
```

- [ ] **Step 2: 修改 onVictory 方法，通关时加 100 分到 score，累加到 totalScore**

```javascript
onVictory() {
  this.audio.playSound('victory');
  this.gameState = 'victory';
  this.score += 100;        // 本关得分
  this.totalScore += 100;  // 累积总分
  // ... 后续代码不变
}
```

- [ ] **Step 3: 修改 updateHUD 显示 totalScore**

```javascript
updateHUD() {
  document.getElementById('lives').textContent = `❤️×${this.lives}`;
  document.getElementById('energy').textContent = `💎×${this.energyCount}/5`;
  document.getElementById('shield').textContent = `⚡️×${this.shieldCount}`;
  document.getElementById('score').textContent = `⭐×${this.totalScore}`;  // 显示累积总分
  document.getElementById('coins').textContent = `💰×${this.coinCount || 0}`;
  document.getElementById('level').textContent = `关卡 ${this.currentLevel}`;
}
```

- [ ] **Step 4: 验证修复**

运行 `npm run build` 确保无编译错误

---

## Task 4: 添加通关弹窗显示本关得分

**Files:**
- Modify: `index.html:1138-1170` (onVictory 方法中的弹窗逻辑)

- [ ] **Step 1: 查看当前 onVictory 中弹窗逻辑**

找到类似代码：
```javascript
const overlay = document.createElement('div');
overlay.id = 'victory-overlay';
overlay.innerHTML = `
  <h2>🎉 通关成功！</h2>
  <p>关卡 ${this.currentLevel} 完成！</p>
  <p>得分: ${this.score}</p>
  ...
`;
```

- [ ] **Step 2: 修改弹窗显示本关得分和累积总分**

```javascript
overlay.innerHTML = `
  <h2>🎉 通关成功！</h2>
  <p>关卡 ${this.currentLevel} 完成！</p>
  <p>本关得分: ⭐×100</p>
  <p>累计总分: ⭐×${this.totalScore}</p>
  <p>金币: 💰×${this.coinCount}</p>
  ...
`;
```

- [ ] **Step 3: 验证修复**

运行 `npm run build` 确保无编译错误

---

## Task 5: 重置游戏时也重置 totalScore

**Files:**
- Modify: `index.html:1241-1250` (gameover 确认重新开始)

- [ ] **Step 1: 查看 gameover 重新开始逻辑**

```javascript
if (confirm('💀 游戏结束！是否重新开始？')) {
  this.lives = 3;
  this.score = 0;
  this.energyCount = 0;
  this.loadLevel(1);
}
```

- [ ] **Step 2: 添加 totalScore 重置**

```javascript
if (confirm('💀 游戏结束！是否重新开始？')) {
  this.lives = 3;
  this.score = 0;
  this.totalScore = 0;  // 新增
  this.energyCount = 0;
  this.loadLevel(1);
}
```

- [ ] **Step 3: 验证修复**

运行 `npm run build` 确保无编译错误

---

## Task 6: 构建并复制到桌面

- [ ] **Step 1: 构建应用**

```bash
npm run build
```

- [ ] **Step 2: 复制到桌面**

```bash
cp -R dist/mac-arm64/JumpingRabbit.app /Users/gordonwangmbp/Desktop/JumpingRabbit.app
```

---

## 验收标准

- [ ] 护盾 ⚡️×0 在 HUD 正确显示
- [ ] 消耗护盾后 player 重置到起始位置，本关卡重新开始
- [ ] 通关显示本关得分 100 分
- [ ] 累积总分正确累加

---

## 执行选项

**1. Subagent-Driven (推荐)** - 每个任务派遣 subagent，复查后继续

**2. Inline Execution** - 在此 session 执行任务，分批确认

选择哪个？