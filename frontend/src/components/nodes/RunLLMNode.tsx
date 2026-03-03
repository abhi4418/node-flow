import { memo, useCallback, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlowStore } from "@/store/flowStore";
import { Bot, Play, ImageIcon, X } from "lucide-react";

export interface RunLLMNodeData {
  label: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  response: string | null;
  connectedImages: string[];
}

const GEMINI_MODELS = [
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Exp)" },
];

function RunLLMNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as RunLLMNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput);
  const setNodeExecutionStatus = useFlowStore((state) => state.setNodeExecutionStatus);
  const setNodeError = useFlowStore((state) => state.setNodeError);
  const clearNodeError = useFlowStore((state) => state.clearNodeError);
  const getConnectedInputs = useFlowStore((state) => state.getConnectedInputs);
  const status = useFlowStore((state) => state.nodeExecutionStatus[id]) || "idle";

  const [localImages, setLocalImages] = useState<string[]>([]);

  const handleModelChange = useCallback(
    (value: string) => {
      updateNodeData(id, { model: value });
    },
    [id, updateNodeData]
  );

  const handleSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { systemPrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleUserMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { userMessage: e.target.value });
    },
    [id, updateNodeData]
  );

  const collectInputs = useCallback(() => {
    const inputs = getConnectedInputs(id);
    const textInputs: string[] = [];
    const imageInputs: string[] = [];

    for (const input of inputs) {
      if (typeof input.data === "string") {
        // Check if it's an image URL
        if (
          input.data.startsWith("http") ||
          input.data.startsWith("data:image")
        ) {
          imageInputs.push(input.data);
        } else {
          textInputs.push(input.data);
        }
      }
    }

    return { textInputs, imageInputs };
  }, [id, getConnectedInputs]);

  const handleRun = useCallback(async () => {
    setNodeExecutionStatus(id, "running");
    clearNodeError(id);

    try {
      const { textInputs, imageInputs } = collectInputs();
      setLocalImages(imageInputs);

      // Combine connected text inputs with user message
      const combinedMessage = [
        ...textInputs,
        nodeData.userMessage || "",
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!combinedMessage.trim() && imageInputs.length === 0) {
        throw new Error("Please provide a message or connect inputs");
      }

      // Call backend API
      const response = await fetch("http://localhost:3001/api/tasks/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: nodeData.model || "gemini-1.5-flash",
          systemPrompt: nodeData.systemPrompt,
          userMessage: combinedMessage,
          imageUrls: imageInputs,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to trigger LLM task");
      }

      const { taskId } = await response.json();

      // Poll for result
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(
          `http://localhost:3001/api/tasks/${taskId}/status`
        );
        const statusData = await statusResponse.json();

        if (statusData.status === "COMPLETED") {
          const result = statusData.output?.response || statusData.output;
          updateNodeData(id, { response: result });
          setNodeOutput(id, result);
          setNodeExecutionStatus(id, "success");
          return;
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
    collectInputs,
    updateNodeData,
    setNodeOutput,
    setNodeExecutionStatus,
    setNodeError,
    clearNodeError,
  ]);

  const isRunning = status === "running";

  return (
    <BaseNode id={id} title="Run LLM" icon={<Bot className="h-4 w-4" />}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="system-prompt"
        style={{ top: "30%" }}
        isConnectable={true}
        className="!bg-orange-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="user-message"
        style={{ top: "50%" }}
        isConnectable={true}
        className="!bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images"
        style={{ top: "70%" }}
        isConnectable={true}
        className="!bg-green-500"
      />

      <div className="space-y-3">
        {/* Model Selection */}
        <div className="space-y-1">
          <Label>Model</Label>
          <Select
            value={nodeData.model || "gemini-1.5-flash"}
            onValueChange={handleModelChange}
            disabled={isRunning}
          >
            <SelectTrigger className="nodrag">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {GEMINI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Prompt */}
        <div className="space-y-1">
          <Label htmlFor={`system-${id}`}>
            System Prompt
            <span className="ml-1 text-xs text-orange-500">(○ left)</span>
          </Label>
          <Textarea
            id={`system-${id}`}
            placeholder="Optional system instructions..."
            value={nodeData.systemPrompt || ""}
            onChange={handleSystemPromptChange}
            className="min-h-[60px] resize-y nodrag text-xs"
            disabled={isRunning}
          />
        </div>

        {/* User Message */}
        <div className="space-y-1">
          <Label htmlFor={`message-${id}`}>
            User Message
            <span className="ml-1 text-xs text-blue-500">(○ left)</span>
          </Label>
          <Textarea
            id={`message-${id}`}
            placeholder="Enter your prompt..."
            value={nodeData.userMessage || ""}
            onChange={handleUserMessageChange}
            className="min-h-[60px] resize-y nodrag text-xs"
            disabled={isRunning}
          />
        </div>

        {/* Connected Images Preview */}
        {localImages.length > 0 && (
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              Connected Images ({localImages.length})
            </Label>
            <div className="flex flex-wrap gap-1">
              {localImages.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Input ${i + 1}`}
                  className="h-8 w-8 rounded object-cover border"
                />
              ))}
              {localImages.length > 3 && (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs">
                  +{localImages.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Run Button */}
        <Button
          onClick={handleRun}
          disabled={isRunning}
          className="w-full"
          size="sm"
        >
          <Play className="mr-2 h-3 w-3" />
          {isRunning ? "Running..." : "Run"}
        </Button>

        {/* Response */}
        {nodeData.response && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Response</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  updateNodeData(id, { response: null });
                  setNodeOutput(id, null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="max-h-[150px] overflow-auto rounded-md bg-muted p-2 text-xs">
              {nodeData.response}
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="response-output"
        isConnectable={true}
        className="!bg-primary"
      />
    </BaseNode>
  );
}

export const RunLLMNode = memo(RunLLMNodeComponent);
