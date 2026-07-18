#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeContentFingerprint, extractLessonMetaObject } from "./inject-courseware-runtime.mjs";

const RUNTIME_VERSION = "2";
const RUNTIME_START = "LEARNMAP_COURSEWARE_RUNTIME_START";
const RUNTIME_END = "LEARNMAP_COURSEWARE_RUNTIME_END";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeAssetDir = path.resolve(scriptDir, "../assets/courseware-runtime");
const runtimeCssPath = path.join(runtimeAssetDir, "annotation-notes.css");
const runtimeJsPath = path.join(runtimeAssetDir, "annotation-notes.js");
const runtimeBlockPattern = new RegExp(`<!--\\s*${RUNTIME_START}\\b[\\s\\S]*?<!--\\s*${RUNTIME_END}\\s*-->`, "gi");

const args = process.argv.slice(2);
let fileArg = null;
let maxBytes = null;
let maxBytesProvided = false;
let legacyMode = false;
let tierOverride = null;

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--max-bytes") {
    maxBytes = Number(args[index + 1]);
    maxBytesProvided = true;
    index += 1;
  } else if (args[index] === "--legacy") {
    legacyMode = true;
  } else if (args[index] === "--tier") {
    tierOverride = args[index + 1]?.toLowerCase();
    index += 1;
  } else if (!args[index].startsWith("--") && !fileArg) {
    fileArg = args[index];
  }
}

if (!fileArg || (maxBytesProvided && (!Number.isFinite(maxBytes) || maxBytes <= 0))) {
  console.log(JSON.stringify({
    pass: false,
    usage: "node scripts/validate-courseware.mjs <html-path> [--tier compact|standard|high-quality|custom] [--max-bytes N] [--legacy]",
    errors: ["Missing HTML path or invalid --max-bytes value."]
  }, null, 2));
  process.exit(2);
}

function normalizeAsset(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\s+$/u, "");
}

function loadCanonicalRuntime() {
  const missing = [runtimeCssPath, runtimeJsPath].filter((candidate) => !fs.existsSync(candidate));
  if (missing.length) throw new Error(`Missing runtime asset(s): ${missing.join(", ")}`);
  const css = normalizeAsset(fs.readFileSync(runtimeCssPath, "utf8"));
  const js = normalizeAsset(fs.readFileSync(runtimeJsPath, "utf8"));
  if (/<\/style/i.test(css) || /<\/script/i.test(js)) throw new Error("Runtime asset contains an unsafe inline closing tag.");
  const hashInput = `version=${RUNTIME_VERSION}\ncss\n${css}\njs\n${js}`;
  const sha256 = crypto.createHash("sha256").update(hashInput, "utf8").digest("hex");
  const block = [
    `<!-- ${RUNTIME_START} version="${RUNTIME_VERSION}" sha256="${sha256}" -->`,
    `<style data-lm-runtime="annotation-notes" data-lm-version="${RUNTIME_VERSION}">`,
    css,
    "</style>",
    `<script data-lm-runtime="annotation-notes" data-lm-version="${RUNTIME_VERSION}">`,
    js,
    "</script>",
    `<!-- ${RUNTIME_END} -->`
  ].join("\n");
  return { version: RUNTIME_VERSION, sha256, block, js, bytes: Buffer.byteLength(block, "utf8") };
}

const filePath = path.resolve(fileArg);
const errors = [];
const warnings = [];
const contractProblem = (message) => (legacyMode ? warnings : errors).push(message);

if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
  console.log(JSON.stringify({ pass: false, file: filePath, errors: ["HTML file does not exist."] }, null, 2));
  process.exit(1);
}

const sourceBuffer = fs.readFileSync(filePath);
const source = sourceBuffer.toString("utf8");
const totalBytes = sourceBuffer.length;
const runtimeMatches = [...source.matchAll(runtimeBlockPattern)];
const runtimeBytes = runtimeMatches.reduce((sum, match) => sum + Buffer.byteLength(match[0], "utf8"), 0);
const contentBytes = totalBytes - runtimeBytes;
const contentSource = source.replace(runtimeBlockPattern, "");

let canonicalRuntime = null;
let canonicalRuntimeError = null;
try {
  canonicalRuntime = loadCanonicalRuntime();
} catch (error) {
  canonicalRuntimeError = error.message;
  contractProblem(error.message);
}

