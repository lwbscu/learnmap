#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.LEARNMAP_TEST_PORT || 4173);
const host = "127.0.0.1";
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
}

const server = http.createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end("ok");
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
    "cache-control": "no-store"
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`LearnMap test server: http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
