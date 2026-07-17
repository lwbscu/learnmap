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

test("legacy v1 imports normalize lesson metadata, style aliases, custom colors, and note surface", () => {
  const { validateImport } = loadRuntimeTestApi();
  const value = {
    schema: "learnmap-annotations/v1",
    version: 1,
    lesson: { courseId: "legacy-course", lessonId: "legacy-lesson", contentVersion: "v1" },
    annotations: [{
      id: "ann-1",
      scopeId: "core",
      anchor: { scopeId: "core", start: 0, end: 4, exact: "text" },
      style: "wavy",
      color: "#12AB34",
      surface: "#FFFFFF",
      noteId: "note-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }],
    notes: [{
      id: "note-1",
      annotationId: "ann-1",
      text: "legacy note",
      blocks: [{ type: "paragraph", text: "legacy note" }],
      assetIds: [],
      surface: "#FFFFFF",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }],
    assets: []
  };
  const result = validateImport(value);
  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.equal(result.value.courseId, "legacy-course");
  assert.equal(result.value.lessonId, "legacy-lesson");
  assert.equal(result.value.annotations[0].lineStyle, "wavy");
  assert.equal(result.value.annotations[0].color, "custom");
  assert.equal(result.value.annotations[0].customColor, "#12AB34");
  assert.equal(result.value.notes[0].surfaceColor, "#FFFFFF");
});

test("import validation rejects malformed custom hex colors and surfaces", () => {
  const { validateImport } = loadRuntimeTestApi();
  const value = {
    schema: "learnmap-annotations/v1",
    version: 1,
    courseId: "course",
    lessonId: "lesson",
    annotations: [{
      id: "ann-1",
      scopeId: "core",
      anchor: { scopeId: "core", start: 0, end: 4, exact: "text" },
      lineStyle: "solid",
      color: "#12345G",
      surface: "white",
      noteId: null
    }],
    notes: [],
    assets: []
  };
  const result = validateImport(value);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});
