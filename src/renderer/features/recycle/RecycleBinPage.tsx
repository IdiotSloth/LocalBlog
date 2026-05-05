import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

interface RecycleItem {
  id: number;
  userId: number;
  itemType: 'blog' | 'knowledge_file';
  itemId: number;
  deletedAt: string;
}

export function RecycleBinPage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = (await window.api.recycleList(user.id)) as { success: boolean; data?: RecycleItem[] };
      setItems(res?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRestore = async (item: RecycleItem) => {
    try {
      await window.api.recycleRestore({ userId: user!.id, itemId: item.itemId, itemType: item.itemType });
      loadItems();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmpty = async () => {
    if (!user) return;
    if (!confirm('确定要永久清空回收站吗？此操作不可撤销。')) return;
    try {
      await window.api.recycleEmpty(user.id);
      loadItems();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          回收站{' '}
          <span className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>
            {items.length} 项
          </span>
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleEmpty}
            className="rounded-[4px] border px-4 py-2 text-[13px] font-medium transition-colors"
            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'transparent' }}
          >
            清空回收站
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-[6px] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            回收站为空
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[6px] border"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <table className="w-full text-[14px]">
            <thead style={{ background: 'var(--bg-tertiary)' }}>
              <tr>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                  类型
                </th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                  ID
                </th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                  删除时间
                </th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t transition-colors"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <td className="px-4 py-3">
                    <span
                      className="rounded-[4px] px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        color: item.itemType === 'blog' ? 'var(--accent-blue)' : 'var(--accent-green)',
                        background: 'var(--bg-tertiary)',
                      }}
                    >
                      {item.itemType === 'blog' ? '博客' : '文件'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    #{item.itemId}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(item.deletedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      className="rounded-[4px] px-3 py-1 text-[12px] font-medium transition-colors"
                      style={{ color: 'var(--accent-blue)', background: 'var(--bg-tertiary)' }}
                    >
                      恢复
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
