import { Router, Request, Response } from "express";
import crypto from "crypto";
import TransloaditModule from "transloadit";

const router = Router();

// Initialize Transloadit client for server-side processing
function getTransloaditClient() {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;
  
  if (!authKey || !authSecret) {
    throw new Error("Transloadit credentials not configured");
  }
  
  const Transloadit = TransloaditModule.default || TransloaditModule;
  return new Transloadit({
    authKey,
    authSecret,
  });
}

// Generate Transloadit signature for client-side uploads
router.get("/signature", (_req: Request, res: Response) => {
  try {
    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

    if (!authKey || !authSecret) {
      res.status(500).json({ error: "Transloadit credentials not configured" });
      return;
    }

    // Expires in 1 hour
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

    const params = {
      auth: {
        key: authKey,
        expires,
      },
      steps: {
        ":original": {
          robot: "/upload/handle",
        },
      },
    };

    const paramsJson = JSON.stringify(params);
    const signature = crypto
      .createHmac("sha384", authSecret)
      .update(paramsJson)
      .digest("hex");

    res.json({
      params: paramsJson,
      signature: `sha384:${signature}`,
    });
  } catch (error) {
    console.error("Error generating Transloadit signature:", error);
    res.status(500).json({ error: "Failed to generate signature" });
  }
});

// Get image upload params (specific accepted types)
router.get("/signature/image", (_req: Request, res: Response) => {
  try {
    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

    if (!authKey || !authSecret) {
      res.status(500).json({ error: "Transloadit credentials not configured" });
      return;
    }

    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

    const params = {
      auth: {
        key: authKey,
        expires,
      },
      steps: {
        ":original": {
          robot: "/upload/handle",
        },
        filtered: {
          robot: "/file/filter",
          use: ":original",
          accepts: [
            ["${file.mime}", "regex", "image/(jpeg|png|webp|gif)"],
          ],
          error_on_decline: true,
          error_msg: "Only jpg, jpeg, png, webp, gif images are allowed",
        },
      },
    };

    const paramsJson = JSON.stringify(params);
    const signature = crypto
      .createHmac("sha384", authSecret)
      .update(paramsJson)
      .digest("hex");

    res.json({
      params: paramsJson,
      signature: `sha384:${signature}`,
    });
  } catch (error) {
    console.error("Error generating Transloadit signature:", error);
    res.status(500).json({ error: "Failed to generate signature" });
  }
});

// Get video upload params (specific accepted types)
router.get("/signature/video", (_req: Request, res: Response) => {
  try {
    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

    if (!authKey || !authSecret) {
      res.status(500).json({ error: "Transloadit credentials not configured" });
      return;
    }

    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

    const params = {
      auth: {
        key: authKey,
        expires,
      },
      steps: {
        ":original": {
          robot: "/upload/handle",
        },
        filtered: {
          robot: "/file/filter",
          use: ":original",
          accepts: [
            ["${file.mime}", "regex", "video/(mp4|quicktime|webm|x-m4v)"],
          ],
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

    res.json({
      params: paramsJson,
      signature: `sha384:${signature}`,
    });
  } catch (error) {
    console.error("Error generating Transloadit signature:", error);
    res.status(500).json({ error: "Failed to generate signature" });
  }
});

// Crop an image using Transloadit
router.post("/crop", async (req: Request, res: Response) => {
  try {
    const { imageUrl, x, y, width, height } = req.body;
    
    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl is required" });
      return;
    }
    
    const client = getTransloaditClient();
    
    const result = await client.createAssembly({
      params: {
        steps: {
          import: {
            robot: "/http/import",
            url: imageUrl,
          },
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
    
    res.json({ url: croppedFile.ssl_url || croppedFile.url });
  } catch (error) {
    console.error("Error cropping image:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to crop image" });
  }
});

// Extract a frame from a video using Transloadit
router.post("/extract-frame", async (req: Request, res: Response) => {
  try {
    const { videoUrl, timestamp } = req.body;
    
    if (!videoUrl) {
      res.status(400).json({ error: "videoUrl is required" });
      return;
    }
    
    const client = getTransloaditClient();
    
    // Convert timestamp seconds to HH:MM:SS.mmm format
    const seconds = timestamp || 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const offsetTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
    
    const result = await client.createAssembly({
      params: {
        steps: {
          import: {
            robot: "/http/import",
            url: videoUrl,
          },
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
    
    res.json({ url: extractedFrame.ssl_url || extractedFrame.url });
  } catch (error) {
    console.error("Error extracting frame:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to extract frame" });
  }
});

export default router;
