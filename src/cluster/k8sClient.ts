import * as k8s from '@kubernetes/client-node';
import { getLogger } from '@fluidware-it/saddlebag';

const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // Carica il contesto corrente dal tuo terminale
getLogger().info(`K8s context loaded: ${kc.getCurrentContext()}`);

export const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
export const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
