import { expect, type Page, test } from '@playwright/test';

// QA video capture spec: records the start of the chargen flow with deliberate
// pacing so UI transitions/animations fully play out on the recording.
// Deliberately violates the "no fixed sleeps" e2e rule — pacing IS the purpose.
//
// NOTE: /chargen requires authentication (the older chargen-flow.spec.ts predates
// the login wall). Credentials created by e2e/global-setup.ts, same pattern as
// chargen-full-lifecycle.spec.ts.

const PLAYER_EMAIL = 'agent-qa-player1@example.com';
const PLAYER_PASSWORD = 'test-password-123';

test.use({ video: 'on', viewport: { width: 1280, height: 720 } });

// The E2E user is not auto-seeded by global-setup; register it via the Fastify
// API (same credentials pattern as chargen-full-lifecycle.spec.ts). 409 = already registered.
async function ensureUserRegistered(): Promise<void> {
  const res = await fetch('http://localhost:18122/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PLAYER_EMAIL, password: PLAYER_PASSWORD, name: 'QA Player One' }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to register E2E user: ${res.status} ${await res.text()}`);
  }
}

async function loginAsPlayerOne(page: Page): Promise<void> {
  await page.goto('/login?callbackUrl=/campaigns');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.getByLabel('Email').fill(PLAYER_EMAIL);
  await page.getByLabel('Password').fill(PLAYER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // URL regex alone false-matches /login?callbackUrl=/campaigns — assert real content.
  await expect(page).toHaveURL(/\/campaigns/);
  await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible({
    timeout: 15000,
  });
}

test.describe('Chargen Flow (video QA)', () => {
  test('capture chargen flow start on video', async ({ page, context }) => {
    test.setTimeout(120000);

    await ensureUserRegistered();
    await loginAsPlayerOne(page);

    await page.goto('/chargen');
    await page
      .evaluate(() => {
        indexedDB.databases?.().then((dbs) => {
          dbs.forEach((db) => indexedDB.deleteDatabase(db.name!));
        });
      })
      .catch(() => {});
    await page.waitForTimeout(700);

    await page.goto('/chargen');

    const createCharacterButton = page.getByRole('button', {
      name: 'Create New Character',
    });

    await expect(createCharacterButton).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    await createCharacterButton.click();

    const nameInput = page.locator('input[placeholder="Enter character name"]');
    await expect(nameInput).toBeVisible();
    await page.waitForTimeout(600);

    await nameInput.fill('E2E Traveller');
    await page.waitForTimeout(600);

    for (const skillName of ['Admin', 'Animals', 'Art']) {
      const skillLabel = page.locator('label').filter({ hasText: skillName }).first();
      await expect(skillLabel).toBeVisible();
      await skillLabel.click();
      await page.waitForTimeout(650);
    }

    await expect(page.getByText('Selected: 3/3')).toBeVisible();
    await page.waitForTimeout(600);

    const continueButton = page.getByRole('button', { name: 'Continue →' });
    await expect(continueButton).toBeEnabled();
    await page.waitForTimeout(500);
    await continueButton.click();

    await expect(page.getByRole('button', { name: 'Step 2: Careers' })).toHaveAttribute(
      'aria-current',
      'step',
    );

    // Hold the final state on the recording before flushing the video.
    await page.waitForTimeout(1500);
    await context.close();
  });
});
