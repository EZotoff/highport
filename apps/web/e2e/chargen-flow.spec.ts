import { test, expect } from '@playwright/test';

test.describe('Chargen Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chargen');
    await page
      .evaluate(() => {
        indexedDB.databases?.().then((dbs) => {
          dbs.forEach((db) => indexedDB.deleteDatabase(db.name!));
        });
      })
      .catch(() => {});
    await page.waitForTimeout(500);
  });

  test('complete single character generation start flow', async ({ page }) => {
    await page.goto('/chargen');

    const createCharacterButton = page.getByRole('button', {
      name: 'Create New Character',
    });

    await expect(
      createCharacterButton.or(page.getByRole('heading', { name: 'Start Character Generation' })),
    ).toBeVisible({ timeout: 10000 });

    await createCharacterButton.click();

    const nameInput = page.locator('input[placeholder="Enter character name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E Traveller');

    for (const skillName of ['Admin', 'Animals', 'Art']) {
      const skillLabel = page.locator('label').filter({ hasText: skillName }).first();
      await expect(skillLabel).toBeVisible();
      await skillLabel.click();
    }

    await expect(page.getByText('Selected: 3/3')).toBeVisible();

    const continueButton = page.getByRole('button', { name: 'Continue →' });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(page.getByRole('button', { name: 'Step 2: Careers' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  // Triage: KEEP-WITH-RATIONALE — see TRIAGE-REPORT.md entry #10
  // Empty stub. Entity spawning requires dice-driven career events.
  // Needs seeded RNG + Page Object Model helpers for the full chargen flow.
  test.fixme('entity spawning creates visible graph nodes', async () => {
    // This test requires:
    // 1. Creating a character (Background step)
    // 2. Selecting a career (Career Selection step)
    // 3. Completing term resolution where an event spawns an entity
    // 4. Navigating to /graph to verify the node exists
    // Entity spawning happens via career events which are dice-roll dependent
    // and require the full career term resolution flow to trigger.
  });

  // Triage: KEEP-WITH-RATIONALE — see TRIAGE-REPORT.md entry #11
  // Empty stub. Finalize step calls createCharacterNode() but the full 5-step wizard flow
  // (Background → Career → Skills → Benefits → Finalize) has no Page Object helpers yet.
  test.fixme('character appears in graph after finalization', async () => {
    // This test requires:
    // 1. Completing the entire chargen wizard (Background -> Career -> Skills -> Benefits -> Finalize)
    // 2. The finalize step calls createCharacterNode() which adds a graph node
    // 3. Navigating to /graph to verify the character node appears
    // The full flow is multi-step and depends on career completion logic.
  });
});
