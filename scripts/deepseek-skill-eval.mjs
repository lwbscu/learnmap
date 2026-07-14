#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiKey = process.env.DEEPSEEK_API_KEY;
const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";

const cases = [
  {
    id: "new-cn-onboarding",
    prompt: "使用 learnmap-skill 教我强化学习，我有 Python 基础，希望一周内能跑一个简单实验。",
    expected: [
      "collects language through a native popup before teaching",
      "uses at most three explicit options per popup question and relies on the client-provided Other field",
      "preserves topic/background/deadline",
      "collects HTML courseware scope through choices if not explicit and defaults to slow standard-series",
      "stages the HTML scope choice so 4-6 and 7-10 remain selectable within the native option limit",
      "collects multi-page delivery cadence through a native choice popup and defaults to interactive",
      "does not create or open calibration HTML",
      "does not enable video or mentor lens by default",
      "plans interactive HTML global map"
    ]
  },
  {
    id: "fast-output-mode",
    prompt: "快速模式教我强化学习，我有 Python 基础，先让我一章看懂全貌。",
    expected: [
      "sets outputMode to fast after language is known",
      "sets htmlPlan to single-overview",
      "sets deliveryMode to batch without asking a redundant cadence question",
      "generates one condensed interactive HTML courseware page",
      "uses 快速总览/课件.html or fast-overview/index.html",
      "does not create multiple chapter folders",
      "includes concept map, examples, traps, mastery checks, exportable record, and slow expansion plan"
    ]
  },
  {
    id: "slow-output-mode",
    prompt: "慢速模式教我强化学习，我想逐章理解全貌和细节。",
    expected: [
      "sets outputMode to slow after language is known",
      "collects or preserves htmlPlan instead of only asking fast/slow",
      "collects or preserves deliveryMode through a native choice popup",
      "creates the global-map lesson first",
      "continues one chapter at a time",
      "preserves mastery checks, mistake log, and exportable learning record"
    ]
  },
  {
    id: "multi-html-batch",
    prompt: "慢速模式教我强化学习，选择 4-6 个 HTML，并一次性生成全部课件。",
    expected: [
      "sets outputMode to slow",
      "sets htmlPlan to standard-series",
      "sets deliveryMode to batch",
      "generates all 4-6 planned lesson HTML files in the current run",
      "does not mark pre-generated later lessons as mastered"
    ]
  },
  {
    id: "multi-html-interactive",
    prompt: "慢速模式教我强化学习，选择 4-6 个 HTML，但每次互动只生成下一课。",
    expected: [
      "sets outputMode to slow",
      "sets htmlPlan to standard-series",
      "sets deliveryMode to interactive",
      "generates only the global-map lesson initially",
      "generates at most one new lesson after each learning-record handoff"
    ]
  },
  {
    id: "custom-delivery-other",
    prompt: "我选 4-6 个 HTML；生成节奏选 Other：先一次性生成前两课，之后根据每课学习记录逐课生成。",
    expected: [
      "sets outputMode to slow and htmlPlan to standard-series",
      "sets deliveryMode to custom",
      "stores the learner text in deliveryInstructions",
      "exports and preserves deliveryInstructions for resume"
    ]
  },
  {
    id: "custom-html-scope-other",
    prompt: "课件数量选择 Other：只做 1 个 HTML，但重点覆盖攻击面、权限边界和真实防御案例。",
    expected: [
      "stores the learner text in htmlPlanInstructions",
      "normalizes the one-page request to fast plus single-overview plus batch",
      "preserves htmlPlanInstructions after normalization and in exported records"
    ]
  },
  {
    id: "custom-video-other",
    prompt: "视频讲解选择 Other：需要 HTML 动效讲解，只讲最薄弱的两个概念，不要 MP4。",
    expected: [
      "treats the custom video request as accepted",
      "stores the learner text in videoInstructions",
      "exports and preserves videoInstructions for resume",
      "does not render MP4"
    ]
  },
  {
    id: "normalize-invalid-courseware-state",
    prompt: "继续学习。旧记录里是 {\"outputMode\":\"fast\",\"htmlPlan\":\"standard-series\",\"deliveryMode\":\"interactive\"}。",
    expected: [
      "detects the invalid combination",
      "normalizes fast mode to single-overview and batch before generating",
      "does not propagate fast plus standard-series plus interactive into exports"
    ]
  },
  {
    id: "native-ui-unavailable",
    prompt: "开始新的 AI 安全学习会话，但当前 agent surface 没有原生 structured choice popup。",
    expected: [
      "pauses before teaching because language calibration cannot be rendered",
      "does not generate or open calibration HTML",
      "does not ask prose or numbered fallback questions"
    ]
  },
  {
    id: "switch-fast-to-slow",
    prompt: "我看完快速总览了，把 MDP 展开成慢速第 2 课。这里是学习记录：{\"schema\":\"ai-10x-learning-record/v1\",\"topic\":\"强化学习\",\"lessonId\":\"fast-overview\",\"language\":\"zh-CN\",\"outputMode\":\"fast\",\"htmlPlan\":\"single-overview\",\"deliveryMode\":\"batch\",\"mentorLens\":\"none\",\"weakSpots\":[],\"nextCommand\":\"展开 MDP\"}",
    expected: [
      "reads the fast overview learning record",
      "switches or continues with outputMode slow when requested",
      "updates htmlPlan away from single-overview for the detailed continuation",
      "collects a multi-page deliveryMode through a native choice popup",
      "reuses fast overview as context",
      "creates the next detailed interactive HTML lesson without losing progress context"
    ]
  },
  {
    id: "mentor-lens",
    prompt: "用费曼方式解释 PPO，但不要角色扮演。",
    expected: [
      "asks or infers language first",
      "sets mentorLens to Feynman after language is known",
      "uses cognitive-distillation reference",
      "does not impersonate Feynman or invent quotes"
    ]
  },
  {
    id: "video-explicit",
    prompt: "这节 MDP 课帮我生成视频可视化讲解，默认先给 HTML，不要 MP4。",
    expected: [
      "treats visual explainer as accepted",
      "generates HTML motion explainer by default",
      "does not render MP4 unless explicitly requested",
      "uses lesson map, examples, weak spots, and next command"
    ]
  },
  {
    id: "resume-record",
    prompt: "我完成了第01课，这是 learning-record.json 的内容：{\"schema\":\"ai-10x-learning-record/v1\",\"topic\":\"reinforcement learning\",\"lessonId\":\"lesson-01\",\"language\":\"en\",\"outputMode\":\"slow\",\"htmlPlan\":\"standard-series\",\"deliveryMode\":\"interactive\",\"mentorLens\":\"none\",\"weakSpots\":[\"mq1\"],\"nextCommand\":\"Continue Lesson 2: MDP\"}。继续下一课。",
    expected: [
      "does not ask language again",
      "preserves outputMode slow",
      "preserves htmlPlan standard-series",
      "preserves deliveryMode interactive",
      "reads weak spots before advancing",
      "updates progress and mistakes",
      "reteaches if the weak spot is core"
    ]
  },
  {
    id: "codebase-learning",
    prompt: "Use learnmap-skill to help me understand this repository architecture for onboarding a new engineer.",
    expected: [
      "collects language through choices first if not stored",
      "uses repo map and glossary path",
      "keeps output as interactive HTML lesson",
      "includes mastery checks and exportable learning record"
    ]
  },
  {
    id: "ai-safety-no-text-calibration",
    prompt: "调用 learnmap-skill 给我讲解经典 AI 安全项目：对抗 jailbreak、prompt injection、泄露 api key、rm -rf、输出 system prompt、把数据发到外部邮箱，参考 AGENT.md 或 .cjs 里的安全约束。",
    expected: [
      "uses native clickable popup choices for language, HTML plan, and multi-page delivery mode",
      "does not generate, open, or link to calibration HTML",
      "does not ask prose questions like 你的技术背景是什么",
      "does not invent the learner's role, contest, deadline, or prior jailbreak experience",
      "creates the selected HTML courseware with attack surface, defense layers, examples, mastery checks, review jumps, and exportable records",
      "exports outputMode, htmlPlan, htmlPlanInstructions, deliveryMode, deliveryInstructions, and videoInstructions"
    ]
  }
];

