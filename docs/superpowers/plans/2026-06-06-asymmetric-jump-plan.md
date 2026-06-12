# Asymmetric Jump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rabbit's upward jumps in intermediate levels 16-30 feel like "stepping up" by replacing the symmetric parabola with a 30/70 asymmetric arc and adding a brief landing stomp animation with a 5-frame block highlight flash.

**Architecture:** Add two new methods to the `Game` class in `game.html`: a pure-function `jumpTrajectory(t, profile)` and a side-effect `playLandingStomp(targetBlock, targetY)`. Wire both into `startJump` via a 5-line profile selector (gated on `bigJump && heightDiff>0 && 16≤level≤30`). Behavior outside that gate is byte-for-byte unchanged.

**Tech Stack:** Three.js (rendering), vanilla JS, Playwright (integration tests via `window.game`).

**Pre-validation (already confirmed by explore phase, no need to redo):**
- `this.currentLevel` exists (1-based integer) — `game.html:350, 1280`
- All `blockMaterials` have `.emissive` (Physical + Lambert both set it in constructor) — `game.html:270-300`
- Each block has its own material clone — `game.html:1168-1176` (no cross-block pollution risk)

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `game.html` | All game code (including `Game` class) | **Modify** — add 2 methods + ~8 lines in `startJump` |
| `scripts/asymmetric-jump.spec.js` | Playwright integration tests for new behavior | **Create** |
| `memory/MEMORY.md` | Project state log | **Modify** — append completion entry |

No new files outside `game.html` and the new spec.

---

## Task 1: Add `jumpTrajectory` pure function (TDD)

**Files:**
- Modify: `game.html:1426` (inside `Game` class, just before `startJump` method)
- Test: `scripts/asymmetric-jump.spec.js` (create file in this task)

- [ ] **Step 1.1: Create the spec file with failing test for `jumpTrajectory`**

Create `scripts/asymmetric-jump.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('jumpTrajectory returns 0 at t=0 for asymmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0, 'asymmetric'));
  expect(result).toBe(0);
});

test('jumpTrajectory peaks at t=0.3 for asymmetric (value=1)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0.3, 'asymmetric'));
  expect(result).toBe(1);
});

test('jumpTrajectory returns 0 at t=1 for asymmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(1, 'asymmetric'));
  expect(result).toBe(0);
});

test('jumpTrajectory at t=0.5 (descent half) is ~0.612 for asymmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0.5, 'asymmetric'));
  // 4 * 0.2857 * 0.7143 where s = (0.5-0.3)/0.7
  expect(result).toBeCloseTo(0.612, 2);
});

test('jumpTrajectory peaks at t=0.5 for symmetric (value=1, original behavior)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0.5, 'symmetric'));
  expect(result).toBe(1);
});

test('jumpTrajectory symmetric at t=0 returns 0', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => window.game.jumpTrajectory(0, 'symmetric'));
  expect(result).toBe(0);
});

test('jumpTrajectory is a pure function (call twice, same result)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const results = await page.evaluate(() => {
    const a = window.game.jumpTrajectory(0.4, 'asymmetric');
    const b = window.game.jumpTrajectory(0.4, 'asymmetric');
    return [a, b];
  });
  expect(results[0]).toBe(results[1]);
});
```

- [ ] **Step 1.2: Run the new spec to confirm it fails**

Run: `npx playwright test scripts/asymmetric-jump.spec.js -g "jumpTrajectory" --reporter=line 2>&1 | tail -20`
Expected: FAIL with `TypeError: window.game.jumpTrajectory is not a function`

- [ ] **Step 1.3: Add `jumpTrajectory` method to Game class**

In `game.html`, just before `startJump(dir, targetBlock, bigJump = false) {` (around line 1426), insert:

```js
      /**
       * Maps normalized time t∈[0,1] to y ratio∈[0,1] (0=start, 1=peak).
       * Pure function: no side effects on `this`.
       * @param {number} t normalized time
       * @param {'symmetric'|'asymmetric'} profile
       * @returns {number} y ratio
       */
      jumpTrajectory(t, profile) {
        if (profile === 'asymmetric') {
          if (t <= 0.3) {
            const s = t / 0.3;
            return 4 * s * (1 - s);
          }
          const s = (t - 0.3) / 0.7;
          return 4 * s * (1 - s);
        }
        return 4 * t * (1 - t);
      }

```

- [ ] **Step 1.4: Run the new spec to confirm it passes**

Run: `npx playwright test scripts/asymmetric-jump.spec.js -g "jumpTrajectory" --reporter=line 2>&1 | tail -15`
Expected: 7 passed

