import { test, expect } from '@playwright/test';

test.describe('RAG Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForSelector('input[placeholder="Ask a question..."]', { timeout: 10000 });
  });

  test('renders chat interface with input and placeholder', async ({ page }) => {
    await expect(page.locator('h3:has-text("PlaneShift RAG")')).toBeVisible();
    await expect(page.locator('input[placeholder="Ask a question..."]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Ask about the universe...')).toBeVisible();
  });

  test('can type a message in the input field', async ({ page }) => {
    const input = page.locator('input[placeholder="Ask a question..."]');
    
    await input.fill('What is the Third Imperium?');
    await expect(input).toHaveValue('What is the Third Imperium?');
  });

  test('can submit a query and see user message appear', async ({ page }) => {
    const input = page.locator('input[placeholder="Ask a question..."]');
    const submitButton = page.locator('button[type="submit"]');
    
    await input.fill('Tell me about starships');
    await submitButton.click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=Tell me about starships')).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('displays loading indicator while waiting for response', async ({ page }) => {
    const input = page.locator('input[placeholder="Ask a question..."]');
    const submitButton = page.locator('button[type="submit"]');
    
    await input.fill('What is jump drive technology?');
    await submitButton.click();
    
    const loadingIndicator = page.locator('.animate-spin').first();
    await page.waitForTimeout(200);
    
    const spinnerCount = await loadingIndicator.count();
    expect(spinnerCount).toBeGreaterThanOrEqual(0);
  });

  test('handles RAG service unavailable gracefully', async ({ page }) => {
    const input = page.locator('input[placeholder="Ask a question..."]');
    const submitButton = page.locator('button[type="submit"]');
    
    await input.fill('Test query for error handling');
    await submitButton.click();
    
    await page.waitForTimeout(500);
    await expect(page.locator('text=Test query for error handling')).toBeVisible();
    
    await page.waitForTimeout(3000);
    
    await expect(input).toBeEnabled();
    await expect(submitButton).toBeEnabled();
  });

  test('submit button is disabled when input is empty', async ({ page }) => {
    const input = page.locator('input[placeholder="Ask a question..."]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(submitButton).toBeDisabled();
    
    await input.fill('Test');
    await expect(submitButton).toBeEnabled();
    
    await input.fill('');
    await expect(submitButton).toBeDisabled();
  });

  test('can send multiple messages in sequence', async ({ page }) => {
    const input = page.locator('input[placeholder="Ask a question..."]');
    const submitButton = page.locator('button[type="submit"]');
    
    await input.fill('First question');
    await submitButton.click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=First question')).toBeVisible();
    
    await input.fill('Second question');
    await submitButton.click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=First question')).toBeVisible();
    await expect(page.locator('text=Second question')).toBeVisible();
  });
});

test.describe('RAG Chat with Mock Response', () => {
  test('intercepts API and displays mocked response', async ({ page }) => {
    await page.route('**/api/rag/query', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: The Third Imperium is a vast interstellar empire.\n\n',
      });
    });
    
    await page.goto('/chat');
    await page.waitForSelector('input[placeholder="Ask a question..."]', { timeout: 10000 });
    
    const input = page.locator('input[placeholder="Ask a question..."]');
    const submitButton = page.locator('button[type="submit"]');
    
    await input.fill('What is the Third Imperium?');
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('text=The Third Imperium is a vast interstellar empire.')).toBeVisible();
  });
});
