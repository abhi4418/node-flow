import { task } from "@trigger.dev/sdk/v3";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { downloadToFile, getFfmpegBinary, getFfprobeBinary, runCommand } from "./utils";

interface CropInput {
  imageUrl: string;
  x: number; // X offset as percentage (0-100)
  y: number; // Y offset as percentage (0-100)
  width: number; // Width as percentage (0-100)
  height: number; // Height as percentage (0-100)
}

interface CropOutput {
  resultUrl: string;
  originalDimensions: { width: number; height: number };
  croppedDimensions: { width: number; height: number };
}

export const cropImage = task({
  id: "crop-image",
  queue: {
    concurrencyLimit: 2, // ffmpeg work is CPU-heavy in local dev and times out under high fan-out
  },
  // some large/long videos can easily take more than a minute to process,
  // so bump the timeout well past the 60s default.  The global config also
  // sets a high limit, but we explicitly override here to be safe.
  maxDuration: 600, // 10 minutes max
  run: async (payload: CropInput): Promise<CropOutput> => {
    const { imageUrl, x, y, width, height } = payload;

    const tempDir = path.join(os.tmpdir(), `crop-${crypto.randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, "input");
    // JPEG is significantly faster to encode than PNG for crop results
    const outputPath = path.join(tempDir, "output.jpg");

    try {
      await downloadToFile(imageUrl, inputPath);

      // Use ffmpeg's built-in iw/ih expressions so we skip a separate ffprobe
      // pass on the (potentially large) input file entirely.
      if (width <= 0 || height <= 0) {
        throw new Error("Crop dimensions must be positive");
      }

      const wFrac = width / 100;
      const hFrac = height / 100;
      const xFrac = x / 100;
      const yFrac = y / 100;

      // Single ffmpeg call: crop using input-relative expressions + JPEG output
      await runCommand(
        getFfmpegBinary(),
        [
          "-i",
          inputPath,
          "-vf",
          `crop=iw*${wFrac}:ih*${hFrac}:iw*${xFrac}:ih*${yFrac}`,
          "-frames:v",
          "1",
          "-q:v",
          "2",
          "-y",
          outputPath,
        ],
        { timeoutMs: 300_000 }
      );

      // Probe only the small output file (already cropped) for exact pixel dims
      const { stdout: probeOutput } = await runCommand(
        getFfprobeBinary(),
        [
          "-v",
          "quiet",
          "-print_format",
          "json",
          "-show_streams",
          "-select_streams",
          "v:0",
          outputPath,
        ],
        { timeoutMs: 30_000 }
      );

      const croppedStream = JSON.parse(probeOutput).streams[0];
      if (!croppedStream) {
        throw new Error("Could not determine output dimensions");
      }

      const cropWidth = croppedStream.width as number;
      const cropHeight = croppedStream.height as number;
      // Back-compute original dimensions from the known crop fractions
      const originalWidth = Math.round(cropWidth / wFrac);
      const originalHeight = Math.round(cropHeight / hFrac);

      const outputBuffer = await fs.readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      return {
        resultUrl: dataUrl,
        originalDimensions: { width: originalWidth, height: originalHeight },
        croppedDimensions: { width: cropWidth, height: cropHeight },
      };
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  },
});