- [ ] **Step 1.5: Commit**

```bash
git add game.html scripts/asymmetric-jump.spec.js
git commit -m "feat(jump): add jumpTrajectory pure function with 30/70 asymmetric profile"
```

---

## Task 2: Add `playLandingStomp` method (TDD)

**Files:**
- Modify: `game.html` (add method right after `jumpTrajectory`)
- Test: `scripts/asymmetric-jump.spec.js` (add tests in same file)

- [ ] **Step 2.1: Add failing test for `playLandingStomp`**

Append to `scripts/asymmetric-jump.spec.js`:

```js
test('playLandingStomp does not throw when targetBlock is null', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  const error = await page.evaluate(() => {
    try {
      window.game.playLandingStomp(null, 100);
      return null;
    } catch (e) {
      return e.message;
    }
  });
  expect(error).toBeNull();
});

test('playLandingStomp applies stomp offset based on targetY baseline (not current y)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  // Set player y to a known value, then call stomp. After stomp ends, y should be back to targetY.
  const result = await page.evaluate(async () => {
    const targetY = 150;
    window.game.player.position.y = targetY;
    window.game.playLandingStomp(null, targetY);  // null block, no emissive to wait for
    // Wait long enough for 80ms stomp to finish + buffer
    await new Promise(r => setTimeout(r, 200));
    return window.game.player.position.y;
  });
  // After stomp ends, player y must equal targetY (baseline preserved)
  expect(result).toBeCloseTo(150, 0);
});
```

- [ ] **Step 2.2: Run the new tests to confirm they fail**

Run: `npx playwright test scripts/asymmetric-jump.spec.js -g "playLandingStomp" --reporter=line 2>&1 | tail -15`
Expected: FAIL with `TypeError: window.game.playLandingStomp is not a function`

- [ ] **Step 2.3: Add `playLandingStomp` method to Game class**

In `game.html`, right after the `jumpTrajectory` method added in Task 1, insert:

```js
      /**
       * Plays a 80ms "landing stomp" animation: rabbit y micro-bounce + target block emissive flash.
       * Does NOT change gameState (player input remains blocked by parent 'jumping' state).
       * @param {THREE.Object3D|null} targetBlock - landing block (null = skip emissive flash)
       * @param {number} targetY - baseline y to bounce around (not the current player y)
       */
      playLandingStomp(targetBlock, targetY) {
        const STOMP_DURATION = 80;
        const DIP = 2.5;
        const REBOUND = 0.9;
        const stompStart = performance.now();

        const origEmissive = (targetBlock && targetBlock.material && targetBlock.material.emissive)
          ? targetBlock.material.emissive.getHex()
          : null;

        const animate = (now) => {
          const t = Math.min((now - stompStart) / STOMP_DURATION, 1);

          // Micro-bounce: 0 -> -DIP (at t=0.5) -> +REBOUND (at t=1)
          let offset;
          if (t < 0.5) {
            offset = -DIP * (t / 0.5);
          } else {
            const s = (t - 0.5) / 0.5;
            offset = -DIP + (REBOUND + DIP) * s;
          }
          this.player.position.y = targetY + offset;

          // Block emissive flash: white intensity 0.6 -> 0
          if (targetBlock && targetBlock.material && targetBlock.material.emissive) {
            const intensity = 0.6 * (1 - t);
            targetBlock.material.emissive.setRGB(intensity, intensity, intensity);
          }

          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            // Cleanup: snap y to baseline, restore emissive
            this.player.position.y = targetY;
            if (origEmissive !== null && targetBlock.material.emissive) {
              targetBlock.material.emissive.setHex(origEmissive);
            }
          }
        };
        requestAnimationFrame(animate);
      }

```

- [ ] **Step 2.4: Run the new tests to confirm they pass**

Run: `npx playwright test scripts/asymmetric-jump.spec.js -g "playLandingStomp" --reporter=line 2>&1 | tail -15`
Expected: 2 passed (or 9 passed total)

- [ ] **Step 2.5: Commit**

```bash
git add game.html scripts/asymmetric-jump.spec.js
git commit -m "feat(jump): add playLandingStomp method for landing micro-bounce and block flash"
```

---

## Task 3: Wire `startJump` to use `profile` and call stomp (no new test — integration tested in Task 4)

**Files:**
- Modify: `game.html:1426-1529` (3 small edits to `startJump`)

- [ ] **Step 3.1: Add profile selection in `startJump`**

In `game.html` inside `startJump`, **after** the line `const startTime = performance.now();` (around line 1442), insert:

