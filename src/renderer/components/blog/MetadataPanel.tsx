/**
 * T2103: Blog metadata panel — unified editing for cover_image, icon, format, series.
 * Pin and color are handled inline in BlogEditorPage; this panel focuses on
 * the richer metadata fields that need more space.
 */

import { useCallback, useState } from 'react';

interface MetadataPanelProps {
  title: string;
  format: 'md' | 'html';
  coverImage?: string;
  icon?: string;
  seriesId?: string | null;
  seriesName?: string;
  seriesList: { seriesId: string; seriesName: string }[];
  onTitleChange: (v: string) => void;
  onFormatChange: (v: 'md' | 'html') => void;
  onCoverImageChange: (v: string) => void;
  onIconChange: (v: string) => void;
  onSeriesChange: (seriesId: string | null, seriesName: string) => void;
}

export function MetadataPanel({
  title, format, coverImage, icon, seriesId, seriesName,
  seriesList, onTitleChange, onFormatChange, onCoverImageChange, onIconChange, onSeriesChange,
}: MetadataPanelProps) {
  const [newSeries, setNewSeries] = useState('');

  const handleSeriesChange = useCallback((val: string) => {
    if (val === '__new__') {
      if (newSeries.trim()) {
        onSeriesChange(null, newSeries.trim());
        setNewSeries('');
      }
    } else {
      const found = seriesList.find((s) => s.seriesId === val);
      onSeriesChange(val || null, found?.seriesName || '');
    }
  }, [newSeries, seriesList, onSeriesChange]);

  return (
    <div className="space-y-4 p-4 rounded-[6px] border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
      <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>元数据</h3>

      {/* Title */}
      <label className="block">
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>标题</span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="mt-1 w-full rounded-[4px] border px-3 py-1.5 text-[14px] outline-none"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </label>

      {/* Format selector */}
      <label className="block">
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>格式</span>
        <div className="mt-1 flex gap-2">
          {(['md', 'html'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormatChange(f)}
              className="rounded-[3px] px-3 py-1 text-[12px] font-medium transition-colors"
              style={{
                background: format === f ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                color: format === f ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {f === 'md' ? 'Markdown' : 'HTML'}
            </button>
          ))}
        </div>
      </label>

      {/* Cover Image URL */}
      <label className="block">
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>封面图片 URL</span>
        <input
          type="text"
          value={coverImage || ''}
          onChange={(e) => onCoverImageChange(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </label>

      {/* Icon */}
      <label className="block">
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>图标</span>
        <input
          type="text"
          value={icon || ''}
          onChange={(e) => onIconChange(e.target.value)}
          placeholder="📝 或 emoji"
          maxLength={4}
          className="mt-1 w-20 rounded-[4px] border px-3 py-1.5 text-[16px] text-center outline-none"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </label>

      {/* Series */}
      <label className="block">
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>系列</span>
        <select
          value={seriesId || ''}
          onChange={(e) => handleSeriesChange(e.target.value)}
          className="mt-1 w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <option value="">无</option>
          {seriesList.map((s) => (
            <option key={s.seriesId} value={s.seriesId}>{s.seriesName}</option>
          ))}
          <option value="__new__">+ 新建系列...</option>
        </select>
        {!seriesId && newSeries && (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={newSeries}
              onChange={(e) => setNewSeries(e.target.value)}
              placeholder="系列名称"
              className="flex-1 rounded-[4px] border px-2 py-1 text-[12px] outline-none"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>
        )}
      </label>

      {/* Current series display */}
      {seriesName && (
        <div className="text-[12px] rounded-[4px] px-3 py-1.5" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          当前系列: {seriesName}
        </div>
      )}
    </div>
  );
}
