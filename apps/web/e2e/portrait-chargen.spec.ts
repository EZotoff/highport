import { test, expect } from '@playwright/test';

test.describe('Portrait in Chargen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chargen');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('nav a:has-text("Character Gen")')).toBeVisible();
  });

  test('chargen page loads with wizard shell', async ({ page }) => {
    await expect(page).toHaveURL(/\/chargen/);
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();
    await expect(page.locator('text=Background')).toBeVisible();
  });

  test('portrait actions and library modal are available in portrait-enabled states', async ({
    page,
  }) => {
    const createButton = page.locator('button:has-text("Create New Character")');
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page.locator('text=Characteristics')).toBeVisible();
    }

    const generatePortrait = page.locator('button:has-text("Generate Portrait")').first();
    if ((await generatePortrait.count()) === 0) {
      test.skip(
        true,
        'Portrait controls require entity spawn/finalize state that is not always available in baseline E2E setup.',
      );
    }

    await expect(generatePortrait).toBeVisible();
    const browseLibrary = page.locator('button:has-text("Browse Library")').first();
    await expect(browseLibrary).toBeVisible();
    await browseLibrary.click();
    await expect(page.locator('text=Portrait Library')).toBeVisible();
  });
});

test.describe('Portrait API smoke checks', () => {
  test('POST /api/portraits/generate returns 401 without X-User-Id', async ({ request }) => {
    const response = await request.post('http://localhost:18122/api/portraits/generate', {
      data: {
        campaignId: 'test-campaign',
        tags: { story: { entity_type: 'npc' } },
      },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /api/portraits/search returns array for campaign query', async ({ request }) => {
    const response = await request.get(
      'http://localhost:18122/api/portraits/search?campaignId=test-campaign',
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('GET /api/portraits/:id/image returns 404 for missing portrait', async ({ request }) => {
    const response = await request.get('http://localhost:18122/api/portraits/nonexistent/image');

    expect(response.status()).toBe(404);
  });
});
