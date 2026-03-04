"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFlowStore } from "@/store/flowStore";
import { nodeTypes, nodeDefinitions, type NodeType } from "./nodes";
import { undo, redo, canUndo, canRedo } from "@/lib/execution";

let nodeId = 100;
const getNodeId = () => `node_${++nodeId}`;

function FlowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const onNodesChange = useFlowStore((state) => state.onNodesChange);
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange);
  const storeOnConnect = useFlowStore((state) => state.onConnect);
  const addNode = useFlowStore((state) => state.addNode);
  const deleteSelectedNodes = useFlowStore((state) => state.deleteSelectedNodes);
  const selectNode = useFlowStore((state) => state.selectNode);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedNodes();
      }
      if (event.key === "z" && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) undo();
      }
      if (
        (event.key === "y" && (event.ctrlKey || event.metaKey)) ||
        (event.key === "z" && (event.ctrlKey || event.metaKey) && event.shiftKey)
      ) {
        event.preventDefault();
        if (canRedo()) redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedNodes]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      useFlowStore.getState().selectedNodes.forEach((id) => {
        selectNode(id, false);
      });
      selectedNodes.forEach((node) => {
        selectNode(node.id, true);
      });
    },
    [selectNode]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      storeOnConnect(connection);
    },
    [storeOnConnect]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type) return;
      const definition = nodeDefinitions.find((d) => d.type === type);
      if (!definition) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: getNodeId(),
        type,
        position,
        data: { ...definition.defaultData } as { label: string; [key: string]: unknown },
      };
      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        connectionRadius={20}
        selectionOnDrag
        panOnDrag={[1, 2]}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null}
        defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
        connectionLineStyle={{ strokeWidth: 2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-card !border-border"
        />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
