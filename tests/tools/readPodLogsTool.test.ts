import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the k8s client
vi.mock('../../src/cluster/k8sClient', () => ({
  k8sCoreApi: {
    readNamespacedPodLog: vi.fn()
  },
  k8sMetricsClient: {
    getPodMetrics: vi.fn(),
    getNodeMetrics: vi.fn()
  }
}));

import { readPodLogsTool } from '../../src/tools/deepDiveTools';
import { k8sCoreApi } from '../../src/cluster/k8sClient';

describe('readPodLogsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return logs on success', async () => {
    vi.mocked(k8sCoreApi.readNamespacedPodLog).mockResolvedValue('app started on port 3000' as any);

    const result = await readPodLogsTool.invoke({ podName: 'my-pod', namespace: 'default' });

    expect(result).toBe('app started on port 3000');
  });

  it('should extract human-readable message from K8s error body (JSON)', async () => {
    const error = {
      body: JSON.stringify({ message: 'container "main" in pod "my-pod" is not available' })
    };
    vi.mocked(k8sCoreApi.readNamespacedPodLog).mockRejectedValue(error);

    const result = await readPodLogsTool.invoke({ podName: 'my-pod', namespace: 'default' });

    expect(result).toContain('container "main" in pod "my-pod" is not available');
    expect(result).not.toContain('{');
  });

  it('should extract message from response.body.message', async () => {
    const error = {
      response: { body: { message: 'pod "gone-pod" not found' } }
    };
    vi.mocked(k8sCoreApi.readNamespacedPodLog).mockRejectedValue(error);

    const result = await readPodLogsTool.invoke({ podName: 'gone-pod', namespace: 'default' });

    expect(result).toContain('pod "gone-pod" not found');
  });

  it('should fall back to error.message', async () => {
    vi.mocked(k8sCoreApi.readNamespacedPodLog).mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await readPodLogsTool.invoke({ podName: 'my-pod', namespace: 'default' });

    expect(result).toContain('connect ECONNREFUSED');
    expect(result).toMatch(/^Logs unavailable for my-pod:/);
  });

  it('should return friendly message for previous logs not found', async () => {
    const error = {
      response: {
        statusCode: 404,
        body: { message: 'previous terminated container not found' }
      }
    };
    vi.mocked(k8sCoreApi.readNamespacedPodLog).mockRejectedValue(error);

    const result = await readPodLogsTool.invoke({
      podName: 'my-pod',
      namespace: 'default',
      previous: true
    });

    expect(result).toContain('No previous logs found');
  });

  it('should use non-JSON body string as-is', async () => {
    const error = { body: 'plain text error from API' };
    vi.mocked(k8sCoreApi.readNamespacedPodLog).mockRejectedValue(error);

    const result = await readPodLogsTool.invoke({ podName: 'my-pod', namespace: 'default' });

    expect(result).toContain('plain text error from API');
  });
});
