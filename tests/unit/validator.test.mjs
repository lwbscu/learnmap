import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fixturePath, repoRoot } from "../helpers/paths.mjs";

const validator = path.join(repoRoot, "scripts", "validate-courseware.mjs");

function run(args) {
  return spawnSync(process.execPath, [validator, ...args], { cwd: repoRoot, encoding: "utf8" });
}

test("deterministic annotation fixture remains structurally valid in legacy mode", () => {
  const result = run([fixturePath, "--legacy"]);
  assert.equal(result.status, 0, result.stdout || result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.pass, true);
  assert.equal(report.mode, "legacy-structure");
});

test("validator rejects a truncated lesson without writing repository artifacts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learnmap-validator-"));
  const truncated = path.join(directory, "truncated.html");
  try {
    fs.writeFileSync(truncated, "<!doctype html><html><body><script>function broken(</script>", "utf8");
    const result = run([truncated, "--legacy"]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.pass, false);
    assert.ok(report.errors.some((message) => /closing|invalid JavaScript/i.test(message)));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
