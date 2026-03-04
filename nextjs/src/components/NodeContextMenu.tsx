"use client";

import { useFlowStore } from "@/store/flowStore";
import { executeWorkflow } from "@/lib/execution";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash2, Play, Copy } from "lucide-react";
import type { ReactNode } from "react";

interface NodeContextMenuProps {
  nodeId: string;
  children: ReactNode;
}

export function NodeContextMenu({ nodeId, children }: NodeContextMenuProps) {
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const selectNode = useFlowStore((state) => state.selectNode);
  const nodes = useFlowStore((state) => state.nodes);
  const addNode = useFlowStore((state) => state.addNode);

  const handleDelete = () => deleteNode(nodeId);

  const handleExecute = () => executeWorkflow("single", [nodeId]);

  const handleDuplicate = () => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const newNode = {
      ...node,
      id: `node_${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...node.data },
    };
    addNode(newNode);
    selectNode(newNode.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleExecute}>
          <Play className="mr-2 h-4 w-4" />
          Execute Node
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
