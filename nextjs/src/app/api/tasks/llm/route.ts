import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { runGeminiLLM } from "@/trigger/llm";

export async function POST(request: Request) {
  try {
    const { model, systemPrompt, userMessage, imageUrls } = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
    }

    const handle = await tasks.trigger<typeof runGeminiLLM>("run-gemini-llm", {
      model: model || "gemini-2.0-flash",
      systemPrompt,
      userMessage,
      imageUrls: imageUrls || [],
    });

    return NextResponse.json({
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Error triggering LLM task:", error);
    return NextResponse.json({ error: "Failed to trigger LLM task" }, { status: 500 });
  }
}
