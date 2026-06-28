import { test, expect } from '@playwright/test';

test.describe('Reputation Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reputation');
    await page.waitForSelector('table', { timeout: 30000 });
    await page.evaluate(() => indexedDB.deleteDatabase('highport-graph'));
    await page.reload();
    await page.waitForSelector('table', { timeout: 30000 });
    await page.waitForTimeout(500);
  });

  test('renders reputation table with header', async ({ page }) => {
    await expect(page.locator('h2:has-text("Factions & Reputation")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Faction")')).toBeVisible();
  });

  test('can add a new faction', async ({ page }) => {
    // Initially shows "No factions defined." placeholder
    await expect(page.locator('text=No factions defined.')).toBeVisible();

    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);

    // After adding, placeholder disappears and faction row with input appears
    await expect(page.locator('text=No factions defined.')).not.toBeVisible();
    await expect(page.locator('tbody tr input').first()).toBeVisible();
  });

  test('can edit faction name inline', async ({ page }) => {
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    const nameCell = page.locator('tbody tr').last().locator('td').first().locator('input');
    await nameCell.click();
    await nameCell.fill('Test Faction Name');
    await nameCell.blur();
    await page.waitForTimeout(500);
    await expect(
      page.locator('tbody tr').last().locator('td').first().locator('input'),
    ).toHaveValue('Test Faction Name');
  });

  test('can edit standing value', async ({ page }) => {
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    const standingInput = page.locator('tbody tr').last().locator('input[type="number"]').first();
    await standingInput.click();
    await standingInput.fill('50');
    await standingInput.blur();
    await page.waitForTimeout(500);
    await expect(
      page.locator('tbody tr').last().locator('input[type="number"]').first(),
    ).toHaveValue('50');
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

  // Triage: KEEP-WITH-RATIONALE — see TRIAGE-REPORT.md entry #7
  // Reputation table stores data in-memory only — no IndexedDB or Yjs persistence.
  // Needs persistence layer feature work before this test can pass.
  test.skip('data persists after page reload', async ({ page }) => {
    // Skip: Reputation table doesn't initialize sync/persistence - only GraphCanvas does
    await page.locator('button:has-text("Add Faction")').click();
    await page.waitForTimeout(500);
    const nameInput = page.locator('tbody tr').last().locator('td').first().locator('input');
    await nameInput.click();
    await nameInput.fill('Persistent Faction');
    await nameInput.blur();
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForSelector('table', { timeout: 30000 });
    await page.waitForTimeout(1000);
    const hasPersistedFaction = await page.locator('input[value="Persistent Faction"]').count();
    expect(hasPersistedFaction).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Two-User Table Sync', () => {
  // Triage: KEEP-WITH-RATIONALE — see TRIAGE-REPORT.md entry #8
  // Reputation table has no Hocuspocus provider; cross-context sync is impossible.
  // Architecturally blocked — same issue as sync-latency.ts entry #6.
  test.skip('changes sync between two browser contexts', async ({ browser }) => {
    // Skip: Reputation table doesn't initialize Hocuspocus provider - only GraphCanvas does
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/reputation');
    await page1.waitForSelector('table', { timeout: 30000 });
    await page1.evaluate(() => indexedDB.deleteDatabase('highport-graph'));
    await page1.reload();
    await page1.waitForSelector('table', { timeout: 30000 });

    await page2.goto('/reputation');
    await page2.waitForSelector('table', { timeout: 30000 });

    await page1.waitForTimeout(3000);

    await page1.locator('button:has-text("Add Faction")').click();
    await page1.waitForTimeout(500);

    const nameInput = page1.locator('tbody tr').last().locator('td').first().locator('input');
    await nameInput.click();
    await nameInput.fill('Synced Faction');
    await nameInput.blur();

    await page2.waitForTimeout(3000);

    const syncedInPage2 = await page2.locator('input[value="Synced Faction"]').count();
    expect(syncedInPage2).toBeGreaterThanOrEqual(1);

    await context1.close();
    await context2.close();
  });
});
