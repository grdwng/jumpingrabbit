import { test, expect } from '@playwright/test';

test.describe('护盾系统测试', () => {
  test('HUD显示护盾⚡️图标', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    // 开始游戏
    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // 检查HUD中护盾显示
    const shieldElement = page.locator('#shield');
    await expect(shieldElement).toBeVisible();
    const shieldText = await shieldElement.textContent();
    console.log('护盾显示:', shieldText);
    expect(shieldText).toContain('⚡️');
  });

  test('护盾消耗后重新加载当前关卡', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // 设置护盾数量为1，模拟掉落
    await page.evaluate(() => {
      window.game.shieldCount = 1;
      window.game.lives = 1;
      window.game.updateHUD();
    });

    await page.waitForTimeout(500);

    // 模拟掉落 - 调用onFall
    await page.evaluate(() => {
      window.game.onFall();
    });

    await page.waitForTimeout(500);

    // 检查护盾数量应该减1
    const shieldCount = await page.evaluate(() => window.game.shieldCount);
    console.log('消耗后护盾数量:', shieldCount);
    expect(shieldCount).toBe(0);

    // 检查游戏状态应该是waiting（重新开始）
    const gameState = await page.evaluate(() => window.game.gameState);
    console.log('游戏状态:', gameState);
    expect(gameState).toBe('waiting');

    // 无错误
    expect(errors.length).toBe(0);
  });

  test('通关后得分系统正确', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // 初始分数应为0
    const initialTotalScore = await page.evaluate(() => window.game.totalScore);
    console.log('初始总分:', initialTotalScore);
    expect(initialTotalScore).toBe(0);

    // 设置一些金币和能量 - score需要手动设置因为是通过collectReward累积的
    await page.evaluate(() => {
      window.game.coinCount = 5;
      window.game.score = 100; // 5金币×20分
      window.game.energyCount = 3;
      window.game.updateHUD();
    });

    // 触发通关
    await page.evaluate(() => {
      window.game.onVictory();
    });

    await page.waitForTimeout(500);

    // 检查总分 = score(100金币得分) = 100
    const finalTotalScore = await page.evaluate(() => window.game.totalScore);
    console.log('通关后总分:', finalTotalScore);
    expect(finalTotalScore).toBe(200); // 5金币×20 + 100关卡得分

    // 检查HUD显示总分
    const hudScore = await page.locator('#score').textContent();
    console.log('HUD分数显示:', hudScore);
    expect(hudScore).toContain('200');
  });
});

test.describe('得分系统测试', () => {
  test('累积总分正确计算', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("开始游戏")');
    await page.waitForTimeout(2000);

    // 第一关通关 - 需要先设置score(来自收集的金币)
    await page.evaluate(() => {
      window.game.coinCount = 3;
      window.game.score = 60; // 3金币×20分
      window.game.onVictory();
    });
    await page.waitForTimeout(500);

    const totalAfterLevel1 = await page.evaluate(() => window.game.totalScore);
    console.log('第一关后总分:', totalAfterLevel1);
    expect(totalAfterLevel1).toBe(160); // 3金币×20 + 100关卡得分

    // 点继续进入第二关（模拟）
    await page.click('button:has-text("进入下一关")');
    await page.waitForTimeout(1000);

    // 第二关通关 - 进入新关卡score会重置为0，然后收集5金币
    await page.evaluate(() => {
      window.game.coinCount = 5;
      window.game.score = 100; // 5金币×20分
      window.game.onVictory();
    });
    await page.waitForTimeout(500);

    const totalAfterLevel2 = await page.evaluate(() => window.game.totalScore);
    console.log('第二关后总分:', totalAfterLevel2);
    expect(totalAfterLevel2).toBe(360); // 160(第一关) + 5金币×20 + 100关卡得分
  });
});