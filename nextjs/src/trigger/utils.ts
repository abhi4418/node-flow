import fs from "fs";
import { createWriteStream } from "fs";
import { spawn } from "child_process";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";

const MAX_OUTPUT_CHARS = 8_000;

function appendTail(current: string, chunk: string) {
  const next = current + chunk;
  return next.length > MAX_OUTPUT_CHARS ? next.slice(-MAX_OUTPUT_CHARS) : next;
}

interface RunCommandOptions {
  timeoutMs?: number;
  cwd?: string;
}

interface RunCommandResult {
  stdout: string;
  stderr: string;
}

export function getFfmpegBinary() {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function getFfprobeBinary() {
  return process.env.FFPROBE_PATH || "ffprobe";
}

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<RunCommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let didTimeout = false;

    const timer =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            didTimeout = true;
            child.kill("SIGKILL");
          }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout = appendTail(stdout, chunk.toString());
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr = appendTail(stderr, chunk.toString());
    });

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);

      if (didTimeout) {
        reject(new Error(`${command} timed out after ${options.timeoutMs}ms`));
        return;
      }

      if (code !== 0) {
        const details = stderr || stdout || `exit code ${code}`;
        reject(new Error(`${command} failed: ${details}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

export async function downloadToFile(url: string, destinationPath: string) {
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  // Node.js fetch does not support data: URLs — decode base64 directly
  if (url.startsWith("data:")) {
    const commaIdx = url.indexOf(",");
    if (commaIdx === -1) throw new Error("Invalid data URL");
    const meta = url.slice(5, commaIdx); // e.g. "image/png;base64"
    const isBase64 = meta.endsWith(";base64");
    const content = url.slice(commaIdx + 1);
    const buffer = isBase64
      ? Buffer.from(content, "base64")
      : Buffer.from(decodeURIComponent(content));
    await fs.promises.writeFile(destinationPath, buffer);
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Response body was empty");
  }

  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destinationPath));
}
