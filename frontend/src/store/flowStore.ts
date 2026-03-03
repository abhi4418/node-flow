import { create } from "zustand";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";

export type NodeExecutionStatus = "idle" | "running" | "success" | "error";
export type ExecutionMode = "full" | "single" | "selected";

export interface NodeData {
  label: string;
  [key: string]: unknown;
}

interface HistoryEntry {
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowName: string;
}

export interface FlowState {
  // Workflow metadata
  workflowId: string | null;
  workflowName: string;
  
  // Graph data
  nodes: Node<NodeData>[];
  edges: Edge[];
  
  // Selection state
  selectedNodes: Set<string>;
  
  // Execution state
  nodeExecutionStatus: Record<string, NodeExecutionStatus>;
  nodeOutputs: Record<string, unknown>;
  nodeErrors: Record<string, string>;
  isExecuting: boolean;
  
  // History for undo/redo
  past: HistoryEntry[];
  future: HistoryEntry[];
  
  // Actions - Graph
  onNodesChange: OnNodesChange<Node<NodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  // Actions - Node CRUD
  addNode: (node: Node<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteSelectedNodes: () => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  
  // Actions - Selection
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  deselectNode: (nodeId: string) => void;
  selectAllNodes: () => void;
  clearSelection: () => void;
  
  // Actions - Execution
  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeOutput: (nodeId: string, output: unknown) => void;
  setNodeError: (nodeId: string, error: string) => void;
  clearNodeError: (nodeId: string) => void;
  setIsExecuting: (isExecuting: boolean) => void;
  
  // Actions - Workflow
  setWorkflow: (id: string | null, name: string, nodes: Node<NodeData>[], edges: Edge[]) => void;
  clearWorkflow: () => void;
  setWorkflowName: (name: string) => void;
  setWorkflowId: (id: string | null) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
  
  // Helpers
  getConnectedInputs: (nodeId: string) => { sourceId: string; sourceHandle: string | null; data: unknown }[];
  getNodeOutput: (nodeId: string) => unknown;
  
  // DAG Helpers
  validateConnection: (connection: Connection) => boolean;
  getTopologicalOrder: (nodeIds?: string[]) => string[];
  getDependencies: (nodeId: string) => string[];
  getDependents: (nodeId: string) => string[];
}

// Check if adding an edge would create a cycle
function wouldCreateCycle(
  edges: Edge[],
  source: string,
  target: string
): boolean {
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }
  
  // Add the proposed edge
  if (!adjacency.has(source)) {
    adjacency.set(source, []);
  }
  adjacency.get(source)!.push(target);
  
  // DFS to detect cycle
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  // Start DFS from source
  return hasCycle(source);
}

// Get topological order of nodes
function getTopologicalSort(nodes: Node[], edges: Edge[], subset?: Set<string>): string[] {
  const nodeIds = subset || new Set(nodes.map(n => n.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  // Initialize
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }
  
  // Build graph (only for nodes in subset)
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }
  
  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }
  
  const result: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    
    for (const neighbor of adjacency.get(node) || []) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return result;
}

const HISTORY_LIMIT = 50;

