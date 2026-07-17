#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const evalRoot = path.join(repoRoot, ".skill-evals");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const replayDir = process.env.CLAUDE_FORWARD_REPLAY_DIR ? path.resolve(process.env.CLAUDE_FORWARD_REPLAY_DIR) : null;
const runDir = replayDir || path.join(evalRoot, `claude-forward-${stamp}`);
const workspace = path.join(runDir, "workspace");
const lessonPath = path.join(workspace, "lesson.html");
const tracePath = path.join(runDir, "trace.ndjson");
const reportPath = path.join(runDir, "report.json");
const timeoutMs = Number.parseInt(process.env.CLAUDE_FORWARD_TIMEOUT_MS || "1200000", 10);
const expectedModel = process.env.CLAUDE_FORWARD_EXPECTED_MODEL || "deepseek-v4-pro[1m]";

function claudeExecutable() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"
    );
  }
  return "claude";
}

function collectToolUses(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (value.type === "tool_use" && typeof value.name === "string") output.push(value);
  for (const nested of Object.values(value)) collectToolUses(nested, output);
  return output;
}

function collectModelNames(value, output = new Set()) {
  if (!value || typeof value !== "object") return output;
  for (const [key, nested] of Object.entries(value)) {
    if (/model/i.test(key) && typeof nested === "string" && nested.length < 120) output.add(nested);
    else collectModelNames(nested, output);
  }
  return output;
}

function normalizeProviderModel(model) {
  return typeof model === "string" ? model.replace(/\[[^\]]+\]$/u, "").toLowerCase() : null;
}

function parseTrace(raw) {
  const events = [];
  const invalidLines = [];
  for (const line of raw.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      invalidLines.push(line.slice(0, 200));
    }
  }
  const toolUses = events.flatMap((event) => collectToolUses(event));
  const dispatches = toolUses.filter((tool) => /^(agent|task)$/i.test(tool.name));
  const uniqueDispatches = [...new Map(dispatches.map((tool) => [tool.id || JSON.stringify(tool.input), tool])).values()];
  const modelNames = [...events.reduce((set, event) => collectModelNames(event, set), new Set())];
  const initEvent = events.find((event) => event?.type === "system" && event?.subtype === "init");
  const leaderTraceModel = typeof initEvent?.model === "string" ? initEvent.model : null;
  const topLevelAssistantModels = [...new Set(events
    .filter((event) => event?.type === "assistant" && !event?.parent_tool_use_id)
    .map((event) => event?.message?.model)
    .filter((model) => typeof model === "string"))];
  return {
    events,
    invalidLines,
    toolUses,
    dispatches: uniqueDispatches,
    modelNames,
    leaderTraceModel,
    topLevelAssistantModels
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs || timeoutMs);
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      if (options.stdoutPath) fs.appendFileSync(options.stdoutPath, text, "utf8");
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

fs.mkdirSync(workspace, { recursive: true });
const prompt = [
  "Use the globally installed /learnmap skill to generate a real LearnMap lesson.",
  `Write exactly one final HTML file to ${lessonPath}.`,
  "Use this explicit profile without asking calibration questions: Chinese, zero-basis, fast, single-overview, high-quality, batch delivery.",
  "Topic: JavaScript event loop fundamentals. Do not infer identity, deadline, competition, or prior experience beyond zero-basis.",
  "This is a non-simple generation. Dispatch all five required specialist agents, wait for every result, then integrate and validate the HTML.",
  "Keep each specialist assignment narrowly scoped and concise. Use stable built-in knowledge; do not perform web research for this forward test.",
  "The lesson must use canonical LearnMap annotation runtime v2: no note side drawer, compact toolbar, anchored note editor, note icons that expand/collapse, floating notes manager, custom mark/note colors, white default note surface, text and image notes with copy support.",
  "Run the skill injector and high-quality validator before finishing. Return a terse status after the file passes."
].join("\n");

