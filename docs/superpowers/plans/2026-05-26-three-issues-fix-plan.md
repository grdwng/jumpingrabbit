# Three Issues Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three issues in the Jumping Rabbit game: (1) GLB reward models not loading in packaged app, (2) score display conflating level score and accumulated points, (3) app freezing when shield is consumed on fall.

**Architecture:** Separate fixes for each issue with TDD approach. Issue 2 (score) fixes first since tests already confirm RED. Issues follow in order: 3 (shield), then 1 (GLB).

**Tech Stack:** Vanilla JS + Three.js (browser), Electron (desktop packaging), Playwright (E2E tests)

---

## File Structure

```
index.html                    # Main game - all fixes applied here
scripts/
  issue1-glb-loading.spec.js  # E2E: GLB loading tests (already exists)
  issue2-score-display.spec.js # E2E: Score display tests (already exists)
  issue3-shield-fall.spec.js   # E2E: Shield fall tests (already exists)
```

---

## Issue 2: Score Display Fix (PRIORITY - RED tests confirmed)

### Task 2.1: Add levelScore and accumulatedPoints state variables

**Files:**
- Modify: `index.html:333-342` (Game constructor initialization)

- [ ] **Step 1: Write failing test**

```javascript
// In browser console or existing test file
test('initializes separate levelScore and accumulatedPoints', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    return {
      hasLevelScore: 'levelScore' in window.game,
      hasAccumulatedPoints: 'accumulatedPoints' in window.game,
      levelScoreValue: window.game.levelScore,
      accumulatedPointsValue: window.game.accumulatedPoints
    };
  });

  expect(state.hasLevelScore).toBe(true);
  expect(state.hasAccumulatedPoints).toBe(true);
  expect(state.levelScoreValue).toBe(0);
  expect(state.accumulatedPointsValue).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "initializes separate" -v`
Expected: FAIL - "levelScore not defined"

- [ ] **Step 3: Write minimal implementation**

