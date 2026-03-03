import { Router, Request, Response } from "express";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { runGeminiLLM } from "../trigger/llm.js";
import type { cropImage } from "../trigger/ffmpeg-crop.js";
import type { extractVideoFrame } from "../trigger/ffmpeg-frame.js";

const router = Router();

// Trigger LLM task
router.post("/llm", async (req: Request, res: Response) => {
  try {
    const { model, systemPrompt, userMessage, imageUrls } = req.body;

    if (!userMessage) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    const handle = await tasks.trigger<typeof runGeminiLLM>("run-gemini-llm", {
      model: model || "gemini-2.0-flash",
      systemPrompt,
      userMessage,
      imageUrls: imageUrls || [],
    });

    res.json({ 
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Error triggering LLM task:", error);
    res.status(500).json({ error: "Failed to trigger LLM task" });
  }
});

// Trigger crop image task
router.post("/crop", async (req: Request, res: Response) => {
  try {
    const { imageUrl, x, y, width, height } = req.body;

    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl is required" });
      return;
    }

    const handle = await tasks.trigger<typeof cropImage>("crop-image", {
      imageUrl,
      x: x ?? 0,
      y: y ?? 0,
      width: width ?? 100,
      height: height ?? 100,
    });

    res.json({ 
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Error triggering crop task:", error);
    res.status(500).json({ error: "Failed to trigger crop task" });
  }
});

// Trigger extract frame task
router.post("/extract-frame", async (req: Request, res: Response) => {
  try {
    const { videoUrl, timestamp, isPercentage } = req.body;

    if (!videoUrl) {
      res.status(400).json({ error: "videoUrl is required" });
      return;
    }

    const handle = await tasks.trigger<typeof extractVideoFrame>("extract-video-frame", {
      videoUrl,
      timestamp: timestamp ?? 0,
      isPercentage: isPercentage ?? false,
    });

    res.json({ 
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Error triggering extract frame task:", error);
    res.status(500).json({ error: "Failed to trigger extract frame task" });
  }
});

// Get task status
router.get("/:taskId/status", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const run = await runs.retrieve(taskId);
    
    res.json({
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    });
  } catch (error) {
    console.error("Error retrieving task status:", error);
    res.status(500).json({ error: "Failed to retrieve task status" });
  }
});

export default router;
