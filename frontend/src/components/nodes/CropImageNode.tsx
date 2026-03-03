import { memo, useCallback, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFlowStore } from "@/store/flowStore";
import { Crop, Play, X } from "lucide-react";

export interface CropImageNodeData {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  resultUrl: string | null;
}

function CropImageNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as CropImageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput);
  const setNodeExecutionStatus = useFlowStore((state) => state.setNodeExecutionStatus);
  const setNodeError = useFlowStore((state) => state.setNodeError);
  const clearNodeError = useFlowStore((state) => state.clearNodeError);
  const getConnectedInputs = useFlowStore((state) => state.getConnectedInputs);
  const status = useFlowStore((state) => state.nodeExecutionStatus[id]) || "idle";

  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);

  // Update input image from connected nodes
  useEffect(() => {
    const inputs = getConnectedInputs(id);
    const imageInput = inputs.find(
      (input) =>
        typeof input.data === "string" &&
        (input.data.startsWith("http") || input.data.startsWith("data:image"))
    );
    setInputImageUrl(imageInput?.data as string | null);
  }, [id, getConnectedInputs]);

  const handleParamChange = useCallback(
    (param: "x" | "y" | "width" | "height", value: string) => {
      const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
      updateNodeData(id, { [param]: numValue });
    },
    [id, updateNodeData]
  );

  const handleCrop = useCallback(async () => {
    const inputs = getConnectedInputs(id);
    const imageInput = inputs.find(
      (input) =>
        typeof input.data === "string" &&
        (input.data.startsWith("http") || input.data.startsWith("data:image"))
    );

    if (!imageInput?.data) {
      setNodeError(id, "No image connected. Connect an image node.");
      setNodeExecutionStatus(id, "error");
      return;
    }

    setNodeExecutionStatus(id, "running");
    clearNodeError(id);

    try {
      const response = await fetch("http://localhost:3001/api/tasks/crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageInput.data,
          x: nodeData.x ?? 0,
          y: nodeData.y ?? 0,
          width: nodeData.width ?? 100,
          height: nodeData.height ?? 100,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to trigger crop task");
      }

      const { taskId } = await response.json();

      // Poll for result
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch(
          `http://localhost:3001/api/tasks/${taskId}/status`
        );
        const statusData = await statusResponse.json();

        if (statusData.status === "COMPLETED") {
          const resultUrl = statusData.output?.resultUrl;
          if (resultUrl) {
            updateNodeData(id, { resultUrl });
            setNodeOutput(id, resultUrl);
            setNodeExecutionStatus(id, "success");
            return;
          }
          throw new Error("No result URL in response");
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
    updateNodeData(id, { resultUrl: null });
    setNodeOutput(id, null);
  }, [id, updateNodeData, setNodeOutput]);

  const isRunning = status === "running";

  return (
    <BaseNode id={id} title="Crop Image" icon={<Crop className="h-4 w-4" />}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="!bg-green-500"
        isConnectable={true}
      />

      <div className="space-y-3">
        {/* Input Preview */}
        {inputImageUrl && (
          <div className="space-y-1">
            <Label className="text-xs">Input Image</Label>
            <img
              src={inputImageUrl}
              alt="Input"
              className="w-full rounded-md border object-cover max-h-[80px]"
            />
          </div>
        )}

        {/* Crop Parameters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`x-${id}`} className="text-xs">
              X Offset (%)
            </Label>
            <Input
              id={`x-${id}`}
              type="number"
              min="0"
              max="100"
              value={nodeData.x ?? 0}
              onChange={(e) => handleParamChange("x", e.target.value)}
              className="nodrag h-8 text-xs"
              disabled={isRunning}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`y-${id}`} className="text-xs">
              Y Offset (%)
            </Label>
            <Input
              id={`y-${id}`}
              type="number"
              min="0"
              max="100"
              value={nodeData.y ?? 0}
              onChange={(e) => handleParamChange("y", e.target.value)}
              className="nodrag h-8 text-xs"
              disabled={isRunning}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`width-${id}`} className="text-xs">
              Width (%)
            </Label>
            <Input
              id={`width-${id}`}
              type="number"
              min="0"
              max="100"
              value={nodeData.width ?? 100}
              onChange={(e) => handleParamChange("width", e.target.value)}
              className="nodrag h-8 text-xs"
              disabled={isRunning}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`height-${id}`} className="text-xs">
              Height (%)
            </Label>
            <Input
              id={`height-${id}`}
              type="number"
              min="0"
              max="100"
              value={nodeData.height ?? 100}
              onChange={(e) => handleParamChange("height", e.target.value)}
              className="nodrag h-8 text-xs"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Crop Button */}
        <Button
          onClick={handleCrop}
          disabled={isRunning || !inputImageUrl}
          className="w-full"
          size="sm"
        >
          <Play className="mr-2 h-3 w-3" />
          {isRunning ? "Processing..." : "Crop"}
        </Button>

        {/* Result Preview */}
        {nodeData.resultUrl && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Result</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleClearResult}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <img
              src={nodeData.resultUrl}
              alt="Cropped"
              className="w-full rounded-md border object-cover max-h-[100px]"
            />
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        className="!bg-primary"
        isConnectable={true}
      />
    </BaseNode>
  );
}

export const CropImageNode = memo(CropImageNodeComponent);
