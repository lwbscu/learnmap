#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1";
const RUNTIME_LIMIT = 48 * 1024;
const START = "LEARNMAP_COURSEWARE_RUNTIME_START";
const END = "LEARNMAP_COURSEWARE_RUNTIME_END";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.resolve(scriptDir, "../assets/courseware-runtime");
const cssPath = path.join(assetDir, "annotation-notes.css");
const jsPath = path.join(assetDir, "annotation-notes.js");
const broadBlockPattern = new RegExp(`<!--\\s*${START}\\b[\\s\\S]*?<!--\\s*${END}\\s*-->`, "gi");
const markerPattern = (name) => `<!--\\s*${name}\\b`;

function emit(result, exitCode = 0) {
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = exitCode;
}

function normalizeAsset(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\s+$/u, "");
}

function findTagEnd(source, startIndex) {
  let quote = null;
  for (let index = startIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null;
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
}

function tagNameFromToken(token) {
  return token.match(/^<\s*\/?\s*([a-z][\w:-]*)/i)?.[1]?.toLowerCase() || null;
}

function hasAttribute(token, name) {
  return new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/?>)`, "i").test(token.replace(/^<\/?\s*[\w:-]+/, ""));
}

function hasClassToken(token, names) {
  const value = token.match(/(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  if (!value) return false;
  const classes = new Set((value[1] || value[2] || "").split(/\s+/u).filter(Boolean));
  return names.some((name) => classes.has(name));
}

function findAnnotatableRoot(source) {
  const roots = [];
  for (let index = 0; index < source.length;) {
    const open = source.indexOf("<", index);
    if (open < 0) break;
    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open + 4);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    const end = findTagEnd(source, open);
    if (end < 0) throw new Error("Unterminated HTML tag while locating data-lm-annotatable.");
    const token = source.slice(open, end + 1);
    const tokenTagName = tagNameFromToken(token);
    if (!/^<\s*\//.test(token) && hasAttribute(token, "data-lm-annotatable")) {
      const tagName = tokenTagName;
      if (!tagName || /\/\s*>$/.test(token)) throw new Error("data-lm-annotatable must be on a non-void HTML root.");
      roots.push({ tagName, open, contentStart: end + 1 });
    }
    if (!/^<\s*\//.test(token) && ["script", "style", "template"].includes(tokenTagName)) {
      const closingPattern = new RegExp(`<\\/\\s*${tokenTagName}\\s*>`, "ig");
      closingPattern.lastIndex = end + 1;
      const closingMatch = closingPattern.exec(source);
      index = closingMatch ? closingMatch.index + closingMatch[0].length : source.length;
    } else index = end + 1;
  }
  if (roots.length !== 1) throw new Error(`Expected exactly one data-lm-annotatable root; found ${roots.length}.`);

  const root = roots[0];
  let depth = 1;
  for (let index = root.contentStart; index < source.length;) {
    const open = source.indexOf("<", index);
    if (open < 0) break;
    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open + 4);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    const end = findTagEnd(source, open);
    if (end < 0) throw new Error("Unterminated HTML tag inside data-lm-annotatable root.");
    const token = source.slice(open, end + 1);
    const tokenTagName = tagNameFromToken(token);
    if (tokenTagName === root.tagName) {
      if (/^<\s*\//.test(token)) depth -= 1;
      else if (!/\/\s*>$/.test(token)) depth += 1;
      if (depth === 0) return source.slice(root.contentStart, open);
    }
    if (!/^<\s*\//.test(token) && ["script", "style", "template"].includes(tokenTagName)) {
      const closingPattern = new RegExp(`<\\/\\s*${tokenTagName}\\s*>`, "ig");
      closingPattern.lastIndex = end + 1;
      const closingMatch = closingPattern.exec(source);
      index = closingMatch ? closingMatch.index + closingMatch[0].length : source.length;
    } else index = end + 1;
  }
  throw new Error("data-lm-annotatable root is missing its closing tag.");
}

function decodeBasicEntities(text) {
  const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  return text.replace(/&(?:#(\d+)|#x([a-f0-9]+)|([a-z]+));/gi, (entity, decimal, hexadecimal, name) => {
    if (name) return Object.hasOwn(named, name.toLowerCase()) ? named[name.toLowerCase()] : entity;
    const codePoint = Number.parseInt(decimal || hexadecimal, decimal ? 10 : 16);
    try {
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    } catch {
      return entity;
    }
  });
}

export function normalizeAnnotatableText(source) {
  const inner = findAnnotatableRoot(source);
  const excludedTags = new Set(["script", "style", "template", "svg", "canvas", "button", "input", "select", "textarea", "option", "optgroup", "datalist"]);
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const rawTextTags = new Set(["script", "style", "textarea"]);
  const stack = [];
  const chunks = [];
  let excludedDepth = 0;

  for (let index = 0; index < inner.length;) {
    const open = inner.indexOf("<", index);
    if (open < 0) {
      if (excludedDepth === 0) chunks.push(inner.slice(index));
      break;
    }
    if (excludedDepth === 0 && open > index) chunks.push(inner.slice(index, open));
    if (inner.startsWith("<!--", open)) {
      const commentEnd = inner.indexOf("-->", open + 4);
      if (commentEnd < 0) throw new Error("Unterminated comment inside data-lm-annotatable root.");
      index = commentEnd + 3;
      continue;
    }
    const end = findTagEnd(inner, open);
    if (end < 0) throw new Error("Unterminated tag inside data-lm-annotatable root.");
    const token = inner.slice(open, end + 1);
    const tagName = tagNameFromToken(token);
    if (!tagName || /^<!|^<\?/.test(token)) {
      index = end + 1;
      continue;
    }
    const closing = /^<\s*\//.test(token);
    if (closing) {
      const stackIndex = stack.map((entry) => entry.tagName).lastIndexOf(tagName);
      if (stackIndex >= 0) {
        const removed = stack.splice(stackIndex);
        excludedDepth -= removed.filter((entry) => entry.startsExclusion).length;
      }
      if (excludedDepth === 0) chunks.push(" ");
      index = end + 1;
      continue;
    }

    const parentExcluded = excludedDepth > 0;
    const startsExclusion = !parentExcluded && (
      excludedTags.has(tagName)
      || hasAttribute(token, "hidden")
      || hasAttribute(token, "data-lm-ignore")
      || /(?:^|\s)aria-hidden\s*=\s*(?:"true"|'true'|true)(?:\s|\/?>)/i.test(token)
      || /(?:^|\s)style\s*=\s*(["'])[^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*\1/i.test(token)
      || hasClassToken(token, ["hidden", "is-hidden", "tooltip"])
    );
    if (startsExclusion) excludedDepth += 1;
    if (!parentExcluded && !startsExclusion) chunks.push(" ");
    const isVoid = voidTags.has(tagName) || /\/\s*>$/.test(token);
    if (!isVoid) stack.push({ tagName, startsExclusion });
    else if (startsExclusion) excludedDepth -= 1;

    if (!isVoid && rawTextTags.has(tagName)) {
      const closingPattern = new RegExp(`<\\/\\s*${tagName}\\s*>`, "ig");
      closingPattern.lastIndex = end + 1;
      const closingMatch = closingPattern.exec(inner);
      if (!closingMatch) throw new Error(`Excluded <${tagName}> is missing its closing tag.`);
      const entry = stack.pop();
      if (entry?.startsExclusion) excludedDepth -= 1;
      index = closingMatch.index + closingMatch[0].length;
    } else {
      index = end + 1;
    }
  }

  const normalizedText = decodeBasicEntities(chunks.join(" ")).replace(/\s+/gu, " ").trim();
  if (!normalizedText) throw new Error("data-lm-annotatable contains no fingerprintable teaching text.");
  return normalizedText;
}

export function computeContentFingerprint(source) {
  const normalizedText = normalizeAnnotatableText(source);
  return {
    sha256: crypto.createHash("sha256").update(normalizedText, "utf8").digest("hex"),
    normalizedTextLength: [...normalizedText].length
  };
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && nextCharacter === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && nextCharacter === "/") {
      lineComment = true;
      index += 1;
    } else if (character === "/" && nextCharacter === "*") {
      blockComment = true;
      index += 1;
    } else if (character === "\"" || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return index;
  }
  return -1;
}

export function extractLessonMetaObject(source) {
  const declarations = [...source.matchAll(/(?:\b(?:var|let|const)\s+LESSON_META|\b(?:window\.)?LESSON_META)\s*=\s*\{/g)];
  if (declarations.length !== 1) throw new Error(`Expected exactly one LESSON_META object declaration; found ${declarations.length}.`);
  const openIndex = declarations[0].index + declarations[0][0].lastIndexOf("{");
  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex < 0) throw new Error("LESSON_META object is missing its closing brace.");
  return { openIndex, closeIndex, text: source.slice(openIndex, closeIndex + 1) };
}

function replaceContentFingerprint(source, sha256) {
  const metadata = extractLessonMetaObject(source);
  const pattern = /((?:["']contentFingerprint["']|contentFingerprint)\s*:\s*)(["'])([^"']*)\2/g;
  const matches = [...metadata.text.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Expected exactly one LESSON_META.contentFingerprint field; found ${matches.length}.`);
  const replacedMetadata = metadata.text.replace(pattern, (_match, prefix, quote) => `${prefix}${quote}${sha256}${quote}`);
  return source.slice(0, metadata.openIndex) + replacedMetadata + source.slice(metadata.closeIndex + 1);
}

