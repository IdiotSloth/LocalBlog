import { useAiSettings, AI_PROVIDER_LABELS } from '../../stores/ai-settings';
import type { AiProvider } from '../../../shared/ai-types';
import { AI_DEFAULTS } from '../../../shared/ai-types';

export function AiSection() {
  const { settings, effectiveModel, effectiveBaseUrl, update } = useAiSettings();

  return (
    <section className="rounded-[6px] border p-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>AI 对话</h3>
      <p className="mb-4 mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        配置大语言模型以启用内置 AI 问答、编辑器辅助和自动标签功能
      </p>

      {/* Enable toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>启用 AI 功能</div>
          <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>API Key 安全存储于本地，不会上传</div>
        </div>
        <button type="button" onClick={() => update({ enabled: !settings.enabled })}
          aria-label={settings.enabled ? '关闭 AI' : '开启 AI'}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          style={{ background: settings.enabled ? 'var(--accent-blue)' : 'var(--bg-tertiary)' }}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
          {/* Provider */}
          <div>
            <label className="mb-1 block text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>服务商</label>
            <select value={settings.provider} onChange={(e) => update({ provider: e.target.value as AiProvider })}
              className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              {(Object.keys(AI_PROVIDER_LABELS) as AiProvider[]).map((p) => (
                <option key={p} value={p}>{AI_PROVIDER_LABELS[p]} ({AI_DEFAULTS[p]?.model})</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1 block text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>API Key</label>
            <input type="password" value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none font-mono"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>

          {/* Model */}
          <div>
            <label className="mb-1 block text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              模型 <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>(默认: {effectiveModel})</span>
            </label>
            <input type="text" value={settings.model} onChange={(e) => update({ model: e.target.value })}
              placeholder={effectiveModel}
              className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1 block text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              API 地址 <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>(默认: {effectiveBaseUrl})</span>
            </label>
            <input type="text" value={settings.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder={effectiveBaseUrl}
              className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none font-mono"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      )}
    </section>
  );
}
