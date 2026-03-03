import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Supported Gemini models
export const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash-exp",
  "gemini-exp-1206",
] as const;

export type GeminiModel = typeof GEMINI_MODELS[number];

interface LLMInput {
  model: GeminiModel;
  systemPrompt?: string;
  userMessage: string;
  imageUrls: string[];
}

interface LLMOutput {
  response: string;
  model: string;
  tokensUsed?: number;
}

export const runGeminiLLM = task({
  id: "run-gemini-llm",
  maxDuration: 300, // 5 minutes max
  run: async (payload: LLMInput): Promise<LLMOutput> => {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({
      model: payload.model,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      systemInstruction: payload.systemPrompt,
    });

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    
    // Add text message
    parts.push({ text: payload.userMessage });

    // Add images if provided
    if (payload.imageUrls && payload.imageUrls.length > 0) {
      for (const imageUrl of payload.imageUrls) {
        try {
          // Fetch image and convert to base64
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch image: ${imageUrl}`);
            continue;
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          
          parts.push({
            inlineData: {
              mimeType,
              data: base64,
            },
          });
        } catch (error) {
          console.warn(`Error processing image ${imageUrl}:`, error);
        }
      }
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    return {
      response: text,
      model: payload.model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  },
});
