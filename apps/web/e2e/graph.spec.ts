import { test, expect } from '@playwright/test';

test.describe('Graph CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph');
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    await page.evaluate(() => indexedDB.deleteDatabase('planeshift-graph'));
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    await page.waitForTimeout(500);
  });

  test('renders graph page with controls', async ({ page }) => {
    await expect(page.locator('.react-flow__controls')).toBeVisible();
    await expect(page.locator('button:has-text("Add Node")')).toBeVisible();
  });

  test('creates a node via Add Node button', async ({ page }) => {
    const initialNodes = await page.locator('.react-flow__node').count();
    await page.locator('button:has-text("Add Node")').click();
    await page.waitForTimeout(500);
    const newNodeCount = await page.locator('.react-flow__node').count();
    expect(newNodeCount).toBeGreaterThan(initialNodes);
  });

  test('can select a node', async ({ page }) => {
    const nodes = await page.locator('.react-flow__node').count();
    if (nodes === 0) {
      await page.locator('button:has-text("Add Node")').click();
      await page.waitForTimeout(500);
    }
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    await expect(firstNode).toHaveClass(/selected/);
  });

  test('can delete a node via context menu', async ({ page }) => {
    await page.locator('button:has-text("Add Node")').click();
    await page.waitForTimeout(500);
    const initialCount = await page.locator('.react-flow__node').count();
    const node = page.locator('.react-flow__node').first();
    await node.click({ button: 'right' });
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(500);
    const finalCount = await page.locator('.react-flow__node').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('node persists after page reload', async ({ page }) => {
    await page.locator('button:has-text("Add Node")').click();
    await page.waitForTimeout(1000);
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThan(0);
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    await page.waitForTimeout(1000);
    const reloadedCount = await page.locator('.react-flow__node').count();
    expect(reloadedCount).toBeGreaterThanOrEqual(nodeCount);
  });
});

test.describe('Graph Navigation', () => {
  test('navigation links work', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    await expect(page.locator('nav a:has-text("Home")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Resources")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Reputation")')).toBeVisible();
  });

  test('can navigate to resources page', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    await page.locator('nav a:has-text("Resources")').click();
    await page.waitForURL('**/resources');
    await expect(page).toHaveURL(/resources/);
  });
});
