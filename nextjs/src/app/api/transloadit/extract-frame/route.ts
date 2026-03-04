import { NextResponse } from "next/server";
import { Transloadit } from "transloadit";

function getTransloaditClient() {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

  if (!authKey || !authSecret) {
    throw new Error("Transloadit credentials not configured");
  }

  return new Transloadit({ authKey, authSecret });
}

export async function POST(request: Request) {
  try {
    const { videoUrl, timestamp } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    const client = getTransloaditClient();

    const seconds = timestamp || 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const offsetTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;

    const result = await client.createAssembly({
      params: {
        steps: {
          import: { robot: "/http/import", url: videoUrl },
          extract: {
            robot: "/video/thumbs",
            use: "import",
            count: 1,
            offsets: [offsetTime],
            result: true,
          },
        },
      },
      waitForCompletion: true,
    });

    if (result.ok !== "ASSEMBLY_COMPLETED") {
      throw new Error(result.error || "Assembly failed");
    }

    const extractedFrame = result.results?.extract?.[0];
    if (!extractedFrame) {
      throw new Error("No extracted frame in result");
    }

    return NextResponse.json({ url: extractedFrame.ssl_url || extractedFrame.url });
  } catch (error) {
    console.error("Error extracting frame:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract frame" },
      { status: 500 }
    );
  }
}
