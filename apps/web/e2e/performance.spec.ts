import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test.setTimeout(120000);

  test('renders 500 nodes without major FPS drop', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.evaluate(async () => {
      for (let i = 0; i < 500; i++) {
        const button = document.querySelector('button');
        if (button?.textContent?.includes('Add Node')) {
          button.click();
        }
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    });

    await page.waitForTimeout(3000);

    const nodeCount = await page.locator('.react-flow__node').count();
    console.log(`Created ${nodeCount} nodes`);
    expect(nodeCount).toBeGreaterThanOrEqual(450);

    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();

        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frameCount);
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    console.log(`FPS with 500 nodes: ${fps}`);
    expect(fps).toBeGreaterThanOrEqual(30);
  });

  test('graph remains responsive with many nodes', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(1000);

    for (let i = 0; i < 100; i++) {
      await page.locator('button:has-text("Add Node")').click();
      if (i % 20 === 0) {
        await page.waitForTimeout(100);
      }
    }

    await page.waitForTimeout(1000);

    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible();

    const startTime = Date.now();
    const zoomIn = page.locator('.react-flow__controls-zoomin');
    await zoomIn.click();
    await page.waitForTimeout(100);
    const zoomTime = Date.now() - startTime;

    console.log(`Zoom interaction time: ${zoomTime}ms`);
    expect(zoomTime).toBeLessThan(1000);

    const panStartTime = Date.now();
    const viewport = page.locator('.react-flow__pane');
    const box = await viewport.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();
    }
    const panTime = Date.now() - panStartTime;

    console.log(`Pan interaction time: ${panTime}ms`);
    expect(panTime).toBeLessThan(2000);
  });

  test('concurrent users with moderate node count', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    await Promise.all(pages.map(p => p.goto('/graph')));
    await Promise.all(pages.map(p => p.waitForSelector('.react-flow', { timeout: 10000 })));
    await pages[0].waitForTimeout(2000);

    for (let i = 0; i < 20; i++) {
      await pages[0].locator('button:has-text("Add Node")').click();
      await pages[0].waitForTimeout(100);
    }

    await pages[0].waitForTimeout(2000);

    for (const page of pages) {
      const nodeCount = await page.locator('.react-flow__node').count();
      console.log(`Page node count: ${nodeCount}`);
      expect(nodeCount).toBeGreaterThanOrEqual(15);
    }

    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});
