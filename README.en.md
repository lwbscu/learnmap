# LearnMap

<p align="center">
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/">
    <img src="docs/assets/learnmap-cover.png" alt="LearnMap cover" width="960">
  </a>
</p>

<p align="center">
  <a href="https://github.com/lwbscu/ai-10x-learning-coach"><img alt="GitHub" src="docs/assets/badges/github.svg"></a>
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html"><img alt="60s Demo" src="docs/assets/badges/demo.svg"></a>
  <a href="README.en.md"><img alt="Documentation" src="docs/assets/badges/docs-en.svg"></a>
  <a href="README.cn.md"><img alt="Chinese Documentation" src="docs/assets/badges/docs-cn.svg"></a>
  <a href="https://mp.weixin.qq.com/s/OsIiHKvV8h0e9URDjRBJnw?scene=1&amp;click_id=669507184"><img alt="WeChat" src="docs/assets/badges/wechat.svg"></a>
  <a href="https://zhuanlan.zhihu.com/p/2044006519017035140"><img alt="Zhihu" src="docs/assets/badges/zhihu.svg"></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License MIT" src="docs/assets/badges/license.svg"></a>
  <a href="https://skills.sh"><img alt="Agent Skill Compatible" src="docs/assets/badges/skill.svg"></a>
  <img alt="Version 2.5" src="docs/assets/badges/version.svg">
  <a href="README.en.md"><img alt="Language English" src="docs/assets/badges/lang-en.svg"></a>
  <a href="README.cn.md"><img alt="Language Simplified Chinese" src="docs/assets/badges/lang-cn.svg"></a>
</p>

**Map first. Learn faster.**

LearnMap is an Agent Skill for turning a vague learning request into mapped, interactive HTML courseware. It supports fast overview mode, slow chapter-by-chapter mode, mastery checks with review jumps back to the exact concept, mistake tracking, optional visual explainers, and optional mentor lenses.

<p align="center">
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html">
    <img src="docs/assets/learnmap-demo-poster.png" alt="Watch the 60-second LearnMap usage walkthrough" width="900">
  </a>
  <br>
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html">Watch the 60-second usage walkthrough</a>
</p>

[Live demo](https://lwbscu.github.io/ai-10x-learning-coach/) · [Usage video](https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html) · [中文文档](README.cn.md)

## Install

Claude Code user-level install:

```bash
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/learnmap-skill
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$env:USERPROFILE\.claude\skills\learnmap-skill"
```

Codex user-level install:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$env:USERPROFILE\.codex\skills\learnmap-skill"
```

Project-level install:

```bash
mkdir -p .claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git .claude/skills/learnmap-skill
```

## Usage

```text
Use learnmap-skill to teach me reinforcement learning. I know Python and want to run a small experiment in one week.
```

```text
Use learnmap-skill in fast overview mode to teach me MLOps.
```

LearnMap asks for language first. If the output mode is not explicit, it asks once and defaults to slow mode.

## What's New

- [2026/06] LearnMap adds fast overview mode, slow deep-course mode, and an embedded recorded usage walkthrough.
- [2026/06] Optional HTML video explainers and mentor lenses are now opt-in learning paths.
- [2026/05] Interactive HTML lessons now export detailed learning records for AI follow-up.

## Two Courseware Modes

| Mode | Best for | Output |
|---|---|---|
| Fast overview | Seeing the whole field quickly | `fast-overview/index.html`, one courseware page with map, examples, traps, checks, and next steps |
| Slow course | Understanding structure and details | `lesson-01-global-map/index.html`, then one interactive lesson per chapter |

## What It Produces

| Scenario | Output |
|---|---|
| Quick whole-picture understanding | One condensed interactive HTML overview |
| Deep domain learning | Global map, learning path, interactive HTML lessons, mastery checks |
| Recover from mistakes | Wrong-answer feedback with a `Review` jump back to the exact section that taught the concept |
| Project preparation | Decision checklist, risk list, implementation route |
| Exam or interview prep | Knowledge map, active-recall prompts, graded questions |
| Codebase learning | Repo map, glossary, walkthrough tasks |
| Visual explanation | Optional HTML motion explainer |
| Mentor-lens learning | Optional lens brief, adapted examples, counterexamples, and boundaries |

## Learning Loop

```text
Calibrate the learner
→ Build a knowledge map
→ Generate interactive HTML courseware
→ Practice and self-check in the page
→ Export a learning record
→ Continue from weak spots
```

## Safety

- The skill itself contains Markdown instructions and YAML metadata only.
- It does not automatically make network requests.
- Learning files are generated in your local workspace.
- Optional video explainers start as HTML previews and do not call external renderers by default.

## Sources

Learning workflow inspired by [How to Use Claude Code for 10x Learning](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ).

The quality gate adapts evaluation ideas from [Darwin Skill](https://github.com/alchaincyf/darwin-skill). The optional mentor-lens workflow adapts cognitive distillation ideas from [Nuwa Skill](https://github.com/alchaincyf/nuwa-skill).

For DeepSeek regression feedback, set `DEEPSEEK_API_KEY` and run `node scripts/deepseek-skill-eval.mjs`. Reports are written to `.skill-evals/` and ignored by git.

MIT © [lwbscu](https://github.com/lwbscu)
