import { useCallback, useSyncExternalStore } from 'react';
import type { AiProvider, AiSettings } from '../../shared/ai-types';
import { AI_DEFAULTS } from '../../shared/ai-types';

const LS_KEY = 'lbkb_ai_settings';

function load(): AiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: false, provider: 'openai', apiKey: '', model: '', baseUrl: '' };
}

function save(s: AiSettings) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }

let listeners: Array<() => void> = [];
let cached = load();
function subscribe(cb: () => void) { listeners.push(cb); return () => { listeners = listeners.filter((l) => l !== cb); }; }
function getSnapshot() { return cached; }
function emit() { cached = load(); for (const fn of listeners) fn(); }

export function useAiSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  const update = useCallback((patch: Partial<AiSettings>) => {
    const current = load();
    const next = { ...current, ...patch };
    // When switching provider, reset model to default
    if (patch.provider && patch.provider !== current.provider) {
      next.model = AI_DEFAULTS[patch.provider]?.model || '';
      next.baseUrl = AI_DEFAULTS[patch.provider]?.baseUrl || '';
    }
    save(next);
    emit();
  }, []);

  const effectiveModel = settings.model || AI_DEFAULTS[settings.provider]?.model || '';
  const effectiveBaseUrl = settings.baseUrl || AI_DEFAULTS[settings.provider]?.baseUrl || '';

  return { settings, effectiveModel, effectiveBaseUrl, update };
}

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  deepseek: 'DeepSeek',
  ollama: 'Ollama (本地)',
};
