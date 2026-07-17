import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeTestApi } from "../helpers/runtime-api.mjs";

function annotation(id, start, end, overrides = {}) {
  return {
    id,
    lessonId: "lesson-1",
    scopeId: "scope-a",
    anchor: { scopeId: "scope-a", start, end, exact: "x".repeat(end - start) },
    style: "solid",
    color: "amber",
    noteId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

test("adjacent annotations with identical presentation merge", () => {
  const { mergeAnnotations } = loadRuntimeTestApi();
  const merged = mergeAnnotations([annotation("a", 0, 5), annotation("b", 5, 10)]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].anchor.start, 0);
  assert.equal(merged[0].anchor.end, 10);
});

test("different styles, colors, scopes, and note attachments never merge", () => {
  const { mergeAnnotations } = loadRuntimeTestApi();
  const base = annotation("a", 0, 5);
  const cases = [
    annotation("style", 5, 10, { style: "wavy" }),
    annotation("color", 5, 10, { color: "violet" }),
    annotation("scope", 5, 10, { scopeId: "scope-b", anchor: { scopeId: "scope-b", start: 5, end: 10, exact: "xxxxx" } }),
    annotation("note", 5, 10, { noteId: "note-1" })
  ];
  for (const candidate of cases) assert.equal(mergeAnnotations([base, candidate]).length, 2);
});

test("input annotations are not mutated during normalization", () => {
  const { mergeAnnotations } = loadRuntimeTestApi();
  const input = [annotation("a", 0, 5), annotation("b", 5, 10)];
  const snapshot = structuredClone(input);
  mergeAnnotations(input);
  assert.deepEqual(input, snapshot);
});
