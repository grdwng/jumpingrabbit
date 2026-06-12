# 跳跳小方块游戏 - 三个问题修复设计

> 日期: 2026-05-26
> 状态: 进行中

## 1. 概述

修复跳跳小方块游戏中三个独立的问题：

1. **Issue 1 (GLB模型加载)**: 奖励模型(crystal.glb, heart.glb, golden.glb)在打包后的桌面应用中无法加载
2. **Issue 2 (得分显示)**: 得分/积分术语混淆，关卡得分和累积积分计算错误
3. **Issue 3 (护盾跌落)**: 桌面应用中护盾消耗后应用卡死

## 2. 问题分析

### Issue 1: GLB模型加载失败

**现象**: 在浏览器中测试通过，但打包成桌面应用后模型静默加载失败

**根因分析**:
- 代码使用 `process.resourcesPath + '/assets/'` 路径
- 在开发环境(`npm start`): `./assets/` 正常工作
- 在打包后应用: 资源文件在 `app.asar` 内部，路径解析可能出错
- GLB加载是异步的，但游戏循环立即开始，无加载等待

**关键代码 (index.html:304-331)**:
```javascript
const isElectron = typeof window.require !== 'undefined';
const resourcesPath = isElectron && typeof process !== 'undefined' ? process.resourcesPath : '';
const basePath = isElectron ? resourcesPath + '/assets/' : './assets/';
```

### Issue 2: 得分系统混乱

**现象**: 术语混用（得分/积分），计算逻辑错误

**当前行为**:
- HUD显示 `⭐×totalScore`
- victory对话框显示 "本关得分: ⭐×100" 和 "累计总分: ⭐×X"
- 但 `totalScore = score + levelBonus`，score包含金币×20的累积

**期望行为**:
- "本关得分": 只显示关卡完成奖励100分
- "累计积分": 只显示金币收集的累积分数 (coins × 20)
- 两者分开显示，互不含糊

**关键代码 (index.html:1159-1165)**:
```javascript
onVictory() {
  this.score += levelBonus;      // score = coins×20 + levelBonus
  this.totalScore += this.score; // totalScore 双重计算
}
```

### Issue 3: 护盾跌落卡死

**现象**: 在浏览器中测试通过，但桌面应用卡死

**当前行为**:
- 掉落后如果shielCount > 0，调用loadLevel()
- 浏览器中工作正常
- 桌面应用卡死，无错误日志

**可能根因**:
- loadLevel()可能存在异步操作或清理不完整
- 可能在清理blocks时出现死循环
- 音频播放可能阻止主线程

**关键代码 (index.html:1274-1279)**:
```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.audio.playSound('jump');
    this.loadLevel(this.currentLevel); // 可能阻塞
    return;
  }
  // ...
}
```

## 3. 修复方案

### Issue 1: GLB模型预加载

**方案**: Promise-based预加载

1. 创建 `loadAllRewardModels()` 返回Promise
2. 所有模型加载完成后才允许开始游戏
3. 添加加载状态标志 `modelsLoaded`

**修改点**:
```javascript
// 添加加载状态
this.modelsLoaded = false;
this.modelsLoadingPromise = null;

// 预加载函数
async loadAllRewardModels() {
  const loader = new GLTFLoader();
  const names = ['crystal', 'heart', 'golden'];
  await Promise.all(names.map(name =>
    new Promise((resolve, reject) => {
      loader.load(
        basePath + name + '.glb',
        (gltf) => { /* scale and store */ resolve(); },
        undefined,
        (error) => { console.error('Failed:', name, error); resolve(); } // resolve anyway
      );
    })
  ));
  this.modelsLoaded = true;
}

// start()前检查
start() {
  if (!this.modelsLoaded) {
    alert('模型加载中，请稍候...');
    return;
  }
  // ...
}
```

### Issue 2: 得分系统分离

**方案**: 分离 levelScore 和 accumulatedPoints

1. 添加 `levelScore` (本关得分) 和 `accumulatedPoints` (累计积分)
2. HUD显示 accumulatedPoints
3. Victory对话框分开显示两者

**修改点**:
```javascript
// 初始化
this.levelScore = 0;
this.accumulatedPoints = 0;

// onVictory()
onVictory() {
  this.levelScore = 100; // 本关固定100分
  this.accumulatedPoints += this.coinCount * 20; // 只加金币积分
  // 不再加levelBonus到accumulated
}

// showVictoryDialog()
showVictoryDialog() {
  // 本关得分: ⭐×100
  // 累计积分: ⭐×{accumulatedPoints}
}
```

**验收标准**:
- [ ] 对话框显示"本关得分: ⭐×100"（只有100，不含金币）
- [ ] 对话框显示"累计积分: ⭐×X"（只有coins×20）
- [ ] HUD显示⭐×{accumulatedPoints}

### Issue 3: 护盾跌落修复

**方案**: 诊断 + 修复，可能需要添加超时保护

1. 检查loadLevel()中是否有阻塞操作
2. 确保block清理不会死循环
3. 添加try-catch保护

**修改点**:
```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.updateHUD();
    // 异步播放音效，不阻塞
    setTimeout(() => this.audio.playSound('jump'), 0);
    // 带保护的重载
    try {
      this.loadLevel(this.currentLevel);
    } catch (e) {
      console.error('loadLevel error:', e);
      this.gameState = 'waiting';
    }
    return;
  }
  // ...
}
```

## 4. 实施顺序

1. **Issue 2** (得分) - 先修复，已确认RED测试
2. **Issue 3** (护盾) - 诊断后修复
3. **Issue 1** (GLB) - 最后修复

## 5. 修改文件

- `index.html`: 主要游戏逻辑修改
- `scripts/issue2-score-display.spec.js`: 得分测试(已存在)
- `scripts/issue3-shield-fall.spec.js`: 护盾测试(已存在)
- `scripts/issue1-glb-loading.spec.js`: GLB测试(已存在)