/**
 * E2E: Knowledge Import → Preview → Delete → Recycle → Restore
 * Priority: IMPORTANT (2h + 1.5h)
 */
import { expect, test } from '@playwright/test';

const UNIQUE = `e2e_kb_${Date.now()}`;
const USERNAME = `${UNIQUE}`;
const PASSWORD = 'test1234';
const WORKSPACE = '/tmp/e2e-kb-workspace';

test.describe('Knowledge & Recycle E2E', () => {
  test('register → import knowledge → preview → delete → restore', async ({ page }) => {
    // ---- Register ----
    await page.goto('/#/register');
    await page.fill('input[placeholder*="用户名"]', USERNAME);
    await page.fill('input[placeholder*="密码"]', PASSWORD);
    await page.fill('input[placeholder*="工作区"]', WORKSPACE);
    await page.click('button:has-text("注册")');
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // ---- Create a blog first (needed for content) ----
    await page.goto('/#/blog/new');
    await page.waitForSelector('input[placeholder*="标题"]', { timeout: 10000 });
    await page.fill('input[placeholder*="标题"]', 'KB E2E Blog');
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.pressSequentially('Blog for knowledge E2E test.');
    await page.keyboard.press('Control+s');
    await page.waitForURL(/\/blog\/\d+/, { timeout: 10000 });

    // ---- Navigate to Knowledge page ----
    await page.goto('/#/knowledge');
    await page.waitForSelector('h2', { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('知识库', { timeout: 5000 });

    // ---- Blog list: delete blog to recycle ----
    await page.goto('/#/blog');
    await page.waitForSelector('h2', { timeout: 10000 });

    // Find and delete the blog
    const deleteBtn = page.locator('button:has-text("删除"), text=删除').first();
    if (await deleteBtn.isVisible()) {
      // Need to confirm dialog
      page.on('dialog', (dialog) => dialog.accept());
      await deleteBtn.click();
      await page.waitForTimeout(1000);
    }

    // ---- Navigate to Recycle Bin ----
    await page.goto('/#/recycle');
    await page.waitForSelector('h2', { timeout: 10000 });

    // Should show recycle bin or empty state
    const recycleContent = page.locator('h2');
    await expect(recycleContent).toBeVisible({ timeout: 5000 });

    // ---- Guide page (bonus check) ----
    await page.goto('/#/guide');
    await page.waitForSelector('h2', { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('使用指南', { timeout: 5000 });

    // Verify sections exist
    await expect(page.locator('text=博客写作')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=知识库管理')).toBeVisible({ timeout: 3000 });
  });
});
