import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

// Returns ChatAnthropic if ANTHROPIC_API_KEY is set, otherwise falls back to ChatOllama
export function getChatModel(): BaseChatModel {
  // eslint-disable-next-line n/no-process-env
  if (process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0
    });
  }
  return new ChatOllama({
    model: 'gpt-oss', // qwen3-coder
    temperature: 0
  });
}
