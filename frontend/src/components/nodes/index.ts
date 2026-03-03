import { TextNode } from "./TextNode";
import { UploadImageNode } from "./UploadImageNode";
import { UploadVideoNode } from "./UploadVideoNode";
import { RunLLMNode } from "./RunLLMNode";
import { CropImageNode } from "./CropImageNode";
import { ExtractFrameNode } from "./ExtractFrameNode";

export const nodeTypes = {
  textNode: TextNode,
  uploadImageNode: UploadImageNode,
  uploadVideoNode: UploadVideoNode,
  runLLMNode: RunLLMNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
};

export type NodeType = keyof typeof nodeTypes;

export interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  defaultData: Record<string, unknown>;
}

export const nodeDefinitions: NodeDefinition[] = [
  {
    type: "textNode",
    label: "Text Node",
    description: "Simple text input with textarea",
    defaultData: { label: "Text", text: "" },
  },
  {
    type: "uploadImageNode",
    label: "Upload Image",
    description: "Upload images (jpg, png, webp, gif)",
    defaultData: { label: "Upload Image", imageUrl: null, fileName: null },
  },
  {
    type: "uploadVideoNode",
    label: "Upload Video",
    description: "Upload videos (mp4, mov, webm, m4v)",
    defaultData: { label: "Upload Video", videoUrl: null, fileName: null },
  },
  {
    type: "runLLMNode",
    label: "Run LLM",
    description: "Execute Gemini AI with prompts and images",
    defaultData: {
      label: "Run LLM",
      model: "gemini-1.5-flash",
      systemPrompt: "",
      userMessage: "",
      response: null,
      connectedImages: [],
    },
  },
  {
    type: "cropImageNode",
    label: "Crop Image",
    description: "Crop images with configurable parameters",
    defaultData: {
      label: "Crop Image",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      resultUrl: null,
    },
  },
  {
    type: "extractFrameNode",
    label: "Extract Frame",
    description: "Extract a frame from video at timestamp",
    defaultData: {
      label: "Extract Frame",
      timestamp: 0,
      isPercentage: false,
      frameUrl: null,
    },
  },
];

export {
  TextNode,
  UploadImageNode,
  UploadVideoNode,
  RunLLMNode,
  CropImageNode,
  ExtractFrameNode,
};