function loadCanonicalRuntime() {
  const missing = [cssPath, jsPath].filter((candidate) => !fs.existsSync(candidate));
  if (missing.length) throw new Error(`Missing runtime asset(s): ${missing.join(", ")}`);
  const css = normalizeAsset(fs.readFileSync(cssPath, "utf8"));
  const js = normalizeAsset(fs.readFileSync(jsPath, "utf8"));
  if (/<\/style/i.test(css)) throw new Error("Runtime CSS contains a closing </style> token.");
  if (/<\/script/i.test(js)) throw new Error("Runtime JavaScript contains a closing </script> token.");
  const hashInput = `version=${VERSION}\ncss\n${css}\njs\n${js}`;
  const sha256 = crypto.createHash("sha256").update(hashInput, "utf8").digest("hex");
  const block = [
    `<!-- ${START} version="${VERSION}" sha256="${sha256}" -->`,
    `<style data-lm-runtime="annotation-notes" data-lm-version="${VERSION}">`,
    css,
    "</style>",
    `<script data-lm-runtime="annotation-notes" data-lm-version="${VERSION}">`,
    js,
    "</script>",
    `<!-- ${END} -->`
  ].join("\n");
  const runtimeBytes = Buffer.byteLength(block, "utf8");
  if (runtimeBytes > RUNTIME_LIMIT) throw new Error(`Canonical runtime exceeds the ${RUNTIME_LIMIT}-byte inline limit.`);
  return { version: VERSION, sha256, block, runtimeBytes };
}