const cleanEnv = { ...process.env };
delete cleanEnv.NODE_TLS_REJECT_UNAUTHORIZED;
const claude = claudeExecutable();
const args = [
  "-p", prompt,
  "--output-format", "stream-json",
  "--verbose",
  "--permission-mode", "bypassPermissions",
  "--dangerously-skip-permissions",
  "--no-session-persistence"
];

let report;
try {
  let result;
  if (replayDir) {
    result = { code: 0, stdout: fs.readFileSync(tracePath, "utf8"), stderr: "", timedOut: false };
  } else {
    fs.writeFileSync(tracePath, "", "utf8");
    result = await run(claude, args, { cwd: workspace, env: cleanEnv, stdoutPath: tracePath });
  }
  const parsed = parseTrace(result.stdout);
  const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/u, ""));
  const mainModel = settings?.env?.ANTHROPIC_MODEL || null;
  const subagentModel = settings?.env?.CLAUDE_CODE_SUBAGENT_MODEL || null;
  const validation = fs.existsSync(lessonPath)
    ? await run(process.execPath, [path.join(repoRoot, "scripts", "validate-courseware.mjs"), lessonPath, "--tier", "high-quality"], { cwd: repoRoot, env: cleanEnv, timeoutMs: 120000 })
    : { code: 1, stdout: "", stderr: "lesson.html was not generated" };
  const errors = [];
  if (result.timedOut) errors.push(`Claude Code timed out after ${timeoutMs} ms.`);
  if (result.code !== 0) errors.push(`Claude Code exited with ${result.code}.`);
  if (parsed.invalidLines.length) errors.push(`Trace contained ${parsed.invalidLines.length} non-JSON line(s).`);
  if (parsed.dispatches.length < 5) errors.push(`Expected at least 5 Agent/Task dispatches; found ${parsed.dispatches.length}.`);
  if (mainModel !== expectedModel) errors.push(`Leader model is ${mainModel || "unset"}; expected ${expectedModel}.`);
  if (subagentModel !== expectedModel) errors.push(`Subagent model is ${subagentModel || "unset"}; expected ${expectedModel}.`);
  if (parsed.leaderTraceModel?.toLowerCase() !== expectedModel.toLowerCase()) {
    errors.push(`Stream init reports leader model ${parsed.leaderTraceModel || "unset"}; expected ${expectedModel}.`);
  }
  if (!parsed.topLevelAssistantModels.some((model) => normalizeProviderModel(model) === normalizeProviderModel(expectedModel))) {
    errors.push(`Top-level assistant events do not confirm provider model ${normalizeProviderModel(expectedModel)}.`);
  }
  if (!fs.existsSync(lessonPath)) errors.push("Claude Code did not generate lesson.html.");
  if (validation.code !== 0) errors.push("Generated lesson failed high-quality validation.");
  report = {
    pass: errors.length === 0,
    replayed: Boolean(replayDir),
    expectedModel,
    configuredModels: { leader: mainModel, subagent: subagentModel },
    traceLeaderModel: parsed.leaderTraceModel,
    topLevelAssistantModels: parsed.topLevelAssistantModels,
    traceModels: parsed.modelNames,
    dispatchCount: parsed.dispatches.length,
    dispatches: parsed.dispatches.map((tool) => ({ id: tool.id || null, name: tool.name, subagentType: tool.input?.subagent_type || null })),
    generatedLesson: fs.existsSync(lessonPath) ? lessonPath : null,
    validation: { code: validation.code, stdout: validation.stdout.trim(), stderr: validation.stderr.trim() },
    claudeStderr: result.stderr.trim(),
    tracePath,
    traceNotice: "Raw trace is stored only under ignored .skill-evals and may contain generated task context.",
    errors
  };
} catch (error) {
  report = { pass: false, expectedModel, tracePath, errors: [error.message] };
}

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
if (!report.pass) process.exitCode = 1;
