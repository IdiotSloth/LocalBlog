/** AI chat types — shared between main, preload, renderer, and server */

export type AiProvider = 'openai' | 'anthropic' | 'deepseek' | 'ollama';

export interface AiSettings {
  enabled: boolean;
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export const AI_DEFAULTS: Record<AiProvider, { model: string; baseUrl: string }> = {
  openai: { model: 'gpt-4o', baseUrl: 'https://api.openai.com' },
  anthropic: { model: 'claude-sonnet-4-6', baseUrl: 'https://api.anthropic.com' },
  deepseek: { model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
  ollama: { model: 'llama3', baseUrl: 'http://localhost:11434' },
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Pre-retrieved context from RAG search (chunks joined with newlines) */
  context?: string;
}

export interface ChatResponse {
  content: string;
}

export interface TagSuggestionRequest {
  title: string;
  content: string;
}

export interface TagSuggestionResponse {
  tags: string[];
}
