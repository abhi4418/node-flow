import { useUser, useAuth, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Plus, Trash2, Edit, Play } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export function WorkflowList() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch("http://localhost:3001/api/workflows", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workflows");
      const data = await response.json();
      setWorkflows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:3001/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `Workflow ${workflows.length + 1}`,
          description: "",
          nodes: [],
          edges: [],
        }),
      });
      if (!response.ok) throw new Error("Failed to create workflow");
      const workflow = await response.json();
      navigate(`/workflow/${workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      const token = await getToken();
      const response = await fetch(`http://localhost:3001/api/workflows/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete workflow");
      setWorkflows(workflows.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Workflows</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.firstName || user?.username || "User"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={createWorkflow}>
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
            <UserButton afterSignOutUrl="/auth" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            {error}
            <Button variant="outline" className="ml-4" onClick={fetchWorkflows}>
              Retry
            </Button>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              No workflows yet
            </h2>
            <p className="mt-2 text-muted-foreground">
              Create your first workflow to get started
            </p>
            <Button className="mt-4" onClick={createWorkflow}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {workflow.name}
                    </h3>
                    {workflow.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/workflow/${workflow.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
