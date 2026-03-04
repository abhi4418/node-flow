import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { extractVideoFrame } from "@/trigger/ffmpeg-frame";

export async function POST(request: Request) {
  try {
    const { videoUrl, timestamp, isPercentage } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    const handle = await tasks.trigger<typeof extractVideoFrame>("extract-video-frame", {
      videoUrl,
      timestamp: timestamp ?? 0,
      isPercentage: isPercentage ?? false,
    });

    return NextResponse.json({
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Error triggering extract frame task:", error);
    return NextResponse.json({ error: "Failed to trigger extract frame task" }, { status: 500 });
  }
}
