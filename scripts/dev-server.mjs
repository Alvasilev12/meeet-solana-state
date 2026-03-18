import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const rootDir = process.cwd();
const outDir = path.join(rootDir, ".dev-build");

const getArgValue = (name, fallback) => {
  const idx = process.argv.findIndex((arg) => arg === name);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
};

const port = Number(getArgValue("--port", "8080"));
await fs.mkdir(outDir, { recursive: true });

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const sendFile = async (filePath, res) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  const content = await fs.readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MEEET State</title>
    <link rel="stylesheet" href="/main.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`;

// Collect VITE_ env vars for --define flags
const envDefines = [];
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("VITE_")) {
    envDefines.push("--define", `import.meta.env.${key}="${value}"`);
  }
}
envDefines.push("--define", `import.meta.env.DEV=true`);
envDefines.push("--define", `import.meta.env.PROD=false`);
envDefines.push("--define", `import.meta.env.MODE="development"`);
envDefines.push("--define", `import.meta.env.SSR=false`);
envDefines.push("--define", `import.meta.env.BASE_URL="/"`);

const buildProcess = spawn(
  "bun",
  [
    "build",
    "src/main.tsx",
    "--outdir",
    outDir,
    "--target",
    "browser",
    "--format",
    "esm",
    "--splitting",
    "--sourcemap",
    "--public-path",
    "/",
    ...envDefines,
    "--watch",
  ],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  }
);

buildProcess.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Bundler exited with code ${code}`);
  }
});

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || (!pathname.includes(".") && !pathname.startsWith("/assets/"))) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    const devAssetPath = path.join(outDir, pathname.replace(/^\//, ""));
    if (existsSync(devAssetPath)) {
      await sendFile(devAssetPath, res);
      return;
    }

    const publicAssetPath = path.join(rootDir, "public", pathname.replace(/^\//, ""));
    if (existsSync(publicAssetPath)) {
      await sendFile(publicAssetPath, res);
      return;
    }

    if (pathname === "/main.css" || pathname === "/main.js") {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Building app, retry in a moment...");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : "Internal server error");
  }
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});

const shutdown = async () => {
  buildProcess.kill("SIGTERM");
  server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