if (runtimeMatches.length === 0) {
  contractProblem("Missing canonical LearnMap annotation/notes runtime block.");
} else {
  if (runtimeMatches.length !== 1) contractProblem(`Expected exactly one runtime block; found ${runtimeMatches.length}.`);
  const marker = runtimeMatches[0][0].match(new RegExp(`^<!--\\s*${RUNTIME_START}\\s+version="([^"]+)"\\s+sha256="([a-f0-9]{64})"\\s*-->`, "i"));
  if (!marker) contractProblem("Runtime START marker is malformed or missing version/sha256.");
  else {
    if (marker[1] !== RUNTIME_VERSION) contractProblem(`Runtime version ${marker[1]} does not match required version ${RUNTIME_VERSION}.`);
    if (canonicalRuntime && marker[2].toLowerCase() !== canonicalRuntime.sha256) contractProblem("Runtime marker sha256 does not match canonical assets.");
  }
  if (canonicalRuntime && runtimeMatches[0][0] !== canonicalRuntime.block) contractProblem("Inline runtime block differs from canonical assets; reinject it.");
}


const tierMatch = contentSource.match(/["']?coursewareTier["']?\s*:\s*["'](compact|standard|high-quality|custom)["']/i);
const embeddedTier = tierMatch?.[1]?.toLowerCase() || null;
const detectedTier = tierOverride || embeddedTier;
const allowedTiers = ["compact", "standard", "high-quality", "custom"];
const coursewareTier = allowedTiers.includes(detectedTier) ? detectedTier : "standard";
if (detectedTier && !allowedTiers.includes(detectedTier)) contractProblem(`Invalid courseware tier: ${detectedTier}.`);
if (tierOverride && embeddedTier && tierOverride !== embeddedTier) contractProblem(`Tier override ${tierOverride} does not match embedded tier ${embeddedTier}.`);
if (!embeddedTier) contractProblem("Missing or invalid embedded coursewareTier; legacy content normalizes to standard.");

const tierBudgets = {
  compact: { targetMin: 16 * 1024, targetMax: 32 * 1024 },
  standard: { targetMin: 24 * 1024, targetMax: 60 * 1024 },
  "high-quality": { targetMin: 48 * 1024, targetMax: null },
  custom: { targetMin: 24 * 1024, targetMax: null }
};
const budget = tierBudgets[coursewareTier];
const resolvedContentMax = maxBytesProvided ? maxBytes : null;

if (totalBytes === 0) errors.push("HTML file is empty.");
if (resolvedContentMax !== null && contentBytes > resolvedContentMax) errors.push(`Courseware content exceeds the explicit --max-bytes limit of ${resolvedContentMax} bytes.`);
if (contentBytes < 8 * 1024) warnings.push("Courseware content is smaller than 8 KiB; check for truncation or overly thin content.");
if (contentBytes < budget.targetMin || (budget.targetMax !== null && contentBytes > budget.targetMax)) warnings.push(`Courseware content is outside the ${coursewareTier} planning range; verify density without adding filler or deleting useful depth.`);

if (!/<!doctype\s+html/i.test(source)) errors.push("Missing <!DOCTYPE html>.");
if (!/<\/html>\s*$/i.test(source.trim())) errors.push("Missing closing </html>.");

const requiredTokens = ["localStorage", "data-review-target", "outputMode", "htmlPlan", "coursewareTier", "coursewareTierInstructions", "deliveryMode", "nextCommand"];
requiredTokens.forEach((token) => {
  if (!contentSource.includes(token)) contractProblem(`Missing required token: ${token}`);
});

["buildLearningRecord", "copyLearningRecord", "downloadLearningRecord"].forEach((name) => {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(contentSource)) contractProblem(`Missing required function: ${name}`);
});

let lessonMetaText = "";
try {
  lessonMetaText = extractLessonMetaObject(contentSource).text;
} catch (error) {
  contractProblem(`Unable to locate LESSON_META: ${error.message}`);
}
const courseId = lessonMetaText.match(/["']?courseId["']?\s*:\s*["']([^"']+)["']/i)?.[1] || null;
const fingerprint = lessonMetaText.match(/["']?contentFingerprint["']?\s*:\s*["']([a-f0-9]{64})["']/i)?.[1] || null;
let computedFingerprint = null;
try {
  computedFingerprint = computeContentFingerprint(contentSource);
} catch (error) {
  contractProblem(`Unable to compute contentFingerprint: ${error.message}`);
}
if (!courseId || /\[|placeholder/i.test(courseId) || /^(?:stable-)?course-id$/i.test(courseId)) contractProblem("Missing or invalid LESSON_META.courseId.");
if (!/["']?annotationEnabled["']?\s*:\s*true\b/i.test(lessonMetaText)) contractProblem("LESSON_META.annotationEnabled must be true.");
if (!new RegExp(`["']?annotationRuntimeVersion["']?\\s*:\\s*["']${RUNTIME_VERSION}["']`, "i").test(lessonMetaText)) {
  contractProblem(`LESSON_META.annotationRuntimeVersion must be "${RUNTIME_VERSION}".`);
}
if (!fingerprint) contractProblem("Missing or invalid 64-character LESSON_META.contentFingerprint.");
else if (computedFingerprint && fingerprint.toLowerCase() !== computedFingerprint.sha256) contractProblem("LESSON_META.contentFingerprint does not match normalized annotatable teaching text.");
if (!/\bdata-lm-annotatable(?:\s|=|>)/i.test(contentSource)) contractProblem("Missing data-lm-annotatable teaching-content root.");
const scopeValues = [...contentSource.matchAll(/\bdata-lm-scope=["']([^"']+)["']/gi)].map((match) => match[1].trim()).filter(Boolean);
if (scopeValues.length === 0) contractProblem("Missing stable data-lm-scope block identifiers.");
if (new Set(scopeValues).size !== scopeValues.length) contractProblem("data-lm-scope values must be unique within the lesson.");
if (!/\bannotationSummary\b/.test(contentSource) || !/LearnMapAnnotations\.getSummary\s*\(/.test(contentSource)) contractProblem("Learning record must export annotationSummary from LearnMapAnnotations.getSummary().");

function functionSegment(name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(contentSource);
  if (!match) return null;
  const openIndex = contentSource.indexOf("{", match.index + match[0].length);
  if (openIndex < 0) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openIndex; index < contentSource.length; index += 1) {
    const character = contentSource[index];
    const nextCharacter = contentSource[index + 1];
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
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}" && --depth === 0) {
      return contentSource.slice(match.index, index + 1);
    }
  }
  return null;
}

const resetProgressSegment = functionSegment("resetLearningProgress");
const resetAllSegment = functionSegment("resetAll");
if (!resetProgressSegment) contractProblem("Missing resetLearningProgress() practice-only reset API.");
if (!resetAllSegment) contractProblem("Missing resetAll() compatibility alias.");
else if (!/resetLearningProgress\s*\(/.test(resetAllSegment)) contractProblem("resetAll() must delegate to resetLearningProgress().");
for (const [name, segment] of [["resetLearningProgress", resetProgressSegment], ["resetAll", resetAllSegment]]) {
  if (segment && /clearLessonAnnotations|LearnMapAnnotations\s*\.\s*clear|indexedDB\s*\.\s*deleteDatabase/i.test(segment)) {
    contractProblem(`${name}() must not clear annotations or notes.`);
  }
}

const runtimeApis = ["window.LearnMapAnnotations", "getSummary", "clearLessonAnnotations", "exportPackage", "importPackage", "exportMarkdown"];
if (canonicalRuntime) runtimeApis.forEach((token) => {
  if (!canonicalRuntime.js.includes(token)) contractProblem(`Canonical runtime is missing API token: ${token}`);
});
const runtimeV2Tokens = [
  "lm-note-editor-popover",
  "lm-notes-manager",
  "lm-note-hit",
  "lm-note-copy",
  "lm-note-format-bold",
  "lm-note-format-italic",
  "lm-note-format-underline",
  "lm-note-format-ordered-list",
  "lm-note-format-unordered-list",
  "lm-note-image-add",
  "lm-note-options-toggle",
  "customColor",
  "surfaceColor"
];
if (canonicalRuntime) runtimeV2Tokens.forEach((token) => {
  if (!canonicalRuntime.js.includes(token) && !canonicalRuntime.block.includes(token)) contractProblem(`Canonical runtime v2 is missing contract token: ${token}`);
});
if (/class=["'][^"']*\blm-drawer\b/i.test(contentSource)) contractProblem("Lesson content must not add a note side drawer.");

const quizTags = [...contentSource.matchAll(/<[^>]*class=["'][^"']*\bmini-quiz\b[^"']*["'][^>]*>/gi)].map((match) => match[0]);
const quizCount = quizTags.length;
const reviewTargets = quizTags.flatMap((tag) => tag.match(/data-review-target=["']#([^"']+)["']/i)?.[1] || []).filter(Boolean);
const ids = new Set([...contentSource.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]));
if (quizCount < 2 || quizCount > 4) contractProblem(`Expected 2-4 mini quizzes; found ${quizCount}.`);
if (reviewTargets.length !== quizCount) contractProblem("Every mini quiz must have one data-review-target.");
reviewTargets.forEach((target) => {
  if (!ids.has(target)) contractProblem(`Review target does not exist: #${target}`);
});
if (!/复习\s*→|Review\s*→/i.test(contentSource)) contractProblem("Missing visible Review / 复习 control.");

const checkItems = [...contentSource.matchAll(/class=["'][^"']*\bcheck-item\b[^"']*["']/gi)];
if (checkItems.length === 0) contractProblem("Missing self-check checklist items.");
else checkItems.forEach((item, index) => {
  const nextIndex = checkItems[index + 1]?.index ?? contentSource.length;
  const segment = contentSource.slice(item.index, Math.min(nextIndex, item.index + 1500));
  const review = segment.match(/class=["'][^"']*\breview-link\b[^"']*["'][^>]*href=["']#([^"']+)["']/i);
  if (!review) contractProblem(`Checklist item ${index + 1} is missing a same-page review link.`);
  else if (!ids.has(review[1])) contractProblem(`Checklist review target does not exist: #${review[1]}`);
});

const interactionSelectors = {
  toc: /class=["'][^"']*\btoc\b/i,
  expander: /class=["'][^"']*\baccordion\b/i,
  annotation: legacyMode ? /class=["'][^"']*\b(?:term-hint|annotate)\b/i : /class=["'][^"']*\bterm-hint\b/i,
  tooltip: /class=["'][^"']*\btooltip\b/i
};
Object.entries(interactionSelectors).forEach(([name, pattern]) => {
  if (!pattern.test(contentSource)) contractProblem(`Missing required ${name} interaction.`);
});

const evidenceValues = [...contentSource.matchAll(/data-quality-evidence=["']([^"']+)["']/gi)].map((match) => match[1]);
const domainInteractiveCount = (contentSource.match(/class=["'][^"']*\bdomain-interactive\b[^"']*["']/gi) || []).length;
if (!legacyMode && coursewareTier === "compact" && checkItems.length < 2) errors.push("Compact tier requires at least 2 checklist items.");
if (!legacyMode && coursewareTier === "standard" && checkItems.length < 3) errors.push("Standard tier requires at least 3 checklist items.");
if (!legacyMode && coursewareTier === "high-quality") {
  if (quizCount < 3) errors.push("High-quality tier requires 3-4 diagnostic quizzes.");
  if (checkItems.length < 4) errors.push("High-quality tier requires at least 4 checklist items.");
  if (!evidenceValues.includes("evidence-map")) errors.push("High-quality tier requires an evidence map.");
  if (evidenceValues.filter((value) => value === "execution-chain").length < 2) errors.push("High-quality tier requires at least 2 execution chains.");
  if (!evidenceValues.includes("tradeoffs")) errors.push("High-quality tier requires tradeoffs and failure boundaries.");
  if (!evidenceValues.includes("extension-path")) errors.push("High-quality tier requires an extension or transfer path.");
  if (domainInteractiveCount < 1) errors.push("High-quality tier requires a domain-specific interactive.");
}

const placeholders = ["[Domain]", "[Lesson Title]", "[Question text]", "[Concept]", "[Correct answer]", "[Explanation text]", "[Check item 1]", "[Progress summary]", "[Command to type in Claude Code]", "[topic-slug]", "lesson-N"];
placeholders.forEach((placeholder) => {
  if (contentSource.includes(placeholder)) errors.push(`Unresolved scaffold placeholder: ${placeholder}`);
});

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
if (inlineScripts.length === 0) errors.push("Missing inline lesson script.");
else inlineScripts.forEach((script, index) => {
  try {
    Function(script);
  } catch (error) {
    errors.push(`Inline script ${index + 1} has invalid JavaScript: ${error.message}`);
  }
});

const result = {
  pass: errors.length === 0,
  file: filePath,
  mode: legacyMode ? "legacy-structure" : "current-contract",
  coursewareTier,
  byteSize: totalBytes,
  contentBytes,
  runtimeBytes,
  totalBytes,
    maxBytes: resolvedContentMax,
    contentMaxBytes: resolvedContentMax,
    runtimeMaxBytes: null,
    totalMaxBytes: null,
    absoluteTotalMaxBytes: null,
  targetBytes: [budget.targetMin, budget.targetMax],
  sha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
  runtimeVersion: runtimeMatches[0]?.[0].match(/version="([^"]+)"/i)?.[1] || null,
  runtimeSha256: runtimeMatches[0]?.[0].match(/sha256="([a-f0-9]{64})"/i)?.[1] || null,
  canonicalRuntimeSha256: canonicalRuntime?.sha256 || null,
  canonicalRuntimeBytes: canonicalRuntime?.bytes || null,
  canonicalRuntimeError,
  courseId,
  contentFingerprint: fingerprint,
  computedContentFingerprint: computedFingerprint?.sha256 || null,
  normalizedTextLength: computedFingerprint?.normalizedTextLength || null,
  annotatableRootCount: (contentSource.match(/\bdata-lm-annotatable(?:\s|=|>)/gi) || []).length,
  scopeCount: scopeValues.length,
  quizCount,
  reviewTargetCount: reviewTargets.length,
  checklistCount: checkItems.length,
  qualityEvidence: evidenceValues,
  domainInteractiveCount,
  warnings,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
