"use client";

import { useCallback } from "react";
import { nodeDefinitions, type NodeType } from "./nodes";
import { useFlowStore } from "@/store/flowStore";
import { Button } from "@/components/ui/button";
import { Type, ImageIcon, Video, Bot, Crop, Film } from "lucide-react";

const nodeIcons: Record<NodeType, React.ReactNode> = {
  textNode: <Type className="h-4 w-4 shrink-0" />,
  uploadImageNode: <ImageIcon className="h-4 w-4 shrink-0" />,
  uploadVideoNode: <Video className="h-4 w-4 shrink-0" />,
  runLLMNode: <Bot className="h-4 w-4 shrink-0" />,
  cropImageNode: <Crop className="h-4 w-4 shrink-0" />,
  extractFrameNode: <Film className="h-4 w-4 shrink-0" />,
};

let nodeId = 0;
const getNodeId = () => `node_${++nodeId}`;

export function Sidebar() {
  const addNode = useFlowStore((state) => state.addNode);

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: NodeType) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleAddNode = useCallback(
    (nodeType: NodeType) => {
      const definition = nodeDefinitions.find((d) => d.type === nodeType);
      if (!definition) return;

      const newNode = {
        id: getNodeId(),
        type: nodeType,
        position: {
          x: Math.random() * 300 + 100,
          y: Math.random() * 300 + 100,
        },
        data: {
          ...definition.defaultData,
        } as { label: string; [key: string]: unknown },
      };

      addNode(newNode);
    },
    [addNode]
  );

  return (
    <aside className="w-64 border-r bg-card p-4 flex flex-col h-screen">
      <h2 className="text-lg font-semibold mb-4">Node Editor</h2>

      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Access
        </h3>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {nodeDefinitions.map((definition) => (
          <div
            key={definition.type}
            draggable
            onDragStart={(e) => onDragStart(e, definition.type)}
            className="cursor-grab active:cursor-grabbing"
          >
            <Button
              variant="outline"
              className="w-full h-auto p-3 flex items-start gap-3 rounded-xl text-left"
              onClick={() => handleAddNode(definition.type)}
            >
              {/* Icon */}
              {nodeIcons[definition.type]}

              {/* Text container */}
              <div className="flex flex-col flex-1 min-w-0">

                <span className="font-medium text-sm">
                  {definition.label}
                </span>

                <span className="text-xs text-muted-foreground break-words whitespace-normal">
                  {definition.description}
                </span>

              </div>
            </Button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t mt-4">
        <p className="text-xs text-muted-foreground">
          Drag nodes onto the canvas or click to add.
        </p>
      </div>
    </aside>
  );
}