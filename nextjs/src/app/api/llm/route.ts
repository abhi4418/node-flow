import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { model, systemPrompt, userMessage, imageUrls } = await request.json();

    if (!userMessage && (!imageUrls || imageUrls.length === 0)) {
      return NextResponse.json(
        { error: "userMessage or imageUrls is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not configured" }, { status: 500 });
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

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          parts.push({ inlineData: { mimeType, data: base64 } });
        } catch (err) {
          console.error("Failed to fetch image:", url, err);
        }
      }
    }

    if (userMessage) {
      parts.push({ text: userMessage });
    }

    const result = await geminiModel.generateContent(parts);
    const responseText = result.response.text();

    return NextResponse.json({
      response: responseText,
      model: model || "gemini-2.0-flash",
    });
  } catch (error) {
    console.error("LLM error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run LLM" },
      { status: 500 }
    );
  }
}
