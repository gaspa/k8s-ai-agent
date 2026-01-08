import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { k8sCoreApi } from '../cluster/k8sClient';
import { getLogger } from '@fluidware-it/saddlebag';

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

// Tool to read logs from a specific pod
export const readPodLogsTool = tool(
  async ({ podName, namespace, containerName, previous, tailLines = 100 }) => {
    try {
      getLogger().info(`Reading pod ${namespace}:${podName} logs (container: ${containerName}, previous: ${previous})`);
      return await k8sCoreApi.readNamespacedPodLog({
        name: podName,
        namespace,
        container: containerName,
        tailLines,
        previous
      });
    } catch (e: any) {
      // Specific error handling: if we request previous logs but they don't exist
      if (e.response?.statusCode === 404 || e.response?.body?.message?.includes('previous terminated container')) {
        return `No previous logs found for pod ${podName}. Try reading current logs.`;
      }
      getLogger().error(`Error reading pod ${namespace}:${podName} logs`);
      return `Error while reading pod ${podName} logs: ${JSON.stringify(e)}`;
    }
  },
  {
    name: 'read_pod_logs',
    description:
      "Reads pod logs. Set 'previous' to true if the pod has crashed (CrashLoopBackOff) to see the error that caused the restart.",
    schema: z.object({
      podName: z.string().describe('The name of the pod'),
      namespace: z.string().describe('The namespace of the pod'),
      containerName: z.string().describe('The name of the container (optional if there is only one)'),
      previous: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, reads logs from the previous instance (useful for crashes)'),
      tailLines: z.number().optional().default(100).describe('Number of final lines to read (default 100)')
    })
  }
);
