import { test, expect } from '@playwright/test';

test.describe('Graph CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph');
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 10000 });
  });

  test('renders graph page with controls', async ({ page }) => {
    // Verify React Flow controls are visible
    await expect(page.locator('.react-flow__controls')).toBeVisible();
    
    // Verify Add Node button exists
    await expect(page.locator('button:has-text("Add Node")')).toBeVisible();
  });

  test('creates a node via Add Node button', async ({ page }) => {
    // Get initial node count
    const initialNodes = await page.locator('.react-flow__node').count();
    
    // Click Add Node button
    await page.locator('button:has-text("Add Node")').click();
    
    // Wait for node to appear
    await page.waitForTimeout(500);
    
    // Verify new node was created
    const newNodeCount = await page.locator('.react-flow__node').count();
    expect(newNodeCount).toBeGreaterThan(initialNodes);
  });

  test('can select a node', async ({ page }) => {
    // First create a node if none exist
    const nodes = await page.locator('.react-flow__node').count();
    if (nodes === 0) {
      await page.locator('button:has-text("Add Node")').click();
      await page.waitForTimeout(500);
    }
    
    // Click on a node
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();
    
    // Node should have selected class
    await expect(firstNode).toHaveClass(/selected/);
  });

  test('can delete a node via context menu', async ({ page }) => {
    // Create a node
    await page.locator('button:has-text("Add Node")').click();
    await page.waitForTimeout(500);
    
    const initialCount = await page.locator('.react-flow__node').count();
    
    // Right-click to open context menu
    const node = page.locator('.react-flow__node').first();
    await node.click({ button: 'right' });
    
    // Click delete in context menu
    await page.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(500);
    
    // Verify node was deleted
    const finalCount = await page.locator('.react-flow__node').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('node persists after page reload', async ({ page }) => {
    // Create a node
    await page.locator('button:has-text("Add Node")').click();
    await page.waitForTimeout(1000);
    
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThan(0);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Verify node still exists (persisted via IndexedDB)
    const reloadedCount = await page.locator('.react-flow__node').count();
    expect(reloadedCount).toBeGreaterThanOrEqual(nodeCount);
  });
});

test.describe('Graph Navigation', () => {
  test('navigation links work', async ({ page }) => {
    await page.goto('/graph');
    
    // Check Home link
    await expect(page.locator('nav a:has-text("Home")')).toBeVisible();
    
    // Check Resources link
    await expect(page.locator('nav a:has-text("Resources")')).toBeVisible();
    
    // Check Reputation link
    await expect(page.locator('nav a:has-text("Reputation")')).toBeVisible();
  });

  test('can navigate to resources page', async ({ page }) => {
    await page.goto('/graph');
    
    await page.locator('nav a:has-text("Resources")').click();
    await page.waitForURL('**/resources');
    
    await expect(page).toHaveURL(/resources/);
  });
});
