import { memo, useCallback, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFlowStore } from "@/store/flowStore";
import { Video, Upload, X } from "lucide-react";
import Uppy from "@uppy/core";
import Transloadit from "@uppy/transloadit";

export interface UploadVideoNodeData {
  label: string;
  videoUrl: string | null;
  fileName: string | null;
}

const ACCEPTED_VIDEO_TYPES = [".mp4", ".mov", ".webm", ".m4v"];

function UploadVideoNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as UploadVideoNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const setNodeOutput = useFlowStore((state) => state.setNodeOutput);
  const setNodeExecutionStatus = useFlowStore((state) => state.setNodeExecutionStatus);
  const setNodeError = useFlowStore((state) => state.setNodeError);
  const clearNodeError = useFlowStore((state) => state.clearNodeError);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uppy, setUppy] = useState<Uppy | null>(null);

  useEffect(() => {
    const uppyInstance = new Uppy({
      id: `uppy-video-${id}`,
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ACCEPTED_VIDEO_TYPES,
        maxFileSize: 100 * 1024 * 1024, // 100MB
      },
    });

    // Setup Transloadit
    uppyInstance.use(Transloadit, {
      assemblyOptions: async () => {
        try {
          const response = await fetch("http://localhost:3001/api/transloadit/signature/video");
          const data = await response.json();
          return {
            params: data.params,
            signature: data.signature,
          };
        } catch (error) {
          console.error("Failed to get Transloadit signature:", error);
          throw error;
        }
      },
    });

    uppyInstance.on("upload", () => {
      setIsUploading(true);
      setNodeExecutionStatus(id, "running");
      clearNodeError(id);
    });

    uppyInstance.on("complete", (result) => {
      setIsUploading(false);
      
      if (result.successful && result.successful.length > 0) {
        const file = result.successful[0];
        // Get URL from Transloadit results
        const transloaditResult = file.response?.body?.results as Record<string, unknown[]> | undefined;
        const exportedFiles = (transloaditResult?.exported || transloaditResult?.[":original"]) as Array<{ ssl_url?: string }> | undefined;
        const uploadedUrl = exportedFiles?.[0]?.ssl_url || file.uploadURL;
        
        if (uploadedUrl) {
          updateNodeData(id, { 
            videoUrl: uploadedUrl,
            fileName: file.name,
          });
          setNodeOutput(id, uploadedUrl);
          setNodeExecutionStatus(id, "success");
        } else {
          setNodeError(id, "Failed to get upload URL");
          setNodeExecutionStatus(id, "error");
        }
      }
    });

    uppyInstance.on("error", (error) => {
      setIsUploading(false);
      setNodeError(id, error.message || "Upload failed");
      setNodeExecutionStatus(id, "error");
    });

    setUppy(uppyInstance);

    return () => {
      uppyInstance.cancelAll();
    };
  }, [id, updateNodeData, setNodeOutput, setNodeExecutionStatus, setNodeError, clearNodeError]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && uppy) {
        const file = files[0];
        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });
      }
      e.target.value = "";
    },
    [uppy]
  );

  const handleRemoveVideo = useCallback(() => {
    updateNodeData(id, { videoUrl: null, fileName: null });
    setNodeOutput(id, null);
    setNodeExecutionStatus(id, "idle");
    if (uppy) {
      uppy.cancelAll();
    }
  }, [id, updateNodeData, setNodeOutput, setNodeExecutionStatus, uppy]);

  return (
    <>
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        isConnectable={true}
      />
      <BaseNode
        id={id}
        title="Upload Video"
        icon={<Video className="h-4 w-4" />}
      >
        <div className="space-y-3">
        {nodeData.videoUrl ? (
          <div className="relative">
            <video
              src={nodeData.videoUrl}
              controls
              className="w-full rounded-md border max-h-[150px]"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={handleRemoveVideo}
            >
              <X className="h-3 w-3" />
            </Button>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {nodeData.fileName}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`video-upload-${id}`}>Upload Video</Label>
            <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border p-4 hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground mb-2">
                MP4, MOV, WebM, M4V (max 100MB)
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={isUploading}
                asChild
              >
                <label className="cursor-pointer">
                  {isUploading ? "Uploading..." : "Choose File"}
                  <input
                    id={`video-upload-${id}`}
                    type="file"
                    accept={ACCEPTED_VIDEO_TYPES.join(",")}
                    onChange={handleFileSelect}
                    className="nodrag hidden"
                    disabled={isUploading}
                  />
                </label>
              </Button>
            </div>
          </div>
        )}
      </div>
      </BaseNode>
    </>
  );
}

export const UploadVideoNode = memo(UploadVideoNodeComponent);
