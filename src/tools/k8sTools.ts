import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { k8sCoreApi } from '../cluster/k8sClient';

// Tool to list pods in a namespace
export const listPodsTool = tool(
  async ({ namespace }) => {
    try {
      const res = await k8sCoreApi.listNamespacedPod({ namespace });
      return JSON.stringify(
        res.items.map(p => {
          const podStatus = p.status;
          const podFirstContainerStatuses = podStatus?.containerStatuses?.[0];
          return {
            name: p.metadata?.name,
            status: podStatus?.phase,
            restarts: podFirstContainerStatuses?.restartCount,
            message: podFirstContainerStatuses?.state?.waiting?.message
          };
        })
      );
    } catch (e) {
      return `Error retrieving pods: ${JSON.stringify(e)}`;
    }
  },
  {
    name: 'list_pods',
    description: 'Lists pods in a specific namespace to check their status and restarts.',
    schema: z.object({
      namespace: z.string().describe('The kubernetes namespace to analyze')
    })
  }
);

// Tool to check nodes (for general issues)
export const listNodesTool = tool(
  async () => {
    try {
      const res = await k8sCoreApi.listNode();
      return JSON.stringify(
        res.items.map(n => ({
          name: n.metadata?.name,
          conditions: n.status?.conditions?.filter(c => c.status === 'True')
        }))
      );
    } catch (e) {
      return `Error retrieving nodes: ${JSON.stringify(e)}`;
    }
  },
  {
    name: 'list_nodes',
    description: 'Checks the cluster node status for general infrastructure issues.',
    schema: z.object({})
  }
);
