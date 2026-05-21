import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { useAiSettings } from '../../stores/ai-settings';
import { useAuthStore } from '../../stores/auth-store';
import { searchDirect } from '../../lib/use-search';
import type { ChatMessage } from '../../../shared/ai-types';

export function AiChatPanel({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { settings, effectiveModel, effectiveBaseUrl } = useAiSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Typewriter effect
  useEffect(() => {
    if (!displayText) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      if (i >= displayText.length) { clearInterval(timer); return; }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') {
          next[next.length - 1] = { ...last, content: displayText.slice(0, i + 1) };
        }
        return next;
      });
    }, 15);
    return () => clearInterval(timer);
  }, [displayText]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || loading || !user) return;
    if (!settings.enabled || !settings.apiKey) {
      setError('请在设置中配置 AI (API Key)');
      return;
    }

    setInput('');
    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // RAG: search for relevant context from KB + blogs
      let context = '';
      try {
        const results = await searchDirect(q, user.id);
        if (results.length > 0) {
          context = results.slice(0, 3).map((r) => `[${r.type === 'blog' ? '博客' : '知识库'}] ${r.title}: ${r.snippet?.slice(0, 200) || ''}`).join('\n\n');
        }
      } catch { /* context is optional */ }

      // Also fetch recent blog full content as context (blogList doesn't include content field)
      try {
        const blogList = await window.api.blogList({ userId: user.id, sortBy: 'updated_at', sortOrder: 'desc', offset: 0, limit: 10 });
        if (blogList.success && blogList.data?.blogs?.length) {
          const blogIds = blogList.data.blogs.map((b: any) => b.id);
          const fullBlogs = await Promise.all(blogIds.map((id: number) => window.api.blogGet(id)));
          const blogCtx = fullBlogs
            .filter((r: any) => r.success && r.data)
            .map((r: any) => `[博客] ${r.data.title}: ${(r.data.content || '').slice(0, 400)}`)
            .join('\n\n');
          if (blogCtx) {
            context = context ? `${context}\n\n--- 最近博客 ---\n${blogCtx}` : blogCtx;
          }
        }
      } catch { /* best-effort */ }

      const resp = await window.api.aiChat({
        settings: { ...settings, model: effectiveModel, baseUrl: effectiveBaseUrl },
        request: { messages: [...messages, userMsg], context },
      });

      if (resp.success && resp.data) {
        const content = resp.data.content;
        setDisplayText(content);
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      } else {
        setError(resp.error || 'AI 请求失败');
        setMessages((prev) => prev.filter((m) => m !== userMsg));
      }
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => prev.filter((m) => m !== userMsg));
    } finally {
      setLoading(false);
    }
  }, [input, loading, user, settings, effectiveModel, effectiveBaseUrl, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') onClose();
  };

  if (!settings.enabled) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <Bot size={16} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>AI 对话</span>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-70" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Bot size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>AI 功能未启用</p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>前往 设置 → AI 对话 配置 LLM</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: 'var(--accent-blue)' }} />
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>AI 对话</span>
          <span className="text-[10px] rounded-[3px] px-1.5 py-0.5" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{effectiveModel}</span>
        </div>
        <button type="button" onClick={onClose} className="hover:opacity-70" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>基于你的知识库内容回答问题</p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>试试: "总结我最近写的博客"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[8px] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'text-white'
                : ''
            }`}
            style={{
              background: m.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-primary)',
              color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
            }}>
              {m.content}
              {i === messages.length - 1 && m.role === 'assistant' && loading && (
                <span className="inline-block w-2 h-4 ml-0.5 animate-pulse" style={{ background: 'var(--accent-blue)' }} />
              )}
            </div>
          </div>
        ))}
        {error && (
          <div className="rounded-[6px] px-3 py-2 text-[12px]" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={loading ? 'AI 思考中...' : '输入消息...'}
            disabled={loading}
            className="flex-1 rounded-[6px] border px-3 py-2 text-[13px] outline-none disabled:opacity-50"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          <button type="button" onClick={handleSend} disabled={loading || !input.trim()}
            className="rounded-[6px] px-3 py-2 transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
