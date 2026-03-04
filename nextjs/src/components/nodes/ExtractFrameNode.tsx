"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlowStore } from "@/store/flowStore";
import { Film, Play, X } from "lucide-react";

export interface ExtractFrameNodeData {
  label: string;
  timestamp: number;
  isPercentage: boolean;
  frameUrl: string | null;
}

function ExtractFrameNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as ExtractFrameNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput);
  const setNodeExecutionStatus = useFlowStore((state) => state.setNodeExecutionStatus);
  const setNodeError = useFlowStore((state) => state.setNodeError);
  const clearNodeError = useFlowStore((state) => state.clearNodeError);
  const getConnectedInputs = useFlowStore((state) => state.getConnectedInputs);
  const nodeOutputs = useFlowStore((state) => state.nodeOutputs);
  const edges = useFlowStore((state) => state.edges);
  const status = useFlowStore((state) => state.nodeExecutionStatus[id]) || "idle";

  const [inputVideoUrl, setInputVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const inputs = getConnectedInputs(id);
    const videoInput = inputs.find(
      (input) =>
        typeof input.data === "string" &&
        input.data.startsWith("http") &&
        !input.data.startsWith("data:image")
    );
    setInputVideoUrl(videoInput?.data as string | null);
  }, [id, getConnectedInputs, nodeOutputs, edges]);

  const handleTimestampChange = useCallback(
    (value: string) => {
      const numValue = parseFloat(value) || 0;
      updateNodeData(id, { timestamp: numValue });
    },
    [id, updateNodeData]
  );

  const handleModeChange = useCallback(
    (value: string) => {
      updateNodeData(id, { isPercentage: value === "percentage" });
    },
    [id, updateNodeData]
  );

  const handleExtract = useCallback(async () => {
    const inputs = getConnectedInputs(id);
    const videoInput = inputs.find(
      (input) =>
        typeof input.data === "string" && input.data.startsWith("http")
    );

    if (!videoInput?.data) {
      setNodeError(id, "No video connected. Connect a video node.");
      setNodeExecutionStatus(id, "error");
      return;
    }

    setNodeExecutionStatus(id, "running");
    clearNodeError(id);

    try {
      const response = await fetch("/api/tasks/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoInput.data,
          timestamp: nodeData.timestamp ?? 0,
          isPercentage: nodeData.isPercentage ?? false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to trigger extract task");
      }

      const { taskId } = await response.json();

      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch(`/api/tasks/${taskId}/status`);
        const statusData = await statusResponse.json();

        if (statusData.status === "COMPLETED") {
          const frameUrl = statusData.output?.frameUrl;
          if (frameUrl) {
            updateNodeData(id, { frameUrl });
            setNodeOutput(id, frameUrl);
            setNodeExecutionStatus(id, "success");
            return;
          }
          throw new Error("No frame URL in response");
        }

        if (statusData.status === "FAILED" || statusData.status === "CANCELED") {
          throw new Error(statusData.error?.message || "Task failed");
        }

        attempts++;
      }

      throw new Error("Task timed out");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setNodeError(id, message);
      setNodeExecutionStatus(id, "error");
    }
  }, [
    id,
    nodeData,
    getConnectedInputs,
    updateNodeData,
    setNodeOutput,
    setNodeExecutionStatus,
    setNodeError,
    clearNodeError,
  ]);

  const handleClearResult = useCallback(() => {
    updateNodeData(id, { frameUrl: null });
    setNodeOutput(id, null);
  }, [id, updateNodeData, setNodeOutput]);

  const isRunning = status === "running";

  return (
    <>
      <Handle type="target" position={Position.Left} id="video-input" isConnectable={true} />
      <Handle type="source" position={Position.Right} id="frame-output" isConnectable={true} />
      <BaseNode id={id} title="Extract Frame" icon={<Film className="h-4 w-4" />}>
        <div className="space-y-3">
          {inputVideoUrl && (
            <div className="space-y-1">
              <Label className="text-xs">Input Video</Label>
              <video
                src={inputVideoUrl}
                className="w-full rounded-md border max-h-[80px]"
                muted
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Timestamp Mode</Label>
            <Select
              value={nodeData.isPercentage ? "percentage" : "seconds"}
              onValueChange={handleModeChange}
              disabled={isRunning}
            >
              <SelectTrigger className="nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="percentage">Percentage (0-100)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`timestamp-${id}`}>
              {nodeData.isPercentage ? "Position (%)" : "Time (seconds)"}
            </Label>
            <Input
              id={`timestamp-${id}`}
              type="number"
              min="0"
              max={nodeData.isPercentage ? 100 : undefined}
              step={nodeData.isPercentage ? 1 : 0.1}
              value={nodeData.timestamp ?? 0}
              onChange={(e) => handleTimestampChange(e.target.value)}
              className="nodrag"
              disabled={isRunning}
            />
          </div>

          <Button
            onClick={handleExtract}
            disabled={isRunning || !inputVideoUrl}
            className="w-full"
            size="sm"
          >
            <Play className="mr-2 h-3 w-3" />
            {isRunning ? "Extracting..." : "Extract Frame"}
          </Button>

          {nodeData.frameUrl && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Extracted Frame</Label>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleClearResult}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <img
                src={nodeData.frameUrl}
                alt="Extracted frame"
                className="w-full rounded-md border object-cover max-h-[100px]"
              />
            </div>
          )}
        </div>
      </BaseNode>
    </>
  );
}

export const ExtractFrameNode = memo(ExtractFrameNodeComponent);
