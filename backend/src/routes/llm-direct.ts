import { Router, Request, Response } from "express";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const router = Router();

// Direct LLM call without Trigger.dev
router.post("/", async (req: Request, res: Response) => {
  try {
    const { model, systemPrompt, userMessage, imageUrls } = req.body;

    if (!userMessage && (!imageUrls || imageUrls.length === 0)) {
      res.status(400).json({ error: "userMessage or imageUrls is required" });
      return;
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GOOGLE_GEMINI_API_KEY not configured" });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const geminiModel = genAI.getGenerativeModel({
      model: model || "gemini-2.0-flash",
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
      systemInstruction: systemPrompt || undefined,
    });

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add images if provided
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          
          parts.push({
            inlineData: {
              mimeType,
              data: base64,
            },
          });
        } catch (err) {
          console.error("Failed to fetch image:", url, err);
        }
      }
    }

    // Add text message
    if (userMessage) {
      parts.push({ text: userMessage });
    }

    const result = await geminiModel.generateContent(parts);
    const responseText = result.response.text();

    res.json({
      response: responseText,
      model: model || "gemini-2.0-flash",
    });
  } catch (error) {
    console.error("LLM error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to run LLM" 
    });
  }
});

export default router;
