import { test, expect } from '@playwright/test';

test.describe('Sync Latency', () => {
  test.fixme('graph changes sync within 500ms between two users', async ({ browser }) => {
    // Fixme: Multi-user sync tests are flaky due to shared Hocuspocus room (default:graph)
    // Proper fix requires per-test room isolation on the server side
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/graph');
    await page1.waitForSelector('.react-flow', { timeout: 30000 });
    await page1.evaluate(() => indexedDB.deleteDatabase('planeshift-graph'));
    await page1.reload();
    await page1.waitForSelector('.react-flow', { timeout: 30000 });
    
    await page2.goto('/graph');
    await page2.waitForSelector('.react-flow', { timeout: 30000 });

    await page1.waitForTimeout(3000);

    const initialNodeCount = await page2.locator('.react-flow__node').count();

    const startTime = Date.now();
    await page1.locator('button:has-text("Add Node")').click();

    await page2.waitForFunction(
      (expectedCount) => {
        const nodes = document.querySelectorAll('.react-flow__node');
        return nodes.length > expectedCount;
      },
      initialNodeCount,
      { timeout: 10000 }
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    console.log(`Sync latency: ${latency}ms`);
    expect(latency).toBeLessThan(500);

    await context1.close();
    await context2.close();
  });

  test.fixme('node edit propagation syncs within 500ms between two users', async ({ browser }) => {
    // Fixme: Multi-user sync tests are flaky due to shared Hocuspocus room (default:graph)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/graph');
    await page1.waitForSelector('.react-flow', { timeout: 30000 });
    await page1.evaluate(() => indexedDB.deleteDatabase('planeshift-graph'));
    await page1.reload();
    await page1.waitForSelector('.react-flow', { timeout: 30000 });
    
    await page2.goto('/graph');
    await page2.waitForSelector('.react-flow', { timeout: 30000 });

    await page1.waitForTimeout(3000);

    await page1.locator('button:has-text("Add Node")').click();
    await page1.waitForTimeout(500);

    await page2.waitForTimeout(1500);

    const node1 = page1.locator('.react-flow__node').first();
    const node2 = page2.locator('.react-flow__node').first();

    const box2Before = await node2.boundingBox();
    expect(box2Before).toBeTruthy();

    const startTime = Date.now();
    const box1 = await node1.boundingBox();
    if (box1) {
      await page1.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
      await page1.mouse.down();
      await page1.mouse.move(box1.x + 150, box1.y + 150);
      await page1.mouse.up();
    }

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
        { timeout: 10000 }
      );
    }

    const endTime = Date.now();
    latency = endTime - startTime;

    console.log(`Node edit propagation latency: ${latency}ms`);
    expect(latency).toBeLessThan(500);

    await context1.close();
    await context2.close();
  });

  test.skip('table changes sync within 500ms between two users', async ({ browser }) => {
    // Skip: Reputation table doesn't initialize Hocuspocus provider - only GraphCanvas does
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/reputation');
    await page1.waitForSelector('table', { timeout: 30000 });
    await page1.evaluate(() => indexedDB.deleteDatabase('planeshift-graph'));
    await page1.reload();
    await page1.waitForSelector('table', { timeout: 30000 });
    
    await page2.goto('/reputation');
    await page2.waitForSelector('table', { timeout: 30000 });

    await page1.waitForTimeout(3000);

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
      { timeout: 10000 }
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    console.log(`Table sync latency: ${latency}ms`);
    expect(latency).toBeLessThan(500);

    await context1.close();
    await context2.close();
  });
});
