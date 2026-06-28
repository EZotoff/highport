import { expect, type Locator, type Page, test } from '@playwright/test';

const PLAYER_EMAIL = 'agent-qa-player1@example.com';
const PLAYER_PASSWORD = 'test-password-123';
const CHARACTER_NAME = 'E2E Full Lifecycle Traveller';

test.describe('Chargen full lifecycle regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login?callbackUrl=/campaigns');
    await clearBrowserState(page);
    await loginAsPlayerOne(page);
    await installDeterministicDice(page);
    await page.goto('/chargen');
    await expect(page.locator('[data-testid="chargen-wizard"]')).toBeVisible({ timeout: 20_000 });
  });

  test('drives a character through two career terms, mustering out, finalization, service record, and graph creation', async ({
    page,
  }) => {
    // Given: an authenticated player on a clean chargen session.
    await expectWizardStatus(page, 'background');
    await expect(page.locator('[data-testid="participant-panel"]')).toContainText(
      'Session Participants',
    );

    // When: the player creates a character and completes background setup with 3 skills.
    await page.getByRole('button', { name: 'Create New Character' }).click();
    await page.locator('input[placeholder="Enter character name"]').fill(CHARACTER_NAME);
    for (const skillName of ['Admin', 'Animals', 'Art']) {
      await page.locator('label').filter({ hasText: skillName }).first().click();
    }
    await expect(page.getByText('Selected: 3/3')).toBeVisible();
    await page.getByRole('button', { name: 'Continue →' }).click();

    // Then: career selection is reached and a no-random-failure career path can begin.
    await expectWizardStatus(page, 'career_selection');
    await expect(page.getByRole('heading', { name: 'Career Selection' })).toBeVisible();
    await page.getByRole('button', { name: /Become a Drifter/i }).click();
    await expectWizardStatus(page, 'term_resolution');
    await expect(page.locator('[data-testid="invite-section"]')).toBeVisible();

    // When: Term 1 is resolved through survival, flavored event, skill, advancement, and chapter card.
    await completeCareerTerm(page, 'I');
    await expect(page.getByText(/Chapter I/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Drifter — Term 1/i })).toBeVisible();
    await page.getByRole('button', { name: /Continue Career/i }).click();

    // When: Term 2 repeats the lifecycle and records a second chapter card.
    await expectWizardStatus(page, 'term_resolution');
    await completeCareerTerm(page, 'II');
    await expect(page.getByText(/Chapter II/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Drifter — Term 2/i })).toBeVisible();

    // When: the player musters out with both cash and material benefits.
    await page.getByRole('button', { name: /Muster Out/i }).click();
    await expectWizardStatus(page, 'mustering_out');
    await expect(page.getByRole('heading', { name: 'Mustering Out' })).toBeVisible();
    await drainMusteringRolls(page);
    await page.getByRole('button', { name: 'Continue →' }).first().click();

    // Then: finalized status exposes the character sheet and collapsible service record.
    await expectWizardStatus(page, 'finalized');
    await expect(page.getByRole('heading', { name: 'Character Complete' })).toBeVisible();
    const serviceRecordToggle = page.getByRole('button', {
      name: /Service Record \(2 chapters\)/i,
    });
    await expect(serviceRecordToggle).toBeVisible();
    await serviceRecordToggle.click();
    await expect(page.getByRole('heading', { name: 'Service Record' })).toBeVisible();
    await expect(page.getByText(/recorded 2 chapters of service/i)).toBeVisible();
    await expect(page.getByText(/Chapter I · Age 22/i)).toBeVisible();
    await expect(page.getByText(/Chapter II · Age 26/i)).toBeVisible();

    // When: final creation is confirmed, the graph receives the traveller node.
    await page.getByRole('button', { name: /Create Character & View Graph/i }).click();
    await expect(page).toHaveURL(/\/graph$/);
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.getByText(CHARACTER_NAME).first()).toBeVisible();
  });
});

