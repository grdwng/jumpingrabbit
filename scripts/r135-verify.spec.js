
import { test, expect } from '@playwright/test';

test('verify 16-20 R135 data via window.game', async ({ page }) => {
  await page.goto('http://localhost:8082/game.html');
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    return {
      totalLevels: window.game.levels.length,
      levels: [16, 17, 18, 19, 20].map(id => {
        const lvl = window.game.levels.find(l => l.id === id);
        if (!lvl) return null;
        return {
          id, name: lvl.name, blockCount: lvl.blocks.length,
          yMin: Math.min(...lvl.blocks.map(b => b.y)),
          yMax: Math.max(...lvl.blocks.map(b => b.y)),
          yRange: Math.max(...lvl.blocks.map(b => b.y)) - Math.min(...lvl.blocks.map(b => b.y)),
          zValues: [...new Set(lvl.blocks.map(b => b.z))],
          brightColors: [...new Set(lvl.blocks
            .filter(b => b.custom && b.custom.color)
            .map(b => '0x' + b.custom.color.toString(16).toUpperCase().padStart(6, '0'))
          )],
          oldStyleColors: [...new Set(lvl.blocks
            .filter(b => b.custom && b.custom.color)
            .map(b => '0x' + b.custom.color.toString(16).toUpperCase().padStart(6, '0'))
            .filter(c => ['0XFFE066', '0XFFCC00', '0X99E1FF', '0XE6B3FF', '0XFF99CC'].includes(c))
          )]
        };
      })
    };
  });

  console.log('Total levels:', data.totalLevels);
  for (const lvl of data.levels) {
    if (lvl) {
      console.log(`Level ${lvl.id} "${lvl.name}": ${lvl.blockCount} blocks, y=[${lvl.yMin},${lvl.yMax}] range=${lvl.yRange}, z=${JSON.stringify(lvl.zValues)}, ${lvl.brightColors.length} bright colors, ${lvl.oldStyleColors.length} old-style colors`);
    }
  }

  expect(data.totalLevels).toBe(30);
  for (const lvl of data.levels) {
    expect(lvl, `Level ${lvl.id} should exist`).not.toBeNull();
    expect(lvl.blockCount, `Level ${lvl.id} block count`).toBeGreaterThanOrEqual(12);
    expect(lvl.blockCount, `Level ${lvl.id} block count`).toBeLessThanOrEqual(15);
    expect(lvl.zValues.length, `Level ${lvl.id} should have Z variation`).toBeGreaterThan(1);
    expect(lvl.yRange, `Level ${lvl.id} should have Y range >= 4`).toBeGreaterThanOrEqual(4);
    expect(lvl.oldStyleColors.length, `Level ${lvl.id} should have no old-style colors`).toBe(0);
  }
});