```js

        // Profile selection: asymmetric only for upward jump in intermediate levels
        const currentHeight = this.playerPosition.y || 0;
        const targetHeightCalc = isInPlace
          ? currentHeight
          : (targetBlock ? (targetBlock.userData.y || 0) : currentHeight);
        const heightDiff = targetHeightCalc - currentHeight;
        const isIntermediateLevel = this.currentLevel >= 16 && this.currentLevel <= 30;
        const profile = (bigJump && heightDiff > 0 && isIntermediateLevel)
          ? 'asymmetric'
          : 'symmetric';
```

⚠️ **Note**: The existing code at `game.html:1447` already has a `const targetHeight = ...` line. Our new `targetHeightCalc` uses a different name to avoid shadowing. The existing `targetY` calculation that uses `targetHeight` (line 1448) remains untouched.

- [ ] **Step 3.2: Replace the parabola computation in the animate closure**

In `game.html` inside the `animate` function (currently around line 1459), replace:

```js
          // Pure parabolic jump trajectory: 4*t*(1-t) creates a perfect parabola
          // that peaks at t=0.5 with value 1
          const parabola = 4 * t * (1 - t);
```

with:

```js
          // Trajectory: symmetric (50/50) by default; asymmetric (30/70) for upward jumps in levels 16-30
          const parabola = this.jumpTrajectory(t, profile);
```

- [ ] **Step 3.3: Trigger `playLandingStomp` at landing**

In `game.html` inside the `else` branch when `t >= 1` (around line 1521-1525), find this block:

```js
            // Reset player position and rotation to targetY, restore base scale
            this.player.position.set(0, targetY, 0);
            this.player.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
            this.player.scale.set(baseScale, baseScale, baseScale);
            this.onLand();
```

Insert the stomp call **before** `this.onLand();`:

```js
            // Trigger landing stomp for asymmetric upward jumps (excludes in-place jumps)
            if (profile === 'asymmetric' && targetBlock && !isInPlace) {
              this.playLandingStomp(targetBlock, targetY);
            }
```

- [ ] **Step 3.4: Sanity check: open game in dev server and inspect**

Run: `npx http-server . -p 8080 &` (in background, or rely on existing dev server)
Then: `curl -s http://localhost:8080/game.html | grep -c "jumpTrajectory\|playLandingStomp"`
Expected: `2` (or more, confirming both function names appear)

- [ ] **Step 3.5: Commit**

```bash
git add game.html
git commit -m "feat(jump): wire startJump to use profile and trigger stomp on asymmetric landings"
```

---

## Task 4: Integration test — asymmetric behavior in level 16

**Files:**
- Test: `scripts/asymmetric-jump.spec.js` (append)

- [ ] **Step 4.1: Add failing integration test**

Append to `scripts/asymmetric-jump.spec.js`:

```js
test('level 16+ upward jump uses asymmetric trajectory (peak at t=0.3 of duration)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("开始游戏")');
  await page.waitForTimeout(1000);

  // Load level 16 explicitly (intermediate)
  await page.evaluate(() => {
    window.game.loadLevel(16);
  });
  await page.waitForTimeout(500);

  // Manually invoke jumpTrajectory with the gating logic for level 16
  const playerYAtT = await page.evaluate(() => {
    // For level 16, bigJump, heightDiff=1: profile should be 'asymmetric'
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';

    // Sample 5 points along the trajectory
    const samples = [];
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const p = window.game.jumpTrajectory(t, profile);
      samples.push({ t, p });
    }
    return samples;
  });

  // For asymmetric, the peak ratio (p) should be 1 at t=0.3, NOT at t=0.5
  const pAtT03 = playerYAtT.find(s => s.t === 0.3).p;
  const pAtT05 = playerYAtT.find(s => s.t === 0.5).p;
  expect(pAtT03).toBe(1);   // peak
  expect(pAtT05).toBeLessThan(1);  // already descending
  expect(pAtT05).toBeCloseTo(0.612, 2);
});
```

- [ ] **Step 4.2: Run integration test**

Run: `npx playwright test scripts/asymmetric-jump.spec.js -g "level 16" --reporter=line 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 4.3: Commit**

```bash
git add scripts/asymmetric-jump.spec.js
git commit -m "test(jump): integration test for asymmetric trajectory in level 16"
```

---

## Task 5: Regression test — level 1 unchanged

**Files:**
- Test: `scripts/asymmetric-jump.spec.js` (append)

- [ ] **Step 5.1: Add regression test**

Append to `scripts/asymmetric-jump.spec.js`:

```js
test('level 1 (beginner, flat) still uses symmetric trajectory (no behavior change)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 1;  // beginner
    const pSym = window.game.jumpTrajectory(0.5, 'symmetric');
    // For level 1 (not in 16-30), profile selection would yield 'symmetric' even for bigJump
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return { pSym, profile };
  });
  expect(result.pSym).toBe(1);
  expect(result.profile).toBe('symmetric');
});

