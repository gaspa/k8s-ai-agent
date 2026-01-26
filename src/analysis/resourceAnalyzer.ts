import type {
  ContainerResources,
  PodResourceData,
  PodMetricsData,
  ResourceRecommendation,
  ResourceAnalysis
} from '../types/resources';

// Parse resource quantity strings (e.g., "100m", "1Gi", "500000000n")
export function parseResourceQuantity(quantity: string): number {
  const value = parseFloat(quantity);

  // Millicores (e.g., "100m")
  if (quantity.endsWith('m')) {
    return value / 1000;
  }

  // Nanocores (e.g., "500000000n" from metrics-server)
  if (quantity.endsWith('n')) {
    return value / 1_000_000_000;
  }

  // Memory units
  if (quantity.endsWith('Ki')) {
    return parseFloat(quantity.slice(0, -2)) * 1024;
  }
  if (quantity.endsWith('Mi')) {
    return parseFloat(quantity.slice(0, -2)) * 1024 * 1024;
  }
  if (quantity.endsWith('Gi')) {
    return parseFloat(quantity.slice(0, -2)) * 1024 * 1024 * 1024;
  }
  if (quantity.endsWith('Ti')) {
    return parseFloat(quantity.slice(0, -2)) * 1024 * 1024 * 1024 * 1024;
  }

  // Plain number (CPU cores or bytes)
  return value;
}

