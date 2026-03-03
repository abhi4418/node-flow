import { useFlowStore } from "@/store/flowStore";
import type { ExecutionMode } from "@/store/flowStore";
import { executeNode as defaultExecuteNode } from "./nodeExecutor";

interface ExecuteNodeFn {
  (nodeId: string): Promise<void>;
}

// Execute workflow with parallel execution for independent branches
export async function executeWorkflow(
  mode: ExecutionMode,
  selectedNodeIds?: string[],
  executeNode: ExecuteNodeFn = defaultExecuteNode
) {
  const store = useFlowStore.getState();
  
  if (store.isExecuting) {
    console.log("Workflow already executing");
    return;
  }
  
  // Determine which nodes to execute
  let nodesToExecute: string[];
  
  switch (mode) {
    case "single":
      if (!selectedNodeIds || selectedNodeIds.length !== 1) {
        throw new Error("Single mode requires exactly one node");
      }
      nodesToExecute = selectedNodeIds;
      break;
    case "selected":
      if (!selectedNodeIds || selectedNodeIds.length === 0) {
        throw new Error("Selected mode requires at least one node");
      }
      nodesToExecute = selectedNodeIds;
      break;
    case "full":
    default:
      nodesToExecute = store.nodes.map((n) => n.id);
      break;
  }
  
  // Get topological order for execution
  const executionOrder = store.getTopologicalOrder(nodesToExecute);
  
  // Build dependency map
  const nodeSet = new Set(nodesToExecute);
  const dependencies = new Map<string, Set<string>>();
  
  for (const nodeId of nodesToExecute) {
    const deps = store.getDependencies(nodeId).filter((d) => nodeSet.has(d));
    dependencies.set(nodeId, new Set(deps));
  }
  
  // Track completion
  const completed = new Set<string>();
  const running = new Set<string>();
  const failed = new Set<string>();
  
  store.setIsExecuting(true);
  
  // Reset all nodes to idle
  for (const nodeId of nodesToExecute) {
    store.setNodeExecutionStatus(nodeId, "idle");
    store.clearNodeError(nodeId);
  }
  
  // Execute nodes in parallel when possible
  async function executeReady(): Promise<void> {
    // Find nodes that are ready to execute (all dependencies completed)
    const ready = executionOrder.filter((nodeId) => {
      if (completed.has(nodeId) || running.has(nodeId) || failed.has(nodeId)) {
        return false;
      }
      
      const deps = dependencies.get(nodeId) || new Set();
      for (const dep of deps) {
        if (!completed.has(dep)) {
          // If a dependency failed, this node can't run
          if (failed.has(dep)) {
            failed.add(nodeId);
            store.setNodeExecutionStatus(nodeId, "error");
            store.setNodeError(nodeId, "Dependency failed");
            return false;
          }
          return false;
        }
      }
      return true;
    });
    
    if (ready.length === 0) {
      // No more nodes to execute
      return;
    }
    
    // Execute all ready nodes in parallel
    const promises = ready.map(async (nodeId) => {
      running.add(nodeId);
      store.setNodeExecutionStatus(nodeId, "running");
      
      try {
        await executeNode(nodeId);
        completed.add(nodeId);
        running.delete(nodeId);
        store.setNodeExecutionStatus(nodeId, "success");
      } catch (error) {
        failed.add(nodeId);
        running.delete(nodeId);
        store.setNodeExecutionStatus(nodeId, "error");
        store.setNodeError(nodeId, error instanceof Error ? error.message : "Unknown error");
      }
    });
    
    await Promise.all(promises);
    
    // Continue with next batch
    await executeReady();
  }
  
  try {
    await executeReady();
  } finally {
    store.setIsExecuting(false);
  }
  
  return {
    completed: Array.from(completed),
    failed: Array.from(failed),
  };
}

// Undo/Redo helpers
export function undo() {
  useFlowStore.getState().undo();
}

export function redo() {
  useFlowStore.getState().redo();
}

export function canUndo(): boolean {
  return useFlowStore.getState().canUndo();
}

export function canRedo(): boolean {
  return useFlowStore.getState().canRedo();
}
