#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let fileArg = null;
let maxBytes = 96 * 1024;
let legacyMode = false;

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--max-bytes") {
    maxBytes = Number(args[index + 1]);
    index += 1;
  } else if (args[index] === "--legacy") {
    legacyMode = true;
  } else if (!args[index].startsWith("--") && !fileArg) {
    fileArg = args[index];
  }
}

if (!fileArg || !Number.isFinite(maxBytes) || maxBytes <= 0) {
  console.error("Usage: node scripts/validate-courseware.mjs <html-path> [--max-bytes 98304] [--legacy]");
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

if (byteSize === 0) errors.push("HTML file is empty.");
if (byteSize > maxBytes) errors.push(`HTML exceeds the ${maxBytes}-byte ceiling.`);
if (byteSize < 8 * 1024) warnings.push("HTML is smaller than 8 KiB; check for truncated or overly thin content.");
if (!/<!doctype\s+html/i.test(source)) errors.push("Missing <!DOCTYPE html>.");
if (!/<\/html>\s*$/i.test(source.trim())) errors.push("Missing closing </html>.");

const requiredTokens = [
  "localStorage",
  "data-review-target",
  "outputMode",
  "htmlPlan",
  "deliveryMode",
  "nextCommand"
];
requiredTokens.forEach((token) => {
  if (!source.includes(token)) contractProblem(`Missing required token: ${token}`);
});

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
  byteSize,
  maxBytes,
  sha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
  quizCount,
  reviewTargetCount: reviewTargets.length,
  checklistCount: checkItems.length,
  warnings,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
