import { test, expect } from '@playwright/test';

test.describe('Jumping Rabbit Game', () => {
  test('page loads without errors', async ({ page }) => {
    const errors = [];
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      errors.push(`Page Error: ${err.message}`);
    });

    await page.goto('http://localhost:8080/index.html');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Log all console messages
    console.log('All console output:', logs);
    console.log('Errors:', errors);

    // Check if module script ran
    const moduleScriptRan = await page.evaluate(() => {
      // Check if the script tag exists
      const scripts = document.querySelectorAll('script[type="module"]');
      return scripts.length > 0;
    });
    console.log('Module script tags found:', moduleScriptRan);

    expect(errors.length).toBe(0);
  });

  test('Three.js and game load correctly', async ({ page }) => {
    const errors = [];
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      errors.push(`Page Error: ${err.message}`);
    });

    await page.goto('http://localhost:8080/index.html');
    await page.waitForTimeout(5000);

    console.log('Console logs:', logs);
    console.log('Errors:', errors);

    // Check if game object exists
    const gameExists = await page.evaluate(() => typeof window.game !== 'undefined');
    console.log('Game object exists:', gameExists);

    // Check canvas
    const canvasCount = await page.locator('canvas').count();
    console.log('Canvas count:', canvasCount);

    // Check what HTML elements exist
    const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('Body HTML (first 500 chars):', bodyHTML);
  });
});