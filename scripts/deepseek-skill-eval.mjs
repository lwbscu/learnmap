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
      "collects language through clickable choices before teaching",
      "preserves topic/background/deadline",
      "collects HTML courseware scope through choices if not explicit and defaults to slow standard-series",
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
      "creates the global-map lesson first",
      "continues one chapter at a time",
      "preserves mastery checks, mistake log, and exportable learning record"
    ]
  },
  {
    id: "switch-fast-to-slow",
    prompt: "我看完快速总览了，把 MDP 展开成慢速第 2 课。这里是学习记录：{\"schema\":\"ai-10x-learning-record/v1\",\"topic\":\"强化学习\",\"lessonId\":\"fast-overview\",\"language\":\"zh-CN\",\"outputMode\":\"fast\",\"htmlPlan\":\"single-overview\",\"mentorLens\":\"none\",\"weakSpots\":[],\"nextCommand\":\"展开 MDP\"}",
    expected: [
      "reads the fast overview learning record",
      "switches or continues with outputMode slow when requested",
      "updates htmlPlan away from single-overview for the detailed continuation",
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
    prompt: "我完成了第01课，这是 learning-record.json 的内容：{\"schema\":\"ai-10x-learning-record/v1\",\"topic\":\"reinforcement learning\",\"lessonId\":\"lesson-01\",\"language\":\"en\",\"outputMode\":\"slow\",\"htmlPlan\":\"standard-series\",\"mentorLens\":\"none\",\"weakSpots\":[\"mq1\"],\"nextCommand\":\"Continue Lesson 2: MDP\"}。继续下一课。",
    expected: [
      "does not ask language again",
      "preserves outputMode slow",
      "preserves htmlPlan standard-series",
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
      "uses clickable choices or calibration HTML for language and HTML plan",
      "does not ask prose questions like 你的技术背景是什么",
      "does not invent the learner's role, contest, deadline, or prior jailbreak experience",
      "creates the selected HTML courseware with attack surface, defense layers, examples, mastery checks, review jumps, and exportable records",
      "exports both outputMode and htmlPlan"
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
JSON.parse(content);

const outDir = path.join(root, ".skill-evals");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = path.join(outDir, `deepseek-${model}-${stamp}.json`);
fs.writeFileSync(outPath, content + "\n", "utf8");

console.log(outPath);
