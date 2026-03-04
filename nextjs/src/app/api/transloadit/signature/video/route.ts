import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

    if (!authKey || !authSecret) {
      return NextResponse.json(
        { error: "Transloadit credentials not configured" },
        { status: 500 }
      );
    }

    const expires = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    const params = {
      auth: { key: authKey, expires },
      steps: {
        ":original": { robot: "/upload/handle" },
        filtered: {
          robot: "/file/filter",
          use: ":original",
          accepts: [["${file.mime}", "regex", "video/(mp4|quicktime|webm|x-m4v)"]],
          error_on_decline: true,
          error_msg: "Only mp4, mov, webm, m4v videos are allowed",
        },
      },
    };

    const paramsJson = JSON.stringify(params);
    const signature = crypto
      .createHmac("sha384", authSecret)
      .update(paramsJson)
      .digest("hex");

    return NextResponse.json({ params: paramsJson, signature: `sha384:${signature}` });
  } catch (error) {
    console.error("Error generating Transloadit signature:", error);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
