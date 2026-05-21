import { Router } from 'express';
import type { AiSettings, ChatRequest, TagSuggestionRequest } from '../../shared/ai-types';
import { requireAuth } from '../middleware/auth';

const aiRouter = Router();
aiRouter.use(requireAuth);

// POST /api/chat — RAG chat (web mode)
aiRouter.post('/', async (req, res) => {
  try {
    const { settings, request } = req.body as { settings: AiSettings; request: ChatRequest };
    if (!settings?.apiKey) {
      return res.status(400).json({ success: false, error: 'AI 未配置' });
    }

    // Call LLM API (same logic as AiService, duplicated for server independence)
    const content = await callLlm(settings, request);
    return res.json({ success: true, data: { content } });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

// POST /api/chat/tags — auto-tag suggestions (web mode)
aiRouter.post('/tags', async (req, res) => {
  try {
    const { settings, request, existingTags } = req.body as { settings: AiSettings; request: TagSuggestionRequest; existingTags?: string[] };
    if (!settings?.apiKey) {
      return res.status(400).json({ success: false, error: 'AI 未配置' });
    }

    const existingStr = (existingTags || []).length > 0
      ? `\n现有标签: ${existingTags!.join(', ')}。请优先从现有标签中选择。`
      : '';

    const prompt = `根据以下博客内容，建议 3-5 个标签。只返回标签名，用逗号分隔，不要解释。\n\n标题: ${request.title}\n\n内容: ${request.content.slice(0, 1000)}${existingStr}`;

    const raw = await callLlm(settings, { messages: [{ role: 'user', content: prompt }] });
    const tags = raw
      .split(/[,，]/)
      .map((t: string) => t.trim().replace(/^["'「」]/g, '').replace(/["'「」]$/g, ''))
      .filter((t: string) => t.length > 0 && t.length < 50)
      .slice(0, 5);

    return res.json({ success: true, data: { tags } });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

async function callLlm(settings: AiSettings, request: ChatRequest): Promise<string> {
  const systemMsg = '你是 Local Blog KB 的 AI 助手。用中文回复，保持简洁、有帮助。';
  const allMessages = [
    { role: 'system', content: request.context ? `${systemMsg}\n\n相关知识库内容:\n${request.context}` : systemMsg },
    ...request.messages.filter((m) => m.role !== 'system'),
  ];

  const resp = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, messages: allMessages, temperature: 0.7, max_tokens: 2000 }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`AI API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '(空响应)';
}

export { aiRouter };
