import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/store/flowStore";
import type { NodeExecutionStatus } from "@/store/flowStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface BaseNodeProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function BaseNode({ id, title, icon, children, className }: BaseNodeProps) {
  const status = useFlowStore((state) => state.nodeExecutionStatus[id]) || "idle";
  const error = useFlowStore((state) => state.nodeErrors[id]);

  const statusStyles: Record<NodeExecutionStatus, string> = {
    idle: "",
    running: "node-running",
    success: "node-success",
    error: "node-error border-destructive",
  };

  return (
    <Card className={cn(
      "min-w-[280px] max-w-[320px] shadow-lg transition-all duration-200",
      statusStyles[status],
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span className="flex-1">{title}</span>
          <StatusIndicator status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        {error && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ status }: { status: NodeExecutionStatus }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}