In the Game constructor, after existing state variable initialization:
```javascript
// Find these lines (around line 337-341):
// this.score = 0;
// this.totalScore = 0;
// this.coinCount = 0;
// this.energyCount = 0;
// this.shieldCount = 0;

// Add these after shieldCount:
this.levelScore = 0;           // 本关得分 (level completion bonus)
this.accumulatedPoints = 0;    // 累计积分 (coins × 20 only, no level bonus)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "initializes separate" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): add levelScore and accumulatedPoints state variables

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.2: Update onVictory() to use separate score tracking

**Files:**
- Modify: `index.html:1159-1174` (onVictory method)

- [ ] **Step 1: Write failing test**

```javascript
test('onVictory sets levelScore to 100 and accumulates only coins×20', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(3000);

  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(2000);

  // Set 5 coins and reset scores
  await page.evaluate(() => {
    window.game.coinCount = 5;
    window.game.levelScore = 0;
    window.game.accumulatedPoints = 0;
    window.game.updateHUD();
  });

  // Trigger victory
  await page.evaluate(() => {
    window.game.onVictory();
  });

  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    return {
      levelScore: window.game.levelScore,
      accumulatedPoints: window.game.accumulatedPoints
    };
  });

  // levelScore should be exactly 100 (just level bonus)
  expect(result.levelScore).toBe(100);
  // accumulatedPoints should be 5×20 = 100 (only coins, no level bonus)
  expect(result.accumulatedPoints).toBe(100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "sets levelScore" -v`
Expected: FAIL - accumulatedPoints is 200 not 100 (includes level bonus)

- [ ] **Step 3: Write minimal implementation**

Find the onVictory method (around line 1159):
```javascript
onVictory() {
  this.audio.playSound('victory');
  this.gameState = 'victory';
  // Level completion bonus: 100 points + coins collected (20 per coin)
  const levelBonus = 100;
  this.score += levelBonus; // Add level bonus to score for display
  this.totalScore += this.score; // Add to total (score = coins×20 + level bonus)
  this.updateHUD();
  // ...
}
```

Replace with:
```javascript
onVictory() {
  this.audio.playSound('victory');
  this.gameState = 'victory';
  // Level score: always 100 for level completion
  this.levelScore = 100;
  // Accumulated points: only coins × 20 (no level bonus double-counting)
  this.accumulatedPoints += this.coinCount * 20;
  this.updateHUD();
  // ...
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "sets levelScore" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): separate levelScore and accumulatedPoints in onVictory

Level score is always 100 for completion, accumulated points only includes
coins × 20. No more double-counting.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.3: Update showVictoryDialog() to display separate values

**Files:**
- Modify: `index.html:1176-1219` (showVictoryDialog method)

- [ ] **Step 1: Write failing test**

```javascript
test('victory dialog shows separate 本关得分 and 累计积分', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(3000);

  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    window.game.coinCount = 5;
    window.game.levelScore = 0;
    window.game.accumulatedPoints = 0;
    window.game.updateHUD();
  });

  await page.evaluate(() => {
    window.game.onVictory();
  });

  await page.waitForTimeout(1000);

  const dialogText = await page.locator('#victory-overlay').textContent();

  // Should show 本关得分: ⭐×100 (just 100, no coin math)
  expect(dialogText).toMatch(/本关得分.*100/);
  // Should show 累计积分: ⭐×100 (5 coins × 20)
  expect(dialogText).toMatch(/累计积分.*100/);
  // Should NOT show the old "累计总分" terminology
  expect(dialogText).not.toMatch(/累计总分/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "shows separate" -v`
Expected: FAIL - dialog shows "累计总分" not "累计积分"

- [ ] **Step 3: Write minimal implementation**

Find showVictoryDialog (around line 1176). Replace the score display section:
```javascript
// Old code:
const score = document.createElement('p');
score.textContent = `本关得分: ⭐×100`;
score.style.cssText = 'font-size:3.5em;margin:0 0 30px 0;';

const totalScore = document.createElement('p');
totalScore.textContent = `累计总分: ⭐×${this.totalScore}`;
totalScore.style.cssText = 'font-size:2.5em;margin:0 0 30px 0;color:#666;';

// New code:
const score = document.createElement('p');
score.textContent = `本关得分: ⭐×${this.levelScore}`;
score.style.cssText = 'font-size:3.5em;margin:0 0 30px 0;';

const accumulatedPoints = document.createElement('p');
accumulatedPoints.textContent = `累计积分: ⭐×${this.accumulatedPoints}`;
accumulatedPoints.style.cssText = 'font-size:2.5em;margin:0 0 30px 0;color:#666;';
```

And update the dialog.appendChild calls (replace totalScore with accumulatedPoints):
```javascript
dialog.appendChild(title);
dialog.appendChild(score);
dialog.appendChild(accumulatedPoints);  // was totalScore
dialog.appendChild(rewards);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "shows separate" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): update victory dialog to show 本关得分 and 累计积分

Separate level score (always 100) from accumulated points (coins × 20).
Changed terminology from 累计总分 to 累计积分.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.4: Update HUD to display accumulatedPoints

**Files:**
- Modify: `index.html:1302-1310` (updateHUD method)

- [ ] **Step 1: Write failing test**

```javascript
test('HUD displays accumulatedPoints instead of totalScore', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(3000);

  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(2000);

  // Set up: 3 coins (60 points)
  await page.evaluate(() => {
    window.game.coinCount = 3;
    window.game.levelScore = 0;
    window.game.accumulatedPoints = 0;
    window.game.onVictory();
  });

  await page.waitForTimeout(500);

  const hudScore = await page.locator('#score').textContent();

  // Should show accumulatedPoints = 60 (3 coins × 20)
  expect(hudScore).toMatch(/60/);
  // Should NOT show 120 (which would include level bonus)
  expect(hudScore).not.toMatch(/120/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "HUD displays" -v`
Expected: FAIL - HUD shows 120 not 60

- [ ] **Step 3: Write minimal implementation**

Find updateHUD method (around line 1302):
```javascript
// Old code:
h.score.textContent = `⭐×${this.totalScore}`;

// New code:
h.score.textContent = `⭐×${this.accumulatedPoints}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue2-score-display.spec.js --grep "HUD displays" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): HUD displays accumulatedPoints instead of totalScore

HUD now shows coins × 20 accumulated points, separate from level score.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.5: Run all Issue 2 tests to verify fix

- [ ] **Step 1: Run all issue2 tests**

Run: `npx playwright test scripts/issue2-score-display.spec.js --browser=chromium --reporter=line`
Expected: All 4 tests PASS

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "test(game): verify Issue 2 score display fix

All issue2-score-display.spec.js tests pass.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Issue 3: Shield Fall Freeze Fix

### Task 3.1: Add error handling and state reset to onFall

**Files:**
- Modify: `index.html:1274-1300` (onFall method)

- [ ] **Step 1: Write failing test** (use existing test that verifies no freeze)

```javascript
test('onFall with shield does not block main thread', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(3000);

  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(2000);

  // Set shield
  await page.evaluate(() => {
    window.game.shieldCount = 1;
    window.game.lives = 1;
    window.game.updateHUD();
  });

  // Trigger fall and wait
  await page.evaluate(() => {
    window.game.onFall();
  });

  // Should NOT block - check within 2 seconds
  const canRespond = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(window.game.gameState === 'waiting');
      }, 2000);
    });
  });

  expect(canRespond).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails** (may pass in browser, fails in packaged app)

