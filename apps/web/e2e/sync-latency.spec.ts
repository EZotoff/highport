import { test, expect } from '@playwright/test';

test.describe('Sync Latency', () => {
  test('graph changes sync within 500ms between two users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await Promise.all([
      page1.goto('/graph'),
      page2.goto('/graph'),
    ]);

    await Promise.all([
      page1.waitForSelector('.react-flow', { timeout: 10000 }),
      page2.waitForSelector('.react-flow', { timeout: 10000 }),
    ]);

    await page1.waitForTimeout(2000);

    const initialNodeCount = await page2.locator('.react-flow__node').count();

    const startTime = Date.now();
    await page1.locator('button:has-text("Add Node")').click();

    await page2.waitForFunction(
      (expectedCount) => {
        const nodes = document.querySelectorAll('.react-flow__node');
        return nodes.length > expectedCount;
      },
      initialNodeCount,
      { timeout: 5000 }
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    console.log(`Sync latency: ${latency}ms`);
    expect(latency).toBeLessThan(500);

    await context1.close();
    await context2.close();
  });

  test('node edit propagation syncs within 500ms between two users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await Promise.all([
      page1.goto('/graph'),
      page2.goto('/graph'),
    ]);

    await Promise.all([
      page1.waitForSelector('.react-flow', { timeout: 10000 }),
      page2.waitForSelector('.react-flow', { timeout: 10000 }),
    ]);

    // Allow time for initial sync
    await page1.waitForTimeout(2000);

    // Create a node in context1
    await page1.locator('button:has-text("Add Node")').click();
    await page1.waitForTimeout(500);

    // Wait for node to sync to context2
    await page2.waitForTimeout(1000);

    // Get the node in both contexts
    const node1 = page1.locator('.react-flow__node').first();
    const node2 = page2.locator('.react-flow__node').first();

    // Get initial position in context2
    const box2Before = await node2.boundingBox();
    expect(box2Before).toBeTruthy();

    // Start timer and drag node in context1
    const startTime = Date.now();
    const box1 = await node1.boundingBox();
    if (box1) {
      await page1.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
      await page1.mouse.down();
      await page1.mouse.move(box1.x + 150, box1.y + 150);
      await page1.mouse.up();
    }

    // Wait for position change to sync to context2
    let latency = 0;
    if (box2Before) {
      await page2.waitForFunction(
        (initialBox: { x: number; y: number }) => {
          const node = document.querySelector('.react-flow__node');
          if (!node) return false;
          const rect = node.getBoundingClientRect();
          return Math.abs(rect.x - initialBox.x) > 10 || Math.abs(rect.y - initialBox.y) > 10;
        },
        box2Before,
        { timeout: 5000 }
      );
    }

    const endTime = Date.now();
    latency = endTime - startTime;

    console.log(`Node edit propagation latency: ${latency}ms`);
    expect(latency).toBeLessThan(500);

    await context1.close();
    await context2.close();
  });

  test('table changes sync within 500ms between two users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await Promise.all([
      page1.goto('/reputation'),
      page2.goto('/reputation'),
    ]);

    await Promise.all([
      page1.waitForSelector('table', { timeout: 10000 }),
      page2.waitForSelector('table', { timeout: 10000 }),
    ]);

    await page1.waitForTimeout(2000);

    const testFactionName = `Latency-Test-${Date.now()}`;
    const startTime = Date.now();

    await page1.locator('button:has-text("Add Faction")').click();
    await page1.waitForTimeout(300);
    
    const nameInput = page1.locator('tbody tr').last().locator('td').first().locator('input');
    await nameInput.click();
    await nameInput.fill(testFactionName);
    await nameInput.blur();

    await page2.waitForFunction(
      (name) => {
        const inputs = document.querySelectorAll('input');
        return Array.from(inputs).some(input => (input as HTMLInputElement).value === name);
      },
      testFactionName,
      { timeout: 5000 }
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    console.log(`Table sync latency: ${latency}ms`);
    expect(latency).toBeLessThan(500);

    await context1.close();
    await context2.close();
  });
});
