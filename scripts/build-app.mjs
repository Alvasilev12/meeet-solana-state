import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const getArgValue = (name, fallback) => {
  const idx = process.argv.findIndex((arg) => arg === name);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
};

const mode = getArgValue("--mode", "production");
const isProd = mode === "production";

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

// Collect VITE_ env vars for --define flags
const envDefines = [];
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("VITE_")) {
    envDefines.push("--define", `import.meta.env.${key}="${value}"`);
  }
}
envDefines.push("--define", `import.meta.env.DEV=false`);
envDefines.push("--define", `import.meta.env.PROD=true`);
envDefines.push("--define", `import.meta.env.MODE="production"`);
envDefines.push("--define", `import.meta.env.SSR=false`);
envDefines.push("--define", `import.meta.env.BASE_URL="/"`);

const buildArgs = [
  "build",
  "src/main.tsx",
  "--outdir",
  "dist",
  "--target",
  "browser",
  "--format",
  "esm",
  "--splitting",
  "--public-path",
  "/",
  "--define",
  `process.env.NODE_ENV=\"${isProd ? "production" : "development"}\"`,
  ...envDefines,
];

if (!isProd) {
  buildArgs.push("--sourcemap");
}

if (isProd) {
  buildArgs.push("--minify");
}

const buildExitCode = await new Promise((resolve) => {
  const buildProcess = spawn("bun", buildArgs, {
    cwd: rootDir,
    stdio: "inherit",
  });

  buildProcess.on("close", (code) => resolve(code ?? 1));
  buildProcess.on("error", () => resolve(1));
});

if (buildExitCode !== 0) {
  process.exit(Number(buildExitCode));
}

const distFiles = await fs.readdir(distDir);
const mainJs = distFiles.find((file) => /^main.*\.js$/.test(file));
const mainCss = distFiles.find((file) => /^main.*\.css$/.test(file));

if (!mainJs) {
  console.error("Build output missing main JavaScript bundle");
  process.exit(1);
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MEEET State</title>
    ${mainCss ? `<link rel="stylesheet" href="/${mainCss}" />` : ""}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${mainJs}"></script>
  </body>
</html>`;

await fs.writeFile(path.join(distDir, "index.html"), html, "utf8");

const publicDir = path.join(rootDir, "public");
try {
  await fs.cp(publicDir, distDir, { recursive: true });
} catch {
  // no-op when public directory does not exist
}

console.log(`Build complete (${mode})`);