export const useFlowStore = create<FlowState>()((set, get) => ({
  // Initial state
  workflowId: null,
  workflowName: "Untitled Workflow",
  nodes: [],
  edges: [],
  selectedNodes: new Set<string>(),
  nodeExecutionStatus: {},
  nodeOutputs: {},
  nodeErrors: {},
  isExecuting: false,
  past: [],
  future: [],

  saveToHistory: () => {
    const state = get();
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      workflowName: state.workflowName,
    };
    set({
      past: [...state.past.slice(-HISTORY_LIMIT + 1), entry],
      future: [],
    });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    
    const previous = state.past[state.past.length - 1];
    const currentEntry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      workflowName: state.workflowName,
    };
    
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      workflowName: previous.workflowName,
      past: state.past.slice(0, -1),
      future: [currentEntry, ...state.future],
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    
    const next = state.future[0];
    const currentEntry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      workflowName: state.workflowName,
    };
    
    set({
      nodes: next.nodes,
      edges: next.edges,
      workflowName: next.workflowName,
      past: [...state.past, currentEntry],
      future: state.future.slice(1),
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    const state = get();
    
    if (!connection.source || !connection.target) {
      console.log('Invalid connection: missing source or target');
      return;
    }
    
    // Check for self-loop
    if (connection.source === connection.target) {
      console.log('Invalid connection: self-loop not allowed');
      return;
    }
    
    // Check if connection would create cycle
    if (wouldCreateCycle(state.edges, connection.source, connection.target)) {
      console.log('Invalid connection: would create cycle');
      return;
    }
    
    // Save to history before making change
    get().saveToHistory();
    
    const newEdge: Edge = {
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    };
    
    console.log('Adding edge:', newEdge);
    set({
      edges: [...state.edges, newEdge],
    });
  },

  addNode: (node: Node<NodeData>) => {
    get().saveToHistory();
    set({
      nodes: [...get().nodes, node],
      nodeExecutionStatus: { ...get().nodeExecutionStatus, [node.id]: "idle" },
    });
  },

  deleteNode: (nodeId: string) => {
    const state = get();
    state.saveToHistory();
    set({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodes: new Set([...state.selectedNodes].filter((id) => id !== nodeId)),
    });
  },

  deleteSelectedNodes: () => {
    const state = get();
    const selected = state.selectedNodes;
    
    if (selected.size === 0) return;
    
    state.saveToHistory();
    set({
      nodes: state.nodes.filter((n) => !selected.has(n.id)),
      edges: state.edges.filter((e) => !selected.has(e.source) && !selected.has(e.target)),
      selectedNodes: new Set(),
    });
  },

  updateNodeData: (nodeId: string, data: Partial<NodeData>) => {
    get().saveToHistory();
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  selectNode: (nodeId: string, addToSelection = false) => {
    const state = get();
    if (addToSelection) {
      const newSelected = new Set(state.selectedNodes);
      newSelected.add(nodeId);
      set({ selectedNodes: newSelected });
    } else {
      set({ selectedNodes: new Set([nodeId]) });
    }
  },

  deselectNode: (nodeId: string) => {
    const state = get();
    const newSelected = new Set(state.selectedNodes);
    newSelected.delete(nodeId);
    set({ selectedNodes: newSelected });
  },

  selectAllNodes: () => {
    const state = get();
    set({ selectedNodes: new Set(state.nodes.map((n) => n.id)) });
  },

  clearSelection: () => {
    set({ selectedNodes: new Set() });
  },

  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => {
    set({
      nodeExecutionStatus: { ...get().nodeExecutionStatus, [nodeId]: status },
    });
  },

  setNodeOutput: (nodeId: string, output: unknown) => {
    set({
      nodeOutputs: { ...get().nodeOutputs, [nodeId]: output },
    });
  },

  setNodeError: (nodeId: string, error: string) => {
    set({
      nodeErrors: { ...get().nodeErrors, [nodeId]: error },
    });
  },

  clearNodeError: (nodeId: string) => {
    const { [nodeId]: _, ...rest } = get().nodeErrors;
    set({ nodeErrors: rest });
  },

  setIsExecuting: (isExecuting: boolean) => {
    set({ isExecuting });
  },

  setWorkflow: (id: string | null, name: string, nodes: Node<NodeData>[], edges: Edge[]) => {
    set({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      nodeExecutionStatus: Object.fromEntries(nodes.map((n) => [n.id, "idle" as NodeExecutionStatus])),
      nodeOutputs: {},
      nodeErrors: {},
      selectedNodes: new Set(),
      isExecuting: false,
      past: [],
      future: [],
    });
  },

  clearWorkflow: () => {
    set({
      workflowId: null,
      workflowName: "Untitled Workflow",
      nodes: [],
      edges: [],
      nodeExecutionStatus: {},
      nodeOutputs: {},
      nodeErrors: {},
      selectedNodes: new Set(),
      isExecuting: false,
      past: [],
      future: [],
    });
  },

  setWorkflowName: (name: string) => {
    set({ workflowName: name });
  },

  setWorkflowId: (id: string | null) => {
    set({ workflowId: id });
  },

  getConnectedInputs: (nodeId: string) => {
    const { edges, nodeOutputs } = get();
    const connectedEdges = edges.filter((edge) => edge.target === nodeId);
    
    return connectedEdges.map((edge) => ({
      sourceId: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      data: nodeOutputs[edge.source],
    }));
  },

  getNodeOutput: (nodeId: string) => {
    return get().nodeOutputs[nodeId];
  },

  validateConnection: (connection: Connection) => {
    const state = get();
    
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    if (wouldCreateCycle(state.edges, connection.source, connection.target)) return false;
    
    return true;
  },

  getTopologicalOrder: (nodeIds?: string[]) => {
    const state = get();
    const subset = nodeIds ? new Set(nodeIds) : undefined;
    return getTopologicalSort(state.nodes, state.edges, subset);
  },

  getDependencies: (nodeId: string) => {
    const { edges } = get();
    return edges.filter((e) => e.target === nodeId).map((e) => e.source);
  },

  getDependents: (nodeId: string) => {
    const { edges } = get();
    return edges.filter((e) => e.source === nodeId).map((e) => e.target);
  },
}));