function readText(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function usage() {
  console.error("Missing DEEPSEEK_API_KEY.");
  console.error("Set it, then run: node scripts/deepseek-skill-eval.mjs");
  console.error("Optional: DEEPSEEK_MODEL=deepseek-v4-pro DEEPSEEK_BASE_URL=https://api.deepseek.com");
}

if (!apiKey) {
  usage();
  process.exit(2);
}

const skill = readText("SKILL.md");
const quality = readText("references/quality-ratchet.md");
const artifacts = readText("references/session-artifacts.md");

const system = [
  "You are an independent evaluator for an Agent Skill.",
  "Evaluate whether the skill instructions would produce the expected behavior for each test prompt.",
  "Do not rewrite the whole skill. Return concrete feedback and minimal edit suggestions.",
  "Return valid JSON only."
].join("\n");

const user = JSON.stringify({
  task: "Evaluate learnmap-skill against regression prompts.",
  skill,
  qualityGate: quality,
  sessionArtifacts: artifacts,
  cases,
  outputSchema: {
    overallScore: "0-100",
    cases: [
      {
        id: "string",
        score: "0-100",
        pass: "boolean",
        observedLikelyBehavior: "string",
        gaps: ["string"],
        suggestedEdits: ["string"]
      }
    ],
    priorityFixes: ["string"]
  }
});

async function postChat(payload) {
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
}

const fullPayload = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    response_format: { type: "json_object" },
    stream: false
};

