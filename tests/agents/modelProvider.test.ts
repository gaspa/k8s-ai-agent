import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock langchain modules to avoid real instantiation
vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: class {
    type = 'anthropic';
    constructor(_opts: any) {}
  }
}));
vi.mock('@langchain/ollama', () => ({
  ChatOllama: class {
    type = 'ollama';
    constructor(_opts: any) {}
  }
}));

import { getChatModel } from '../../src/agents/modelProvider';

describe('modelProvider', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it('should return ChatAnthropic when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const model = getChatModel();
    expect((model as any).type).toBe('anthropic');
  });

  it('should return ChatOllama when ANTHROPIC_API_KEY is not set', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const model = getChatModel();
    expect((model as any).type).toBe('ollama');
  });
});
