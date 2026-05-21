import { useCallback, useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';

interface Props {
  targetType: 'blog' | 'knowledge';
  targetId: number;
  title: string;
}

export function BookmarkButton({ targetType, targetId, title }: Props) {
  const user = useAuthStore((s) => s.user);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    window.api.bookmarkList(user.id).then((r) => {
      if (r.success && r.data) {
        setIsBookmarked(r.data.some((b) => b.targetType === targetType && b.targetId === targetId));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, targetType, targetId]);

  const toggle = useCallback(async () => {
    if (!user) return;
    if (isBookmarked) {
      await window.api.bookmarkRemove({ userId: user.id, targetType, targetId });
      setIsBookmarked(false);
    } else {
      await window.api.bookmarkAdd({ userId: user.id, targetType, targetId, title });
      setIsBookmarked(true);
    }
  }, [user, targetType, targetId, title, isBookmarked]);

  if (loading) return null;

  return (
    <button type="button" onClick={toggle} title={isBookmarked ? '取消收藏' : '添加收藏'} aria-label={isBookmarked ? '取消收藏' : '添加收藏'}
      className="rounded-[4px] p-1 transition-opacity hover:opacity-70"
      style={{ color: isBookmarked ? 'var(--accent-green)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
      <Bookmark size={18} fill={isBookmarked ? 'var(--accent-green)' : 'none'} />
    </button>
  );
}
