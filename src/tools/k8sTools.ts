import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { k8sCoreApi } from '../cluster/k8sClient';

// Tool per listare i pod in un namespace
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
      return `Errore nel recupero pod: ${JSON.stringify(e)}`;
    }
  },
  {
    name: 'list_pods',
    description: 'Lista i pod in un namespace specifico per controllare lo stato e i riavvii.',
    schema: z.object({
      namespace: z.string().describe('Il namespace di kubernetes da analizzare')
    })
  }
);

// Tool per controllare i nodi (per problemi generali)
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
      return `Errore nel recupero nodi: ${JSON.stringify(e)}`;
    }
  },
  {
    name: 'list_nodes',
    description: 'Controlla lo stato dei nodi del cluster per problemi generali di infrastruttura.',
    schema: z.object({})
  }
);
