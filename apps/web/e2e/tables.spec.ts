import { test, expect } from '@playwright/test';

test.describe('Reputation Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reputation');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('renders reputation table with header', async ({ page }) => {
    await expect(page.locator('h2:has-text("Factions & Reputation")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Faction")')).toBeVisible();
  });

  test('can add a new faction', async ({ page }) => {
    const initialRows = await page.locator('tbody tr').count();
    
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    
    const newRowCount = await page.locator('tbody tr').count();
    expect(newRowCount).toBeGreaterThan(initialRows);
  });

  test('can edit faction name inline', async ({ page }) => {
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    
    const nameCell = page.locator('tbody tr').last().locator('td').first().locator('input');
    await nameCell.click();
    await nameCell.fill('Test Faction Name');
    await nameCell.blur();
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('tbody tr').last().locator('td').first().locator('input')).toHaveValue('Test Faction Name');
  });

  test('can edit standing value', async ({ page }) => {
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    
    const standingInput = page.locator('tbody tr').last().locator('input[type="number"]').first();
    await standingInput.click();
    await standingInput.fill('50');
    await standingInput.blur();
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('tbody tr').last().locator('input[type="number"]').first()).toHaveValue('50');
  });

  test('standing color changes based on value', async ({ page }) => {
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    
    const row = page.locator('tbody tr').last();
    const standingInput = row.locator('input[type="number"]').first();
    
    await standingInput.click();
    await standingInput.fill('-50');
    await standingInput.blur();
    await page.waitForTimeout(300);
    
    const standingCell = row.locator('td').nth(1).locator('div').first();
    const style = await standingCell.getAttribute('style');
    expect(style).toContain('background-color');
  });

  test('data persists after page reload', async ({ page }) => {
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    
    const nameInput = page.locator('tbody tr').last().locator('td').first().locator('input');
    await nameInput.click();
    await nameInput.fill('Persistent Faction');
    await nameInput.blur();
    await page.waitForTimeout(1000);
    
    await page.reload();
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const hasPersistedFaction = await page.locator('input[value="Persistent Faction"]').count();
    expect(hasPersistedFaction).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Two-User Table Sync', () => {
  test('changes sync between two browser contexts', async ({ browser }) => {
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

    await page1.locator('button:has-text("Add Faction")').click();
    await page1.waitForTimeout(500);

    const nameInput = page1.locator('tbody tr').last().locator('td').first().locator('input');
    await nameInput.click();
    await nameInput.fill('Synced Faction');
    await nameInput.blur();

    await page2.waitForTimeout(2000);

    const syncedInPage2 = await page2.locator('input[value="Synced Faction"]').count();
    expect(syncedInPage2).toBeGreaterThanOrEqual(1);

    await context1.close();
    await context2.close();
  });
});
