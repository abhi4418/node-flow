import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { cropImage } from "@/trigger/ffmpeg-crop";

export async function POST(request: Request) {
  try {
    const { imageUrl, x, y, width, height } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const handle = await tasks.trigger<typeof cropImage>("crop-image", {
      imageUrl,
      x: x ?? 0,
      y: y ?? 0,
      width: width ?? 100,
      height: height ?? 100,
    });

    return NextResponse.json({
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Error triggering crop task:", error);
    return NextResponse.json({ error: "Failed to trigger crop task" }, { status: 500 });
  }
}
