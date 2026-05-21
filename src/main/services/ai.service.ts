import type { AiProvider, ChatMessage, ChatRequest, TagSuggestionRequest } from '../../shared/ai-types';

interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

function buildSystemPrompt(context?: string): string {
  const base = '你是 Local Blog KB 的 AI 助手。你可以访问用户的知识库内容来回答问题。请用中文回复，保持简洁、有帮助。';
  if (context) {
    return `${base}\n\n以下是用户知识库中与问题相关的内容：\n\n${context}\n\n请基于以上内容回答用户的问题。如果引用了特定文档，请在回答中标注来源。`;
  }
  return base;
}

function buildUserPrompt(messages: ChatMessage[]): string {
  // Convert chat history to a single prompt for simplicity
  const parts = messages.map((m) => {
    if (m.role === 'system') return `指令: ${m.content}`;
    if (m.role === 'user') return `用户: ${m.content}`;
    return `助手: ${m.content}`;
  });
  return parts.join('\n\n');
}

async function callOpenAiCompatible(
  config: AiConfig,
  messages: ChatMessage[],
  context?: string,
): Promise<string> {
  const systemMsg: ChatMessage = { role: 'system', content: buildSystemPrompt(context) };
  const allMessages = [systemMsg, ...messages.filter((m) => m.role !== 'system')];

  const resp = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`AI API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '(空响应)';
}

async function callAnthropic(
  config: AiConfig,
  messages: ChatMessage[],
  context?: string,
): Promise<string> {
  const systemParts = [buildSystemPrompt(context)];
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const lastUserMsg = userMessages[userMessages.length - 1] || '';

  const resp = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system: systemParts.join('\n\n'),
      messages: [{ role: 'user', content: lastUserMsg }],
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`AI API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json() as { content?: Array<{ type: string; text?: string }> };
  return data.content?.map((b) => b.text || '').join('') || '(空响应)';
}

export class AiService {
  static async chat(config: AiConfig, request: ChatRequest): Promise<string> {
    if (!config.apiKey) throw new Error('AI 未配置: 请在设置中填写 API Key');

    const { messages, context } = request;

    if (config.provider === 'anthropic') {
      return callAnthropic(config, messages, context);
    }

    // OpenAI, DeepSeek, Ollama all use OpenAI-compatible API
    return callOpenAiCompatible(config, messages, context);
  }

  static async suggestTags(
    config: AiConfig,
    request: TagSuggestionRequest,
    existingTags: string[],
  ): Promise<string[]> {
    if (!config.apiKey) throw new Error('AI 未配置');

    const existingStr = existingTags.length > 0
      ? `\n现有标签: ${existingTags.join(', ')}。请优先从现有标签中选择，必要时建议新标签。`
      : '';

    const prompt = `根据以下博客内容，建议 3-5 个标签。只返回标签名，用逗号分隔，不要解释。\n\n标题: ${request.title}\n\n内容: ${request.content.slice(0, 1000)}${existingStr}`;

    const raw = await callOpenAiCompatible(
      config,
      [{ role: 'user', content: prompt }],
    );

    // Parse comma-separated tags
    return raw
      .split(/[,，]/)
      .map((t) => t.trim().replace(/^["'「」]/g, '').replace(/["'「」]$/g, ''))
      .filter((t) => t.length > 0 && t.length < 50)
      .slice(0, 5);
  }
}
