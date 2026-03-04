"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { FlowCanvas } from "@/components/FlowCanvas";
import { useFlowStore } from "@/store/flowStore";

export default function WorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const setWorkflow = useFlowStore((state) => state.setWorkflow);
  const clearWorkflow = useFlowStore((state) => state.clearWorkflow);
  const [loading, setLoading] = useState(false);

  // The catch-all param is an array: /workflow → [], /workflow/123 → ["123"]
  const idParam = params?.id;
  const workflowId = Array.isArray(idParam) ? idParam[0] : idParam ?? null;

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      clearWorkflow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`/api/workflows/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        router.push("/");
        return;
      }
      const workflow = await response.json();
      setWorkflow(workflow.id, workflow.name, workflow.nodes || [], workflow.edges || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <FlowCanvas />
      </div>
    </div>
  );
}
