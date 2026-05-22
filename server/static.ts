import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.get("/sw.js", (_req, res) => {
    res
      .type("application/javascript")
      .set({
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Service-Worker-Allowed": "/",
      })
      .sendFile(path.resolve(distPath, "sw.js"));
  });

  app.get("/manifest.json", (_req, res) => {
    res
      .type("application/json")
      .set({
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      })
      .sendFile(path.resolve(distPath, "manifest.json"));
  });

  app.get("/service-worker.js", (_req, res) => {
    res
      .status(404)
      .type("text/plain")
      .set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate")
      .send("Service worker is served at /sw.js");
  });

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
        return;
      }

      if (filePath.endsWith("sw.js") || filePath.endsWith("manifest.json")) {
        res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
        return;
      }

      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));

  app.use("/assets", (_req, res) => {
    res
      .status(404)
      .type("text/plain")
      .set("Cache-Control", "no-store")
      .send("Asset not found");
  });

  // Fall through to index.html if the file doesn't exist.
  app.use("*", (_req, res) => {
    res
      .set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate")
      .sendFile(path.resolve(distPath, "index.html"));
  });
}
