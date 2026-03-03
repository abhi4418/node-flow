import { useFlowStore } from "@/store/flowStore";

// Execute a single node based on its type
export async function executeNode(nodeId: string): Promise<void> {
  const store = useFlowStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  // Get inputs from connected nodes
  const inputs = store.getConnectedInputs(nodeId);
  const inputData = inputs.length > 0 ? inputs[0].data : null;

  let output: unknown;

  switch (node.type) {
    case "textNode":
      // Text node just passes through its text value
      output = node.data.text || "";
      break;

    case "uploadImageNode":
      // Upload image nodes already have their output set after upload
      output = node.data.imageUrl || inputData;
      break;

    case "uploadVideoNode":
      // Upload video nodes already have their output set after upload
      output = node.data.videoUrl || inputData;
      break;

    case "runLLMNode":
      output = await executeLLMNode(node.data, inputs);
      break;

    case "cropImageNode":
      output = await executeCropImageNode(node.data, inputData);
      break;

    case "extractFrameNode":
      output = await executeExtractFrameNode(node.data, inputData);
      break;

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }

  store.setNodeOutput(nodeId, output);
}

async function executeLLMNode(
  data: Record<string, unknown>,
  inputs: { sourceId: string; sourceHandle: string | null; data: unknown }[]
): Promise<string> {
  const model = (data.model as string) || "gemini-2.0-flash";
  const systemPrompt = (data.systemPrompt as string) || "";
  const userMessage = (data.userMessage as string) || "";

  // Collect text and image inputs from connected nodes
  const textInputs: string[] = [];
  const imageUrls: string[] = [];

  for (const input of inputs) {
    if (typeof input.data === "string") {
      if (
        input.data.startsWith("http") ||
        input.data.startsWith("data:image")
      ) {
        imageUrls.push(input.data);
      } else {
        textInputs.push(input.data);
      }
    }
  }

  // Combine connected text inputs with user message
  const combinedMessage = [...textInputs, userMessage]
    .filter(Boolean)
    .join("\n\n");

  if (!combinedMessage.trim() && imageUrls.length === 0) {
    throw new Error("Please provide a message or connect inputs");
  }

  const response = await fetch("http://localhost:3001/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      systemPrompt,
      userMessage: combinedMessage,
      imageUrls,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "LLM request failed");
  }

  const result = await response.json();
  return result.response;
}

async function executeCropImageNode(data: Record<string, unknown>, input: unknown): Promise<string> {
  // Input should be image URL from connected node
  const imageUrl = input as string;
  
  if (!imageUrl || typeof imageUrl !== "string" || 
      (!imageUrl.startsWith("http") && !imageUrl.startsWith("data:image"))) {
    throw new Error("No image connected. Connect an image node.");
  }

  const cropParams = {
    x: (data.x as number) ?? 0,
    y: (data.y as number) ?? 0,
    width: (data.width as number) ?? 100,
    height: (data.height as number) ?? 100,
  };

  // Start the crop task
  const response = await fetch("http://localhost:3001/api/tasks/crop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      ...cropParams,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Crop request failed");
  }

  const { taskId } = await response.json();

  // Poll for result
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const statusResponse = await fetch(`http://localhost:3001/api/tasks/${taskId}/status`);
    const statusData = await statusResponse.json();

    if (statusData.status === "COMPLETED") {
      return statusData.output?.resultUrl;
    } else if (statusData.status === "ERROR") {
      throw new Error(statusData.error || "Crop task failed");
    }
    
    attempts++;
  }

  throw new Error("Crop task timed out");
}

async function executeExtractFrameNode(data: Record<string, unknown>, input: unknown): Promise<string> {
  // Input should be video URL from connected node
  const videoUrl = input as string;
  
  if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.startsWith("http")) {
    throw new Error("No video connected. Connect a video node.");
  }

  const timestamp = (data.timestamp as number) || 0;
  const isPercentage = (data.isPercentage as boolean) || false;

  // Start the extract frame task
  const response = await fetch("http://localhost:3001/api/tasks/extract-frame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoUrl,
      time: isPercentage ? undefined : timestamp,
      percent: isPercentage ? timestamp : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Extract frame request failed");
  }

  const { taskId } = await response.json();

  // Poll for result
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const statusResponse = await fetch(`http://localhost:3001/api/tasks/${taskId}/status`);
    const statusData = await statusResponse.json();

    if (statusData.status === "COMPLETED") {
      return statusData.output?.frameUrl;
    } else if (statusData.status === "ERROR") {
      throw new Error(statusData.error || "Extract frame task failed");
    }
    
    attempts++;
  }

  throw new Error("Extract frame task timed out");
}
