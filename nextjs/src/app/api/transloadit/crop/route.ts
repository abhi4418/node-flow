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
    const { imageUrl, x, y, width, height } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const client = getTransloaditClient();

    const result = await client.createAssembly({
      params: {
        steps: {
          import: { robot: "/http/import", url: imageUrl },
          crop: {
            robot: "/image/resize",
            use: "import",
            crop: {
              x1: x || 0,
              y1: y || 0,
              x2: (x || 0) + (width || 100),
              y2: (y || 0) + (height || 100),
            },
            result: true,
          },
        },
      },
      waitForCompletion: true,
    });

    if (result.ok !== "ASSEMBLY_COMPLETED") {
      throw new Error(result.error || "Assembly failed");
    }

    const croppedFile = result.results?.crop?.[0];
    if (!croppedFile) {
      throw new Error("No cropped file in result");
    }

    return NextResponse.json({ url: croppedFile.ssl_url || croppedFile.url });
  } catch (error) {
    console.error("Error cropping image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to crop image" },
      { status: 500 }
    );
  }
}
