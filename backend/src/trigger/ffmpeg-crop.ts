import { task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const execAsync = promisify(exec);

interface CropInput {
  imageUrl: string;
  x: number;      // X offset as percentage (0-100)
  y: number;      // Y offset as percentage (0-100)
  width: number;  // Width as percentage (0-100)
  height: number; // Height as percentage (0-100)
}

interface CropOutput {
  resultUrl: string;
  originalDimensions: { width: number; height: number };
  croppedDimensions: { width: number; height: number };
}

export const cropImage = task({
  id: "crop-image",
  maxDuration: 120, // 2 minutes max
  run: async (payload: CropInput): Promise<CropOutput> => {
    const { imageUrl, x, y, width, height } = payload;

    // Create temp directory for processing
    const tempDir = path.join(os.tmpdir(), `crop-${crypto.randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, "input");
    const outputPath = path.join(tempDir, "output.png");

    try {
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

      // Get image dimensions using ffprobe
      const { stdout: probeOutput } = await execAsync(
        `ffprobe -v quiet -print_format json -show_streams "${inputPath}"`
      );
      
      const probeData = JSON.parse(probeOutput);
      const videoStream = probeData.streams.find((s: { codec_type: string }) => s.codec_type === "video");
      
      if (!videoStream) {
        throw new Error("Could not determine image dimensions");
      }

      const originalWidth = videoStream.width;
      const originalHeight = videoStream.height;

      // Calculate pixel values from percentages
      const cropX = Math.round((x / 100) * originalWidth);
      const cropY = Math.round((y / 100) * originalHeight);
      const cropWidth = Math.round((width / 100) * originalWidth);
      const cropHeight = Math.round((height / 100) * originalHeight);

      // Validate crop dimensions
      if (cropX + cropWidth > originalWidth || cropY + cropHeight > originalHeight) {
        throw new Error("Crop dimensions exceed image bounds");
      }

      if (cropWidth <= 0 || cropHeight <= 0) {
        throw new Error("Crop dimensions must be positive");
      }

      // Execute FFmpeg crop
      await execAsync(
        `ffmpeg -i "${inputPath}" -vf "crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}" -y "${outputPath}"`
      );

      // Read the output file and convert to base64 data URL
      const outputBuffer = await fs.readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;

      return {
        resultUrl: dataUrl,
        originalDimensions: { width: originalWidth, height: originalHeight },
        croppedDimensions: { width: cropWidth, height: cropHeight },
      };
    } finally {
      // Cleanup temp files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  },
});