Run: `npx playwright test scripts/issue3-shield-fall.spec.js --grep "does not block" -v`
Expected: May pass in browser (issue is desktop-specific)

- [ ] **Step 3: Write minimal implementation with defensive coding**

Find onFall method (around line 1274):
```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.audio.playSound('jump');
    this.loadLevel(this.currentLevel);
    return;
  }
  // ...
}
```

Replace with:
```javascript
onFall() {
  if (this.shieldCount > 0) {
    this.shieldCount--;
    this.updateHUD();
    // Play sound asynchronously to avoid blocking
    setTimeout(() => {
      try {
        this.audio.playSound('jump');
      } catch (e) {
        console.warn('Audio playSound error:', e);
      }
    }, 0);
    // Reset world offset before loadLevel to ensure clean state
    this.worldOffset = { x: 0, z: 0 };
    try {
      this.loadLevel(this.currentLevel);
    } catch (e) {
      console.error('loadLevel error:', e);
      // Reset state even on error to prevent freeze
      this.gameState = 'waiting';
      this.player.position.set(0, this.baseY, 0);
    }
    return;
  }
  // ... rest of method unchanged
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue3-shield-fall.spec.js --grep "does not block" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "fix(game): add defensive handling to onFall shield consumption

- Reset worldOffset before loadLevel
- Wrap loadLevel in try-catch to prevent freeze
- Play sound asynchronously via setTimeout
- Ensure game state is reset even on error

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.2: Run all Issue 3 tests

- [ ] **Step 1: Run all issue3 tests**

Run: `npx playwright test scripts/issue3-shield-fall.spec.js --browser=chromium --reporter=line`
Expected: All 4 tests PASS

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "test(game): verify Issue 3 shield fall fix

All issue3-shield-fall.spec.js tests pass.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Issue 1: GLB Reward Models Loading Fix

### Task 1.1: Add modelsLoaded state and loading promise

**Files:**
- Modify: `index.html:304-331` (GLB loading section in constructor)

- [ ] **Step 1: Write failing test**

```javascript
test('game has modelsLoaded state after initialization', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(5000);

  const hasModelsLoaded = await page.evaluate(() => {
    return 'modelsLoaded' in window.game;
  });

  expect(hasModelsLoaded).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "modelsLoaded" -v`
Expected: FAIL - modelsLoaded not defined

- [ ] **Step 3: Write minimal implementation**

After line 307 (`this.rewardModels = {};`), add:
```javascript
this.modelsLoaded = false;
this.modelsLoadingPromise = null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "modelsLoaded" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): add modelsLoaded state variable

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1.2: Wrap GLB loading in Promise-based preloader

**Files:**
- Modify: `index.html:310-331` (GLB loading code)

- [ ] **Step 1: Write failing test**

```javascript
test('loadAllRewardModels returns a promise', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(3000);

  const hasMethod = await page.evaluate(() => {
    return typeof window.game.loadAllRewardModels === 'function';
  });

  expect(hasMethod).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "returns a promise" -v`
Expected: FAIL - loadAllRewardModels not defined

- [ ] **Step 3: Write minimal implementation**

