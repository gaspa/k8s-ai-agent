// Resource analysis types

export interface ContainerResources {
  name: string;
  requests?: {
    cpu?: string;
    memory?: string;
  };
  limits?: {
    cpu?: string;
    memory?: string;
  };
}

export interface ContainerMetrics {
  name: string;
  usage: {
    cpu: string;
    memory: string;
  };
}

export interface PodResourceData {
  name: string;
  containers: ContainerResources[];
}

export interface PodMetricsData {
  name: string;
  containers: ContainerMetrics[];
}

export interface ResourceRecommendation {
  type: 'increase' | 'reduce' | 'add';
  resource: 'cpu' | 'memory';
  containerName: string;
  currentRequest?: string | undefined;
  currentLimit?: string | undefined;
  suggestedRequest?: string | undefined;
  suggestedLimit?: string | undefined;
  reason: string;
}

export interface ResourceAnalysis {
  podName: string;
  containerName: string;
  status: 'right-sized' | 'over-provisioned' | 'under-provisioned' | 'unknown';
  recommendations: ResourceRecommendation[];
  warnings: string[];
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    cpuRequest?: number | undefined;
    cpuLimit?: number | undefined;
    memoryRequest?: number | undefined;
    memoryLimit?: number | undefined;
  };
}
