import { createAgent } from 'langchain';
import { listNodesTool, listPodsTool } from '../tools/k8sTools';
import { ChatAnthropic } from '@langchain/anthropic';

export const getAgent = () => {
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0
  });

  const tools = [listPodsTool, listNodesTool];

  // Create the agent by passing it the model and tools
  return createAgent({
    model,
    tools
  });
};
