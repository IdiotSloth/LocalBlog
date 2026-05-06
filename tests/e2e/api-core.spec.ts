/**
 * E2E: Core API flow — register → login → blog CRUD → knowledge → recycle
 * Direct REST API calls. Fast and reliable smoke test of the full backend chain.
 */
import { expect, test } from '@playwright/test';

const UNIQUE = `e2e_${Date.now()}`;
let blogId: number;

test.describe('Core API E2E', () => {
  test('POST /api/auth/register', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { username: UNIQUE, password: 'test1234', workspacePath: '/tmp/e2e-api-ws' },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user?.username).toBe(UNIQUE);
    expect(body.token).toBeTruthy();
  });

  test('POST /api/auth/login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
  });

  test('POST /api/blog/create', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const res = await request.post('/api/blog/create', {
      data: { title: `E2E ${UNIQUE}`, format: 'md', content: 'Hello E2E!' },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    blogId = body.data?.id;
    expect(blogId).toBeGreaterThan(0);
  });

  test('GET /api/blog/list', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const res = await request.get('/api/blog/list');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.blogs?.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/blog/:id', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const res = await request.get(`/api/blog/${blogId}`);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.title).toContain('E2E');
  });

  test('POST /api/blog/:id/update', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const res = await request.post(`/api/blog/${blogId}/update`, {
      data: { title: `Updated ${UNIQUE}`, content: 'Updated content' },
    });
    expect((await res.json()).success).toBe(true);
  });

  test('GET /api/knowledge/list', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const body = await (await request.get('/api/knowledge/list')).json();
    expect(body.success).toBe(true);
  });

  test('POST /api/blog/:id/delete → recycle → restore', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    // Delete
    expect((await (await request.post(`/api/blog/${blogId}/delete`)).json()).success).toBe(true);
    // Recycle list
    expect((await (await request.get('/api/recycle/list')).json()).success).toBe(true);
    // Restore
    expect(
      (
        await (
          await request.post('/api/recycle/restore', {
            data: { itemId: blogId, itemType: 'blog' },
          })
        ).json()
      ).success,
    ).toBe(true);
  });

  test('GET /api/tags/list', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    expect((await (await request.get('/api/tags/list')).json()).success).toBe(true);
  });

  test('GET /api/folders/tree', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    expect((await (await request.get('/api/folders/tree?type=blog')).json()).success).toBe(true);
  });

  test('POST /api/search/global', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { username: UNIQUE, password: 'test1234' },
    });
    const body = await (
      await request.post('/api/search/global', {
        data: { query: 'E2E' },
      })
    ).json();
    expect(body.success).toBe(true);
  });
});