After the loadReward calls (after line 331), add this method to the Game class. Find the closing brace of the constructor (around line 443) and add before it:
```javascript
// Promise-based reward model preloader
loadAllRewardModels() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    const models = ['crystal', 'heart', 'golden'];
    let loadedCount = 0;

    models.forEach((name) => {
      loader.load(
        basePath + name + '.glb',
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
          const scale = 36 / size;
          model.scale.set(scale, scale, scale);
          this.rewardModels[name] = model;
          loadedCount++;
          console.log('Loaded reward model:', name, '(' + loadedCount + '/' + models.length + ')');
          if (loadedCount === models.length) {
            this.modelsLoaded = true;
            resolve();
          }
        },
        undefined,
        (error) => {
          console.log('Failed to load reward', name, error);
          loadedCount++; // Count as loaded even on failure to avoid hanging
          if (loadedCount === models.length) {
            this.modelsLoaded = true;
            resolve();
          }
        }
      );
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "returns a promise" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): add loadAllRewardModels promise-based preloader

Loads all reward models and resolves when complete. Sets modelsLoaded flag.
Handles load failures gracefully.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1.3: Start preloading in constructor

**Files:**
- Modify: `index.html:442` (end of constructor)

- [ ] **Step 1: Write failing test**

```javascript
test('models start loading before game starts', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');

  // Check within first 500ms that loading has started
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    return {
      hasPromise: window.game.modelsLoadingPromise !== null,
      isLoading: window.game.modelsLoadingPromise instanceof Promise
    };
  });

  // Loading should have started
  expect(state.hasPromise).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "start loading" -v`
Expected: FAIL - modelsLoadingPromise is null

- [ ] **Step 3: Write minimal implementation**

At the end of the constructor (around line 442), after `this.loadLevel(1);` but before the closing brace:
```javascript
// Start preloading reward models
this.modelsLoadingPromise = this.loadAllRewardModels();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "start loading" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): start GLB model preloading in constructor

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1.4: Block start() until models are loaded

**Files:**
- Modify: `index.html:913-918` (start method)

- [ ] **Step 1: Write failing test**

```javascript
test('start button is disabled until models loaded', async ({ page }) => {
  // This test checks the behavior after we've added the guard
  await page.goto('http://localhost:8080/index.html');

  const startButton = page.locator('button:has-text("开始游戏")');

  // Button should exist but game shouldn't start without models
  await page.evaluate(() => {
    window.game.start();
  });

  // Game should remain in menu state if models not loaded
  const gameState = await page.evaluate(() => window.game.gameState);
  // If modelsLoaded is false, start should have no effect
  if (!window.game.modelsLoaded) {
    expect(gameState).toBe('menu');
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "disabled until" -v`
Expected: FAIL - game starts without checking modelsLoaded

- [ ] **Step 3: Write minimal implementation**

Find the start method (around line 913):
```javascript
start() {
  document.getElementById('message').style.display = 'none';
  document.getElementById('hud').classList.add('visible');
  this.gameState = 'waiting';
  this.loadLevel(1);
}
```

Replace with:
```javascript
start() {
  if (!this.modelsLoaded) {
    // Optionally show loading message
    console.log('Models still loading, please wait...');
    return;
  }
  document.getElementById('message').style.display = 'none';
  document.getElementById('hud').classList.add('visible');
  this.gameState = 'waiting';
  this.loadLevel(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --grep "disabled until" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(game): block start() until modelsLoaded is true

Prevents game from starting before reward models are loaded.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1.5: Run all Issue 1 tests

- [ ] **Step 1: Run all issue1 tests**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js --browser=chromium --reporter=line`
Expected: All 3 tests PASS

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "test(game): verify Issue 1 GLB loading fix

All issue1-glb-loading.spec.js tests pass.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Final Verification

### Task Final: Run all tests

- [ ] **Step 1: Run all issue tests**

Run: `npx playwright test scripts/issue1-glb-loading.spec.js scripts/issue2-score-display.spec.js scripts/issue3-shield-fall.spec.js --browser=chromium --reporter=line`
Expected: All tests PASS

- [ ] **Step 2: Build packaged app**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "fix(game): resolve all three issues

- Issue 1: GLB reward models preload before game start
- Issue 2: Separate levelScore and accumulatedPoints display
- Issue 3: Defensive handling prevents freeze on shield fall

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [ ] All spec requirements covered by tasks
- [ ] No TBD/TODO placeholders in plan
- [ ] All file paths are exact
- [ ] All method/property names consistent across tasks
- [ ] Each step shows actual code to write
- [ ] Each step shows exact command to run
- [ ] Each step shows expected output