async function clearBrowserState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function loginAsPlayerOne(page: Page): Promise<void> {
  await page.getByLabel('Email').fill(PLAYER_EMAIL);
  await page.getByLabel('Password').fill(PLAYER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible();
}

async function installDeterministicDice(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const values = [
      0.13, 0.27, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.91, 0.92, 0.93, 0.94, 0.74,
      0.75, 0.74, 0.75, 0.74, 0.75, 0.74, 0.75, 0.74, 0.75, 0.74, 0.75, 0.74, 0.75, 0.74, 0.75,
    ] as const;
    let index = 0;
    Math.random = () => {
      const value = values[index] ?? 0.81;
      index += 1;
      return value;
    };
  });
}

async function expectWizardStatus(page: Page, status: string): Promise<void> {
  await expect(page.locator('[data-testid="chargen-wizard"]')).toHaveAttribute(
    'data-chargen-status',
    status,
    { timeout: 20_000 },
  );
}

async function completeCareerTerm(page: Page, chapterNumeral: 'I' | 'II'): Promise<void> {
  await expect(
    page.getByText(new RegExp(`Drifter — Term ${chapterNumeral === 'I' ? '1' : '2'}`)),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Roll Survival' }).click();
  await expect(page.getByText('✓ SURVIVED')).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: 'Roll Event' }).click();
  await expect(page.getByRole('heading', { name: 'Phase 2: Career Event' })).toBeVisible();
  await expect(eventPanel(page)).toContainText(
    /criminal underworld|wrong people notice|street sense/i,
  );
  await page.getByRole('button', { name: /^Continue$/ }).click();

  const skillRollButton = page.getByRole('button', { name: 'Roll 1d6' });
  if ((await skillRollButton.count()) === 0 || !(await skillRollButton.first().isVisible())) {
    await page.getByRole('button', { name: 'Service Skills' }).click();
  }
  await skillRollButton.click();
  await expect(page.getByText('Skill Gained')).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: 'Roll Advancement' }).click();
  await expect(page.getByText(/PROMOTED|NO PROMOTION/)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(new RegExp(`Chapter ${chapterNumeral}`))).toBeVisible({
    timeout: 8_000,
  });
}

function eventPanel(page: Page): Locator {
  return page.getByRole('heading', { name: 'Phase 2: Career Event' }).locator('..');
}

async function drainMusteringRolls(page: Page): Promise<void> {
  let remaining = await readRollsRemaining(page);
  let rolledCash = false;
  let rolledBenefit = false;

  for (let rollIndex = 0; rollIndex < 8 && remaining > 0; rollIndex += 1) {
    const cashButton = page.getByRole('button', { name: /Roll Cash/i });
    const benefitButton = page.getByRole('button', { name: /Roll Benefits/i });
    const shouldRollCash: boolean = !rolledCash || (rolledBenefit && rollIndex % 2 === 0);
    const rollKind: 'cash' | 'benefit' =
      shouldRollCash && (await cashButton.isEnabled()) ? 'cash' : 'benefit';
    const button: Locator = rollKind === 'cash' ? cashButton : benefitButton;

    await button.click();
    rolledCash = rolledCash || rollKind === 'cash';
    rolledBenefit = rolledBenefit || rollKind === 'benefit';

    const expectedRemaining = remaining - 1;
    await expect.poll(() => readRollsRemaining(page)).toBe(expectedRemaining);
    remaining = expectedRemaining;
  }

  await expect(page.getByText(/Cr\d/).first()).toBeVisible();
  await expect(page.getByText('Benefits Received')).toBeVisible();
  await expect.poll(() => readRollsRemaining(page)).toBe(0);
}

async function readRollsRemaining(page: Page): Promise<number> {
  const counterText = await page.getByText('Rolls Remaining').locator('..').textContent();
  const match = counterText?.match(/\d+/);
  return match ? Number(match[0]) : Number.NaN;
}
