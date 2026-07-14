#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let fileArg = null;
let maxBytes = 96 * 1024;
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
    tierOverride = args[index + 1];
    index += 1;
  } else if (!args[index].startsWith("--") && !fileArg) {
    fileArg = args[index];
  }
}

if (!fileArg || !Number.isFinite(maxBytes) || maxBytes <= 0) {
  console.error("Usage: node scripts/validate-courseware.mjs <html-path> [--tier compact|standard|high-quality|custom] [--max-bytes N] [--legacy]");
  process.exit(2);
}

const filePath = path.resolve(fileArg);
const errors = [];
const warnings = [];
const contractProblem = (message) => (legacyMode ? warnings : errors).push(message);

if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
  console.error(JSON.stringify({ pass: false, file: filePath, errors: ["HTML file does not exist."] }, null, 2));
  process.exit(1);
}

const sourceBuffer = fs.readFileSync(filePath);
const source = sourceBuffer.toString("utf8");
const byteSize = sourceBuffer.length;
const tierMatch = source.match(/["']?coursewareTier["']?\s*:\s*["'](compact|standard|high-quality|custom)["']/i);
const embeddedTier = tierMatch?.[1]?.toLowerCase() || null;
const detectedTier = tierOverride || embeddedTier;
const allowedTiers = ["compact", "standard", "high-quality", "custom"];
const coursewareTier = allowedTiers.includes(detectedTier) ? detectedTier : "standard";
if (detectedTier && !allowedTiers.includes(detectedTier)) contractProblem(`Invalid courseware tier: ${detectedTier}.`);
if (tierOverride && embeddedTier && tierOverride !== embeddedTier) contractProblem(`Tier override ${tierOverride} does not match embedded tier ${embeddedTier}.`);
const tierBudgets = {
  compact: { targetMin: 16 * 1024, targetMax: 32 * 1024, hardMax: 40 * 1024 },
  standard: { targetMin: 24 * 1024, targetMax: 60 * 1024, hardMax: 72 * 1024 },
  "high-quality": { targetMin: 48 * 1024, targetMax: 88 * 1024, hardMax: 96 * 1024 },
  custom: { targetMin: 24 * 1024, targetMax: 60 * 1024, hardMax: 96 * 1024 }
};
const tierHardMax = coursewareTier === "custom" && !maxBytesProvided ? 72 * 1024 : tierBudgets[coursewareTier].hardMax;
const resolvedMaxBytes = legacyMode && !detectedTier ? maxBytes : Math.min(maxBytes, tierHardMax);

if (byteSize === 0) errors.push("HTML file is empty.");
if (byteSize > resolvedMaxBytes) errors.push(`HTML exceeds the ${coursewareTier} tier ceiling of ${resolvedMaxBytes} bytes.`);
if (byteSize < 8 * 1024) warnings.push("HTML is smaller than 8 KiB; check for truncated or overly thin content.");
if (byteSize < tierBudgets[coursewareTier].targetMin || byteSize > tierBudgets[coursewareTier].targetMax) {
  warnings.push(`HTML is outside the ${coursewareTier} target range; verify density without adding filler.`);
}
if (!/<!doctype\s+html/i.test(source)) errors.push("Missing <!DOCTYPE html>.");
if (!/<\/html>\s*$/i.test(source.trim())) errors.push("Missing closing </html>.");

const requiredTokens = [
  "localStorage",
  "data-review-target",
  "outputMode",
  "htmlPlan",
  "coursewareTier",
  "coursewareTierInstructions",
  "deliveryMode",
  "nextCommand"
];
requiredTokens.forEach((token) => {
  if (!source.includes(token)) contractProblem(`Missing required token: ${token}`);
});
if (!embeddedTier) contractProblem("Missing or invalid embedded coursewareTier; legacy content normalizes to standard.");

["buildLearningRecord", "copyLearningRecord", "downloadLearningRecord"].forEach((name) => {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(source)) contractProblem(`Missing required function: ${name}`);
});

const quizTags = [...source.matchAll(/<[^>]*class=["'][^"']*\bmini-quiz\b[^"']*["'][^>]*>/gi)].map((match) => match[0]);
const quizCount = quizTags.length;
const reviewTargets = quizTags.flatMap((tag) => {
  const match = tag.match(/data-review-target=["']#([^"']+)["']/i);
  return match ? [match[1]] : [];
});
const ids = new Set([...source.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]));

if (quizCount < 2 || quizCount > 4) contractProblem(`Expected 2-4 mini quizzes; found ${quizCount}.`);
if (reviewTargets.length !== quizCount) contractProblem("Every mini quiz must have one data-review-target.");
reviewTargets.forEach((target) => {
  if (!ids.has(target)) contractProblem(`Review target does not exist: #${target}`);
});
if (!/复习\s*→|Review\s*→/i.test(source)) contractProblem("Missing visible Review / 复习 control.");

const checkItems = [...source.matchAll(/class=["'][^"']*\bcheck-item\b[^"']*["']/gi)];
if (checkItems.length === 0) {
  contractProblem("Missing self-check checklist items.");
} else {
  checkItems.forEach((item, index) => {
    const nextIndex = checkItems[index + 1]?.index ?? source.length;
    const segment = source.slice(item.index, Math.min(nextIndex, item.index + 1500));
    const review = segment.match(/class=["'][^"']*\breview-link\b[^"']*["'][^>]*href=["']#([^"']+)["']/i);
    if (!review) contractProblem(`Checklist item ${index + 1} is missing a same-page review link.`);
    else if (!ids.has(review[1])) contractProblem(`Checklist review target does not exist: #${review[1]}`);
  });
}

const interactionSelectors = {
  toc: /class=["'][^"']*\btoc\b/i,
  expander: /class=["'][^"']*\baccordion\b/i,
  annotation: /class=["'][^"']*\bannotate\b/i,
  tooltip: /class=["'][^"']*\btooltip\b/i
};
Object.entries(interactionSelectors).forEach(([name, pattern]) => {
  if (!pattern.test(source)) contractProblem(`Missing required ${name} interaction.`);
});

const evidenceValues = [...source.matchAll(/data-quality-evidence=["']([^"']+)["']/gi)].map((match) => match[1]);
const domainInteractiveCount = (source.match(/class=["'][^"']*\bdomain-interactive\b[^"']*["']/gi) || []).length;
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

const scaffoldPlaceholders = [
  "[Domain]", "[Lesson Title]", "[Question text]", "[Concept]", "[Correct answer]",
  "[Explanation text]", "[Check item 1]", "[Progress summary]", "[Command to type in Claude Code]",
  "[topic-slug]", "lesson-N"
];
scaffoldPlaceholders.forEach((placeholder) => {
  if (source.includes(placeholder)) errors.push(`Unresolved scaffold placeholder: ${placeholder}`);
});

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
if (inlineScripts.length === 0) {
  errors.push("Missing inline lesson script.");
} else {
  inlineScripts.forEach((script, index) => {
    try {
      Function(script);
    } catch (error) {
      errors.push(`Inline script ${index + 1} has invalid JavaScript: ${error.message}`);
    }
  });
}

const result = {
  pass: errors.length === 0,
  file: filePath,
  mode: legacyMode ? "legacy-structure" : "current-contract",
  coursewareTier,
  byteSize,
  maxBytes: resolvedMaxBytes,
  targetBytes: [tierBudgets[coursewareTier].targetMin, tierBudgets[coursewareTier].targetMax],
  sha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
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
