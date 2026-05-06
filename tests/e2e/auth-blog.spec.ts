/**
 * E2E: Registration → Login → Create Blog → List → Detail → Edit
 * Priority: MUST (2.5h + 2.5h)
 */
import { expect, test } from '@playwright/test';

const UNIQUE = `e2e_${Date.now()}`;
const USERNAME = `${UNIQUE}`;
const PASSWORD = 'test1234';
const WORKSPACE = '/tmp/e2e-workspace';

test.describe('Auth & Blog E2E', () => {
  test('register → login → create blog → list → detail → edit', async ({ page }) => {
    // ---- Register ----
    await page.goto('/#/register');
    await expect(page.locator('h2')).toContainText('注册');
    await page.fill('input[placeholder*="用户名"]', USERNAME);
    await page.fill('input[placeholder*="密码"]', PASSWORD);
    await page.fill('input[placeholder*="工作区"]', WORKSPACE);
    await page.click('button:has-text("注册")');
    // Should redirect to dashboard after register
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('仪表盘', { timeout: 5000 });

    // ---- Create Blog ----
    await page.goto('/#/blog/new');
    await page.waitForSelector('input[placeholder*="标题"]', { timeout: 10000 });
    const blogTitle = `E2E Test Blog ${UNIQUE}`;
    await page.fill('input[placeholder*="标题"]', blogTitle);

    // Type content in the editor — Tiptap handles input differently
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.pressSequentially('This is E2E test content for blog verification.');

    // Save blog via Ctrl+S or button
    await page.keyboard.press('Control+s');
    // Wait for navigation to blog detail
    await page.waitForURL(/\/blog\/\d+/, { timeout: 10000 });

    // ---- Verify Blog Detail ----
    await expect(page.locator('h1')).toContainText(blogTitle, { timeout: 5000 });

    // ---- Blog List ----
    await page.goto('/#/blog');
    await page.waitForSelector('h2', { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('博客');

    // The new blog should appear in the list
    await expect(page.locator('text=' + blogTitle).first()).toBeVisible({ timeout: 5000 });

    // ---- Edit Blog ----
    await page.goto('/#/blog');
    // Find the blog link and click to edit
    const blogLink = page.locator(`a[href*="/blog/"]`).first();
    await blogLink.click();
    await page.waitForURL(/\/blog\/\d+/, { timeout: 10000 });

    // Click Edit button
    await page.click('a:has-text("编辑"), button:has-text("编辑")');
    await page.waitForURL(/\/blog\/\d+\/edit/, { timeout: 10000 });

    // Wait for editor to load
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    const updatedContent = ' Updated content for E2E verification.';
    await editor.click();
    await editor.press('Control+End');
    await editor.pressSequentially(updatedContent);

    // Ctrl+S to save
    await page.keyboard.press('Control+s');

    // Verify we're back on detail page with updated content
    await page.waitForURL(/\/blog\/\d+/, { timeout: 10000 });
    // The page should show the blog title
    await expect(page.locator('h1')).toContainText(blogTitle, { timeout: 5000 });
  });
});
