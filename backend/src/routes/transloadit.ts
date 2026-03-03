import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

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
        exported: {
          robot: "/s3/store",
          use: ":original",
          credentials: "s3_credentials",
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
        exported: {
          robot: "/s3/store",
          use: "filtered",
          credentials: "s3_credentials",
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
        exported: {
          robot: "/s3/store",
          use: "filtered",
          credentials: "s3_credentials",
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

export default router;