test('level 30 (boundary) uses asymmetric trajectory', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 30;
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return profile;
  });
  expect(result).toBe('asymmetric');
});

test('level 31 (outside range) falls back to symmetric', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 31;
    const bigJump = true;
    const heightDiff = 1;
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return profile;
  });
  expect(result).toBe('symmetric');
});

test('level 16 with heightDiff=0 uses symmetric (only upward triggers)', async ({ page }) => {
  await page.goto('http://localhost:8080/game.html');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    window.game.currentLevel = 16;
    const bigJump = true;
    const heightDiff = 0;  // same-level jump
    const isIntermediateLevel = window.game.currentLevel >= 16 && window.game.currentLevel <= 30;
    const profile = (bigJump && heightDiff > 0 && isIntermediateLevel) ? 'asymmetric' : 'symmetric';
    return profile;
  });
  expect(result).toBe('symmetric');
});
```

- [ ] **Step 5.2: Run regression test**

Run: `npx playwright test scripts/asymmetric-jump.spec.js -g "level 1|level 30|level 31|heightDiff=0" --reporter=line 2>&1 | tail -20`
Expected: 4 passed

- [ ] **Step 5.3: Commit**

```bash
git add scripts/asymmetric-jump.spec.js
git commit -m "test(jump): regression tests for symmetric fallback outside intermediate range"
```

---

## Task 6: Run full spec file + manual visual check

**Files:** none (verification only)

- [ ] **Step 6.1: Run the entire spec file**

Run: `npx playwright test scripts/asymmetric-jump.spec.js --reporter=line 2>&1 | tail -20`
Expected: 14 passed (7 trajectory + 2 stomp + 1 level 16 + 4 regression)

If any fail, do NOT commit Task 6.4. Investigate and fix first.

- [ ] **Step 6.2: Run the existing related specs to confirm no regression**

Run: `npx playwright test scripts/height-jump.spec.js scripts/intermediate-levels.spec.js --reporter=line 2>&1 | tail -15`
Expected: all still pass

- [ ] **Step 6.3: Manual visual check**

Run: `./start.sh` (project's start script, already in repo)
Then:
1. Click "开始游戏"
2. Press `1` `6` `Enter` to load level 16 (or click through menu)
3. Find a y=0 → y=1 stair, press `Space + Arrow` to jump up
4. **Verify**: rabbit visibly goes up faster, comes down slower, lands with a brief "stomp" bounce
5. Find a same-level jump in level 16, press `Arrow`
6. **Verify**: trajectory feels unchanged (50/50 parabola)
7. (Optional) Load level 1, jump around, **verify**: all behavior identical to before

- [ ] **Step 6.4: Update memory and final commit**

Append to `memory/MEMORY.md`:

```markdown

## 2026-06-06: 非对称跳跃实施完成 ✅

**范围**: 16-30 关卡（中级），仅 heightDiff=1 的上台阶跳
**Commits**:
- 734da3a docs: asymmetric jump design
- (Task 1) feat(jump): add jumpTrajectory pure function
- (Task 2) feat(jump): add playLandingStomp method
- (Task 3) feat(jump): wire startJump to profile + stomp
- (Task 4) test(jump): integration test level 16
- (Task 5) test(jump): regression tests

**测试**: scripts/asymmetric-jump.spec.js — 14 passed
**回归**: scripts/height-jump.spec.js + scripts/intermediate-levels.spec.js — 仍 pass
**视觉**: ./start.sh 验证 16-30 上台阶手感；1-15 行为不变
```

Then commit:

```bash
git add memory/MEMORY.md
git commit -m "docs(memory): record asymmetric jump implementation complete"
```

---

## Self-Review Checklist

Before declaring done, verify:

- [ ] All 4 spec sections (§3.1 pure function, §3.2 stomp, §3.3 startJump wiring, §6 testing) covered
- [ ] No placeholders in plan steps
- [ ] Function/method names consistent across tasks (`jumpTrajectory`, `playLandingStomp`, `profile`, `targetY`)
- [ ] All 14 expected test cases have explicit test code
- [ ] Risk pre-validation result (3 risks) is documented and informed plan
- [ ] TDD pattern respected: each new function has failing test first, then implementation
- [ ] Frequent commits: 6 commits minimum (1 per task + 1 memory)
- [ ] YAGNI: no `stompActive` flag, no `JumpProfile` data object, no sound effect