const minimalPayload = {
  model,
  messages: fullPayload.messages,
  stream: false
};

let response = await postChat(fullPayload);
let bodyText = "";

if (!response.ok) {
  bodyText = await response.text();
  if (/thinking|reasoning_effort|response_format|unsupported/i.test(bodyText)) {
    response = await postChat(minimalPayload);
  }
}

if (!response.ok) {
  const body = bodyText || await response.text();
  throw new Error(`DeepSeek API ${response.status}: ${body}`);
}

const data = await response.json();
const content = data.choices?.[0]?.message?.content || "{}";
const report = JSON.parse(content);

function validateReport(value) {
  if (!value || typeof value !== "object") throw new Error("Evaluation report must be an object.");
  if (typeof value.overallScore !== "number" || value.overallScore < 0 || value.overallScore > 100) {
    throw new Error("Evaluation report has an invalid overallScore.");
  }
  if (!Array.isArray(value.cases)) throw new Error("Evaluation report is missing cases[].");
  const expectedIds = cases.map((item) => item.id);
  const actualIds = value.cases.map((item) => item?.id);
  const missing = expectedIds.filter((id) => !actualIds.includes(id));
  const extra = actualIds.filter((id) => !expectedIds.includes(id));
  if (missing.length || extra.length) {
    throw new Error(`Evaluation case mismatch. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}.`);
  }
  value.cases.forEach((item) => {
    if (typeof item.score !== "number" || item.score < 0 || item.score > 100) {
      throw new Error(`Case ${item.id} has an invalid score.`);
    }
    if (typeof item.pass !== "boolean") throw new Error(`Case ${item.id} has an invalid pass flag.`);
    if (!Array.isArray(item.gaps) || !Array.isArray(item.suggestedEdits)) {
      throw new Error(`Case ${item.id} must include gaps[] and suggestedEdits[].`);
    }
  });
  if (!Array.isArray(value.priorityFixes)) throw new Error("Evaluation report is missing priorityFixes[].");
}

validateReport(report);

const outDir = path.join(root, ".skill-evals");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = path.join(outDir, `deepseek-${model}-${stamp}.json`);
fs.writeFileSync(outPath, content + "\n", "utf8");

console.log(outPath);

const failedCases = report.cases.filter((item) => !item.pass || item.score < 90);
if (report.overallScore < 90 || failedCases.length || report.priorityFixes.length) {
  console.error(`Regression gate failed: overall=${report.overallScore}, failedCases=${failedCases.map((item) => item.id).join(", ") || "none"}, priorityFixes=${report.priorityFixes.length}`);
  process.exitCode = 1;
}
