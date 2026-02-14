import { StateGraph, END } from '@langchain/langgraph';
import { DiagnosticState, type DiagnosticStateType } from './state';
import { triageNode } from './nodes/triageNode';
import { deepDiveNode } from './nodes/deepDiveNode';
import { analysisNode } from './nodes/analysisNode';
import { summaryNode } from './nodes/summaryNode';

// Conditional edge: determines whether to deep dive or go straight to summary
export function shouldDeepDive(state: DiagnosticStateType): 'deep_dive' | 'summary' {
  return state.needsDeepDive ? 'deep_dive' : 'summary';
}

// Create the diagnostic graph
// Flow: triage → [deep_dive → analysis] | summary → END
export function createDiagnosticGraph() {
  const graph = new StateGraph(DiagnosticState)
    .addNode('triage', triageNode)
    .addNode('deep_dive', deepDiveNode)
    .addNode('analysis', analysisNode)
    .addNode('summary', summaryNode)

    .addEdge('__start__', 'triage')
    .addConditionalEdges('triage', shouldDeepDive, {
      deep_dive: 'deep_dive',
      summary: 'summary'
    })
    .addEdge('deep_dive', 'analysis')
    .addEdge('analysis', 'summary')
    .addEdge('summary', END);

  // Compile and return the graph
  return graph.compile();
}

// Export the compiled graph as a singleton
let _graph: ReturnType<typeof createDiagnosticGraph> | null = null;

export function getDiagnosticGraph() {
  if (!_graph) {
    _graph = createDiagnosticGraph();
  }
  return _graph;
}