function main() {
  const args = process.argv.slice(2);
  let inputArg = null;
  let outputArg = null;
  let checkOnly = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output" || arg === "--out") {
      if (!args[index + 1] || args[index + 1].startsWith("--")) {
        emit({ pass: false, errors: [`${arg} requires a path.`] }, 2);
        return;
      }
      outputArg = args[index + 1];
      index += 1;
    } else if (arg === "--check" || arg === "--dry-run") {
      checkOnly = true;
    } else if (!arg.startsWith("--") && !inputArg) {
      inputArg = arg;
    } else {
      emit({ pass: false, errors: [`Unknown or incomplete argument: ${arg}`] }, 2);
      return;
    }
  }

  if (!inputArg) {
    emit({
      pass: false,
      usage: "node scripts/inject-courseware-runtime.mjs <html-path> [--output <path>] [--check]",
      errors: ["Missing HTML path."]
    }, 2);
    return;
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg || inputPath);
  try {
    if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) throw new Error("HTML file does not exist.");
    const runtime = loadCanonicalRuntime();
    const original = fs.readFileSync(inputPath, "utf8");
    if (!/<\/head\s*>/i.test(original)) throw new Error("HTML is missing </head>; runtime was not injected.");
    const oldBlocks = [...original.matchAll(broadBlockPattern)];
    const startMarkerCount = (original.match(new RegExp(markerPattern(START), "gi")) || []).length;
    const endMarkerCount = (original.match(new RegExp(markerPattern(END), "gi")) || []).length;
    if (startMarkerCount !== oldBlocks.length || endMarkerCount !== oldBlocks.length) {
      throw new Error("Unbalanced or malformed LearnMap runtime markers; refusing to rewrite the HTML.");
    }
    const withoutRuntime = original.replace(broadBlockPattern, "");
    const contentFingerprint = computeContentFingerprint(withoutRuntime);
    const fingerprintedSource = replaceContentFingerprint(withoutRuntime, contentFingerprint.sha256);
    const closingHeads = [...fingerprintedSource.matchAll(/<\/head\s*>/gi)];
    const closingHead = closingHeads.at(-1);
    if (!closingHead) throw new Error("HTML is missing </head>; runtime was not injected.");
    const beforeHead = fingerprintedSource.slice(0, closingHead.index).replace(/[ \t]*(?:\r?\n[ \t]*)*$/u, "\n");
    const afterHead = fingerprintedSource.slice(closingHead.index + closingHead[0].length);
    const injected = `${beforeHead}${runtime.block}\n</head>${afterHead}`;
    const changed = injected !== original || outputPath !== inputPath;
    if (!checkOnly && changed) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const temporaryPath = `${outputPath}.lm-runtime-${process.pid}.tmp`;
      fs.writeFileSync(temporaryPath, injected, "utf8");
      fs.renameSync(temporaryPath, outputPath);
    }
    const totalBytes = Buffer.byteLength(injected, "utf8");
    emit({
      pass: true,
      input: inputPath,
      output: outputPath,
      checkOnly,
      changed,
      replacedBlocks: oldBlocks.length,
      runtimeVersion: runtime.version,
      runtimeSha256: runtime.sha256,
      runtimeBytes: runtime.runtimeBytes,
      runtimeMaxBytes: RUNTIME_LIMIT,
      contentFingerprint: contentFingerprint.sha256,
      normalizedTextLength: contentFingerprint.normalizedTextLength,
      contentBytes: totalBytes - runtime.runtimeBytes,
      totalBytes,
      sha256: crypto.createHash("sha256").update(injected, "utf8").digest("hex")
    });
  } catch (error) {
    emit({ pass: false, input: inputPath, output: outputPath, errors: [error.message] }, 1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
