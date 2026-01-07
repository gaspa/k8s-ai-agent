import { createAgent } from 'langchain';
import { listNodesTool, listPodsTool } from '../tools/k8sTools';
import { ChatAnthropic } from '@langchain/anthropic';

export const getAgent = () => {
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0
  });

  const tools = [listPodsTool, listNodesTool];

  // Creiamo l'agente passandogli il modello e i tool
  return createAgent({
    model,
    tools
  });
};
