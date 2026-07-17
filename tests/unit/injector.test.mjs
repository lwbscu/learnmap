import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { repoRoot } from "../helpers/paths.mjs";

const injector = path.join(repoRoot, "scripts", "inject-courseware-runtime.mjs");
const lessonShell = "<!doctype html><html><head><title>T</title><script>var LESSON_META={courseId:'course',lessonId:'lesson-01',annotationEnabled:true,annotationRuntimeVersion:'1',contentFingerprint:'0000000000000000000000000000000000000000000000000000000000000000'};</script></head><body><main data-lm-annotatable data-lm-scope='s0'>x</main></body></html>\n";

function run(args) {
  return spawnSync(process.execPath, [injector, ...args], { cwd: repoRoot, encoding: "utf8" });
}

test("runtime injection is canonical, atomic, and idempotent", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learnmap-injector-"));
  const lesson = path.join(directory, "lesson.html");
  try {
    fs.writeFileSync(lesson, lessonShell, "utf8");
    const first = run([lesson]);
    assert.equal(first.status, 0, first.stdout || first.stderr);
    const firstReport = JSON.parse(first.stdout);
    assert.equal(firstReport.pass, true);
    assert.equal(firstReport.changed, true);
    assert.match(firstReport.runtimeSha256, /^[0-9a-f]{64}$/);
    const once = fs.readFileSync(lesson, "utf8");
    assert.equal((once.match(/LEARNMAP_COURSEWARE_RUNTIME_START/g) || []).length, 1);

    const second = run([lesson]);
    assert.equal(second.status, 0, second.stdout || second.stderr);
    const secondReport = JSON.parse(second.stdout);
    assert.equal(secondReport.changed, false);
    assert.equal(fs.readFileSync(lesson, "utf8"), once);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("check mode reports work without changing the lesson", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learnmap-injector-check-"));
  const lesson = path.join(directory, "lesson.html");
  const source = lessonShell;
  try {
    fs.writeFileSync(lesson, source, "utf8");
    const result = run([lesson, "--check"]);
    assert.equal(result.status, 0, result.stdout || result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.checkOnly, true);
    assert.equal(report.changed, true);
    assert.equal(fs.readFileSync(lesson, "utf8"), source);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
