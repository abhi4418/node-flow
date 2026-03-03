import { task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const execAsync = promisify(exec);

interface ExtractFrameInput {
  videoUrl: string;
  timestamp: number;     // Seconds or percentage value
  isPercentage: boolean; // If true, timestamp is a percentage (0-100)
}

interface ExtractFrameOutput {
  frameUrl: string;
  extractedAt: number; // Actual timestamp in seconds
  videoDuration: number;
  frameDimensions: { width: number; height: number };
}

export const extractVideoFrame = task({
  id: "extract-video-frame",
  maxDuration: 180, // 3 minutes max
  run: async (payload: ExtractFrameInput): Promise<ExtractFrameOutput> => {
    const { videoUrl, timestamp, isPercentage } = payload;

    // Create temp directory for processing
    const tempDir = path.join(os.tmpdir(), `frame-${crypto.randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, "input.mp4");
    const outputPath = path.join(tempDir, "frame.png");

    try {
      // Download the video
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

      // Get video duration and dimensions using ffprobe
      const { stdout: probeOutput } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`
      );
      
      const probeData = JSON.parse(probeOutput);
      const videoStream = probeData.streams.find((s: { codec_type: string }) => s.codec_type === "video");
      
      if (!videoStream) {
        throw new Error("Could not find video stream");
      }

      const duration = parseFloat(probeData.format.duration);
      const frameWidth = videoStream.width;
      const frameHeight = videoStream.height;

      if (!duration || isNaN(duration)) {
        throw new Error("Could not determine video duration");
      }

      // Calculate actual timestamp
      let actualTimestamp: number;
      if (isPercentage) {
        actualTimestamp = (timestamp / 100) * duration;
      } else {
        actualTimestamp = timestamp;
      }

      // Clamp timestamp to valid range
      actualTimestamp = Math.max(0, Math.min(actualTimestamp, duration - 0.001));

      // Extract frame using FFmpeg
      // -ss before -i for fast seeking
      await execAsync(
        `ffmpeg -ss ${actualTimestamp} -i "${inputPath}" -vframes 1 -q:v 2 -y "${outputPath}"`
      );

      // Read the output file and convert to base64 data URL
      const outputBuffer = await fs.readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;

      return {
        frameUrl: dataUrl,
        extractedAt: actualTimestamp,
        videoDuration: duration,
        frameDimensions: { width: frameWidth, height: frameHeight },
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
