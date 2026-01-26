import type { TriageResult } from './triage';

export interface SummaryInput {
  namespace: string;
  triageResult: TriageResult;
  deepDiveFindings: string[];
}
