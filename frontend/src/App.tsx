import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { FlowCanvas } from "./components/FlowCanvas";
import { AuthPage } from "./components/AuthPage";
import { WorkflowList } from "./components/WorkflowList";
import { Header } from "./components/Header";
import { useFlowStore } from "./store/flowStore";

// Check if Clerk is configured
const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!clerkEnabled) {
    // If Clerk is not configured, allow access without auth
    return <>{children}</>;
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/auth" replace />
      </SignedOut>
    </>
  );
}

function WorkflowEditor() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const setWorkflow = useFlowStore((state) => state.setWorkflow);
  const clearWorkflow = useFlowStore((state) => state.clearWorkflow);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    } else {
      clearWorkflow();
    }
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`http://localhost:3001/api/workflows/${workflowId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load workflow");
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

function App() {
  return (
    <Routes>
      {/* Auth route */}
      <Route
        path="/auth"
        element={
          clerkEnabled ? (
            <>
              <SignedIn>
                <Navigate to="/" replace />
              </SignedIn>
              <SignedOut>
                <AuthPage />
              </SignedOut>
            </>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <WorkflowList />
          </ProtectedLayout>
        }
      />
      <Route
        path="/workflow/:id?"
        element={
          <ProtectedLayout>
            <WorkflowEditor />
          </ProtectedLayout>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