// Format bytes to human readable
function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024 * 1024))}Gi`;
  }
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))}Mi`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)}Ki`;
  }
  return `${bytes}`;
}

// Format CPU to human readable
function formatCPU(cores: number): string {
  if (cores < 1) {
    return `${Math.round(cores * 1000)}m`;
  }
  return `${cores}`;
}

// Thresholds for recommendations
const OVER_PROVISIONED_THRESHOLD = 0.3; // Using less than 30% of request
const UNDER_PROVISIONED_THRESHOLD = 0.8; // Using more than 80% of limit
const HEADROOM_MULTIPLIER = 1.5; // Add 50% headroom for recommendations

interface ResourceCheckResult {
  isOverProvisioned: boolean;
  isUnderProvisioned: boolean;
  recommendation?: ResourceRecommendation;
}

function checkMissingResources(containerName: string, resources: ContainerResources): string[] {
  const warnings: string[] = [];
  if (!resources.requests?.cpu) warnings.push(`Container "${containerName}" has no CPU request set`);
  if (!resources.requests?.memory) warnings.push(`Container "${containerName}" has no memory request set`);
  if (!resources.limits?.cpu) warnings.push(`Container "${containerName}" has no CPU limit set`);
  if (!resources.limits?.memory) warnings.push(`Container "${containerName}" has no memory limit set`);
  return warnings;
}

function checkResourceProvisioning(
  usage: number,
  request: number | undefined,
  limit: number | undefined,
  containerName: string,
  resourceType: 'cpu' | 'memory',
  currentRequest: string | undefined,
  currentLimit: string | undefined,
  formatFn: (val: number) => string,
  roundFn: (val: number) => number
): ResourceCheckResult {
  if (request && usage / request < OVER_PROVISIONED_THRESHOLD) {
    const suggested = roundFn(usage * HEADROOM_MULTIPLIER);
    return {
      isOverProvisioned: true,
      isUnderProvisioned: false,
      recommendation: {
        type: 'reduce',
        resource: resourceType,
        containerName,
        currentRequest,
        currentLimit,
        suggestedRequest: formatFn(suggested),
        suggestedLimit: formatFn(suggested * 2),
        reason: `Using only ${formatFn(usage)} of ${currentRequest} requested`
      }
    };
  }

  if (limit && usage / limit > UNDER_PROVISIONED_THRESHOLD) {
    const suggested = roundFn(usage * HEADROOM_MULTIPLIER);
    return {
      isOverProvisioned: false,
      isUnderProvisioned: true,
      recommendation: {
        type: 'increase',
        resource: resourceType,
        containerName,
        currentRequest,
        currentLimit,
        suggestedRequest: formatFn(suggested),
        suggestedLimit: formatFn(suggested * 2),
        reason: `Using ${formatFn(usage)} which is ${Math.round((usage / limit) * 100)}% of limit`
      }
    };
  }

  return { isOverProvisioned: false, isUnderProvisioned: false };
}

function roundCpu(value: number): number {
  return Math.ceil(value * 1000) / 1000;
}

function roundMemory(value: number): number {
  return Math.ceil(value);
}

function buildUnknownAnalysis(podName: string, containerName: string): ResourceAnalysis {
  return {
    podName,
    containerName,
    status: 'unknown',
    recommendations: [],
    warnings: ['Could not find container data'],
    metrics: { cpuUsage: 0, memoryUsage: 0 }
  };
}

function determineStatus(
  cpuResult: ResourceCheckResult,
  memoryResult: ResourceCheckResult
): ResourceAnalysis['status'] {
  if (cpuResult.isUnderProvisioned || memoryResult.isUnderProvisioned) return 'under-provisioned';
  if (cpuResult.isOverProvisioned || memoryResult.isOverProvisioned) return 'over-provisioned';
  return 'right-sized';
}

interface ParsedResources {
  cpuRequest?: number;
  cpuLimit?: number;
  memoryRequest?: number;
  memoryLimit?: number;
}

function parseContainerResources(container: ContainerResources): ParsedResources {
  const cpuReq = container.requests?.cpu;
  const cpuLim = container.limits?.cpu;
  const memReq = container.requests?.memory;
  const memLim = container.limits?.memory;
  return {
    cpuRequest: cpuReq ? parseResourceQuantity(cpuReq) : undefined,
    cpuLimit: cpuLim ? parseResourceQuantity(cpuLim) : undefined,
    memoryRequest: memReq ? parseResourceQuantity(memReq) : undefined,
    memoryLimit: memLim ? parseResourceQuantity(memLim) : undefined
  };
}

function collectRecommendations(
  cpuResult: ResourceCheckResult,
  memoryResult: ResourceCheckResult
): ResourceRecommendation[] {
  const recommendations: ResourceRecommendation[] = [];
  if (cpuResult.recommendation) recommendations.push(cpuResult.recommendation);
  if (memoryResult.recommendation) recommendations.push(memoryResult.recommendation);
  return recommendations;
}

function analyzeContainerResources(
  container: ContainerResources,
  cpuUsage: number,
  memoryUsage: number,
  parsed: ParsedResources
): { cpuResult: ResourceCheckResult; memoryResult: ResourceCheckResult } {
  const cpuResult = checkResourceProvisioning(
    cpuUsage,
    parsed.cpuRequest,
    parsed.cpuLimit,
    container.name,
    'cpu',
    container.requests?.cpu,
    container.limits?.cpu,
    formatCPU,
    roundCpu
  );
  const memoryResult = checkResourceProvisioning(
    memoryUsage,
    parsed.memoryRequest,
    parsed.memoryLimit,
    container.name,
    'memory',
    container.requests?.memory,
    container.limits?.memory,
    formatMemory,
    roundMemory
  );
  return { cpuResult, memoryResult };
}

export function analyzeResources(resources: PodResourceData, metrics: PodMetricsData): ResourceAnalysis {
  const container = resources.containers[0];
  const containerMetrics = metrics.containers.find(c => c.name === container?.name) || metrics.containers[0];

  if (!container || !containerMetrics) {
    return buildUnknownAnalysis(resources.name, container?.name || 'unknown');
  }

  const cpuUsage = parseResourceQuantity(containerMetrics.usage.cpu);
  const memoryUsage = parseResourceQuantity(containerMetrics.usage.memory);
  const parsed = parseContainerResources(container);
  const warnings = checkMissingResources(container.name, container);
  const { cpuResult, memoryResult } = analyzeContainerResources(container, cpuUsage, memoryUsage, parsed);

  return {
    podName: resources.name,
    containerName: container.name,
    status: determineStatus(cpuResult, memoryResult),
    recommendations: collectRecommendations(cpuResult, memoryResult),
    warnings,
    metrics: { cpuUsage, memoryUsage, ...parsed }
  };
}

export function formatRecommendation(rec: ResourceRecommendation): string {
  const action = rec.type === 'increase' ? 'Increase' : rec.type === 'reduce' ? 'Reduce' : 'Add';
  let text = `${action} ${rec.resource} for container "${rec.containerName}": `;
  text += rec.reason;

  if (rec.suggestedRequest) {
    text += `\n  Suggested request: ${rec.suggestedRequest}`;
  }
  if (rec.suggestedLimit) {
    text += `\n  Suggested limit: ${rec.suggestedLimit}`;
  }

  return text;
}
