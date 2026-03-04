"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Play,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import { canUndo, canRedo, undo, redo, executeWorkflow } from "@/lib/execution";
import { useState, useEffect } from "react";

export function Header() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? undefined;

  const { getToken } = useAuth();
  const {
    workflowName,
    setWorkflowName,
    nodes,
    edges,
    selectedNodes,
    isExecuting,
    setWorkflowId,
  } = useFlowStore();

  const [saving, setSaving] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);

  useEffect(() => {
    const updateUndoRedo = () => {
      setUndoAvailable(canUndo());
      setRedoAvailable(canRedo());
    };
    updateUndoRedo();
    const unsub = useFlowStore.subscribe(updateUndoRedo);
    return unsub;
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/workflows/${id}` : "/api/workflows";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: workflowName, nodes, edges }),
      });

      if (!response.ok) throw new Error("Failed to save workflow");

      const workflow = await response.json();
      if (!id) {
        setWorkflowId(workflow.id);
        router.replace(`/workflow/${workflow.id}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteFull = () => {
    executeWorkflow("full");
  };

  const handleExecuteSelected = () => {
    if (selectedNodes.size === 0) {
      alert("Select at least one node to execute");
      return;
    }
    executeWorkflow("selected", Array.from(selectedNodes));
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1"
          placeholder="Untitled Workflow"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!undoAvailable}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!redoAvailable}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>

        <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleExecuteFull}
            disabled={isExecuting || nodes.length === 0}
            title="Execute entire workflow"
          >
            {isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecuteSelected}
            disabled={isExecuting || selectedNodes.size === 0}
            title="Execute selected nodes"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Run Selected
          </Button>
        </div>

        <div className="border-l border-border pl-4 ml-2">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
