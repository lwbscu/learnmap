import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "assets", "courseware-runtime-src");
const outputDir = path.join(rootDir, "assets", "courseware-runtime");
const jsSource = path.join(sourceDir, "annotation-notes.js");
const cssSource = path.join(sourceDir, "annotation-notes.css");
const jsOutput = path.join(outputDir, "annotation-notes.js");
const cssOutput = path.join(outputDir, "annotation-notes.css");
const BYTE_LIMIT = 64 * 1024;

async function loadEsbuild() {
  try {
    return await import("esbuild");
  } catch (error) {
    throw new Error("Missing esbuild. Install it in the runtime build environment before running scripts/build-courseware-runtime.mjs.");
  }
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const unknown = args.filter((arg) => arg !== "--check");
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  const esbuild = await loadEsbuild();
  const [sourceJs, sourceCss] = await Promise.all([
    fs.readFile(jsSource, "utf8"),
    fs.readFile(cssSource, "utf8")
  ]);

  const legacyDrawerPattern = new RegExp("\\.lm-" + "drawer\\b");
  if (legacyDrawerPattern.test(sourceJs) || legacyDrawerPattern.test(sourceCss)) {
    throw new Error("Runtime source must not contain the legacy drawer selector.");
  }
  if (!/version:\s*API_VERSION/.test(sourceJs) || !/const API_VERSION\s*=\s*"2"/.test(sourceJs)) {
    throw new Error("Runtime source must expose API version 2.");
  }

  const jsResult = await esbuild.transform(sourceJs, {
    loader: "js",
    minify: true,
    legalComments: "none",
    target: "es2020"
  });
  const cssResult = await esbuild.transform(sourceCss, {
    loader: "css",
    minify: true,
    legalComments: "none",
    target: "chrome100"
  });

  const js = `${jsResult.code.trim()}\n`;
  const css = `${cssResult.code.trim()}\n`;
  if (/<\/script/i.test(js) || /<\/style/i.test(css)) {
    throw new Error("Runtime output contains an unsafe inline closing tag.");
  }
  const totalBytes = Buffer.byteLength(js) + Buffer.byteLength(css);
  if (totalBytes > BYTE_LIMIT) {
    throw new Error(`Minified runtime is ${totalBytes} bytes, above the ${BYTE_LIMIT} byte limit.`);
  }

  if (checkOnly) {
    const [builtJs, builtCss] = await Promise.all([
      fs.readFile(jsOutput, "utf8").catch(() => null),
      fs.readFile(cssOutput, "utf8").catch(() => null)
    ]);
    if (builtJs !== js || builtCss !== css) throw new Error("Canonical runtime assets are stale. Run npm run build:runtime.");
  } else {
    await fs.mkdir(outputDir, { recursive: true });
    await Promise.all([
      fs.writeFile(jsOutput, js, "utf8"),
      fs.writeFile(cssOutput, css, "utf8")
    ]);
  }

  const manifest = {
    version: 2,
    checkOnly,
    totalBytes,
    jsBytes: Buffer.byteLength(js),
    cssBytes: Buffer.byteLength(css),
    jsSha256: sha256(js),
    cssSha256: sha256(css)
  };
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
