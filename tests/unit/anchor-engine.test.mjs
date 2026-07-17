import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeTestApi } from "../helpers/runtime-api.mjs";

test("crc32 is deterministic and uses an eight-character lowercase hex digest", () => {
  const { crc32 } = loadRuntimeTestApi();
  assert.equal(crc32("123456789"), "cbf43926");
  assert.match(crc32("LearnMap 学习笔记"), /^[0-9a-f]{8}$/);
  assert.equal(crc32("LearnMap 学习笔记"), crc32(new TextEncoder().encode("LearnMap 学习笔记")));
  assert.notEqual(crc32("LearnMap 学习笔记"), crc32("LearnMap 学习批注"));
});

test("an exact anchor resolves to the original scope and offsets", () => {
  const { buildAnchor, resolveAnchor } = loadRuntimeTestApi();
  const text = "开头内容 target 结尾内容";
  const start = text.indexOf("target");
  const anchor = buildAnchor({ scopeId: "scope-a", text, start, end: start + 6 });
  const result = resolveAnchor(anchor, [{ scopeId: "scope-a", text }]);
  assert.equal(result.scopeId, "scope-a");
  assert.equal(result.start, start);
  assert.equal(result.end, start + 6);
  assert.equal(result.status, "anchored");
  assert.equal(result.method, "position");
});

test("quote context restores after text is inserted before the selection", () => {
  const { buildAnchor, resolveAnchor } = loadRuntimeTestApi();
  const source = "第一段前文 需要恢复的重点 第一段后文";
  const exact = "需要恢复的重点";
  const start = source.indexOf(exact);
  const anchor = buildAnchor({ scopeId: "scope-a", text: source, start, end: start + exact.length });
  const changed = `新增引导。${source}`;
  const result = resolveAnchor(anchor, [{ scopeId: "scope-a", text: changed }]);
  assert.equal(result.status, "anchored");
  assert.equal(changed.slice(result.start, result.end), exact);
  assert.notEqual(result.method, "position");
});

test("prefix and suffix disambiguate repeated exact text", () => {
  const { buildAnchor, resolveAnchor } = loadRuntimeTestApi();
  const text = "甲前 target 甲后；乙前 target 乙后";
  const start = text.lastIndexOf("target");
  const anchor = buildAnchor({ scopeId: "scope-repeat", text, start, end: start + 6 });
  const result = resolveAnchor(anchor, [{ scopeId: "scope-repeat", text }]);
  assert.equal(result.status, "anchored");
  assert.equal(result.start, start);
});

test("CJK and emoji selections preserve JavaScript string offsets", () => {
  const { buildAnchor, resolveAnchor } = loadRuntimeTestApi();
  const text = "中文重点🧠可以恢复";
  const exact = "重点🧠";
  const start = text.indexOf(exact);
  const anchor = buildAnchor({ scopeId: "unicode", text, start, end: start + exact.length });
  const result = resolveAnchor(anchor, [{ scopeId: "unicode", text }]);
  assert.equal(text.slice(result.start, result.end), exact);
});

test("a missing or ambiguous quote becomes orphaned instead of guessing", () => {
  const { buildAnchor, resolveAnchor } = loadRuntimeTestApi();
  const source = "唯一需要保存的内容";
  const anchor = buildAnchor({ scopeId: "gone", text: source, start: 2, end: 8 });
  const result = resolveAnchor(anchor, [{ scopeId: "other", text: "完全不同" }]);
  assert.equal(result.status, "orphaned");
  assert.equal(result.scopeId, null);
});
