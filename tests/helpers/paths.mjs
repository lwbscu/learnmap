import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const fixturePath = path.join(repoRoot, "tests", "fixtures", "annotation-lesson.html");
export const fixtureFileUrl = pathToFileURL(fixturePath).href;
export const fixtureHttpPath = "/tests/fixtures/annotation-lesson.html";

export function runtimePath() {
  return path.join(repoRoot, "assets", "courseware-runtime", "annotation-notes.js");
}
