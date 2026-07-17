import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeTestApi } from "../helpers/runtime-api.mjs";

test("import validation rejects non-objects and unknown schemas", () => {
  const { validateImport } = loadRuntimeTestApi();
  for (const value of [null, [], "text", 42, { schema: "unknown/v99" }]) {
    const result = validateImport(value);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  }
});

test("import validation rejects executable note content and dangling asset references", () => {
  const { validateImport } = loadRuntimeTestApi();
  const value = {
    schema: "learnmap-annotations/v1",
    version: 1,
    lesson: { topic: "test", lessonId: "lesson-1", contentVersion: "v1" },
    annotations: [],
    notes: [{ id: "n1", blocks: [{ type: "html", html: "<img src=x onerror=alert(1)>" }], assetIds: ["missing"] }],
    assets: []
  };
  const result = validateImport(value);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("import validation never mutates the caller's value", () => {
  const { validateImport } = loadRuntimeTestApi();
  const value = { schema: "learnmap-annotations/v1", version: 1, annotations: [], notes: [], assets: [] };
  const before = structuredClone(value);
  validateImport(value);
  assert.deepEqual(value, before);
});
