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
  addEdge,
} from "@xyflow/react";

export type NodeExecutionStatus = "idle" | "running" | "success" | "error";

export interface NodeData {
  label: string;
  [key: string]: unknown;
}

export interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nodeExecutionStatus: Record<string, NodeExecutionStatus>;
  nodeOutputs: Record<string, unknown>;
  nodeErrors: Record<string, string>;
  
  // Actions
  onNodesChange: OnNodesChange<Node<NodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  addNode: (node: Node<NodeData>) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeOutput: (nodeId: string, output: unknown) => void;
  setNodeError: (nodeId: string, error: string) => void;
  clearNodeError: (nodeId: string) => void;
  getConnectedInputs: (nodeId: string) => { sourceId: string; sourceHandle: string | null; data: unknown }[];
  getNodeOutput: (nodeId: string) => unknown;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeExecutionStatus: {},
  nodeOutputs: {},
  nodeErrors: {},

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
    if (connection.source && connection.target) {
      set({
        edges: addEdge(
          {
            ...connection,
            id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          },
          get().edges
        ),
      });
    }
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      nodeExecutionStatus: { ...get().nodeExecutionStatus, [node.id]: "idle" },
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  setNodeExecutionStatus: (nodeId, status) => {
    set({
      nodeExecutionStatus: { ...get().nodeExecutionStatus, [nodeId]: status },
    });
  },

  setNodeOutput: (nodeId, output) => {
    set({
      nodeOutputs: { ...get().nodeOutputs, [nodeId]: output },
    });
  },

  setNodeError: (nodeId, error) => {
    set({
      nodeErrors: { ...get().nodeErrors, [nodeId]: error },
    });
  },

  clearNodeError: (nodeId) => {
    const { [nodeId]: _, ...rest } = get().nodeErrors;
    set({ nodeErrors: rest });
  },

  getConnectedInputs: (nodeId) => {
    const { edges, nodeOutputs } = get();
    const connectedEdges = edges.filter((edge) => edge.target === nodeId);
    
    return connectedEdges.map((edge) => ({
      sourceId: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      data: nodeOutputs[edge.source],
    }));
  },

  getNodeOutput: (nodeId) => {
    return get().nodeOutputs[nodeId];
  },
}));
