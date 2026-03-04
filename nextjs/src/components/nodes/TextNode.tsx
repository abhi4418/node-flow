"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useFlowStore } from "@/store/flowStore";
import { Type } from "lucide-react";

export interface TextNodeData {
  label: string;
  text: string;
}

function TextNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as TextNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      updateNodeData(id, { text: newText });
      setNodeOutput(id, newText);
    },
    [id, updateNodeData, setNodeOutput]
  );

  return (
    <>
      <Handle
        type="source"
        position={Position.Right}
        id="text-output"
        isConnectable={true}
      />
      <BaseNode id={id} title="Text" icon={<Type className="h-4 w-4" />}>
        <div className="space-y-2">
          <Label htmlFor={`text-${id}`}>Text Content</Label>
          <Textarea
            id={`text-${id}`}
            placeholder="Enter your text here..."
            value={nodeData.text || ""}
            onChange={handleTextChange}
            className="min-h-[100px] resize-y nodrag"
          />
        </div>
      </BaseNode>
    </>
  );
}

export const TextNode = memo(TextNodeComponent);
