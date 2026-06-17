# LearnMap

<p align="center">
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/">
    <img src="docs/assets/learnmap-cover.png" alt="LearnMap cover" width="960">
  </a>
</p>

<p align="center">
  <a href="https://github.com/lwbscu/ai-10x-learning-coach"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html"><img alt="60s Demo" src="https://img.shields.io/badge/60s-Demo-0ea5e9?style=for-the-badge&logo=html5&logoColor=white"></a>
  <a href="README.en.md"><img alt="Documentation" src="https://img.shields.io/badge/Documentation-English-7c3aed?style=for-the-badge&logo=readthedocs&logoColor=white"></a>
  <a href="README.cn.md"><img alt="Chinese Documentation" src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-%E6%96%87%E6%A1%A3-c63c3c?style=for-the-badge"></a>
  <a href="https://mp.weixin.qq.com/s/OsIiHKvV8h0e9URDjRBJnw?scene=1&amp;click_id=669507184"><img alt="WeChat" src="https://img.shields.io/badge/WeChat-%E5%BE%AE%E4%BF%A1-07c160?style=for-the-badge&logo=wechat&logoColor=white"></a>
  <a href="https://zhuanlan.zhihu.com/p/2044006519017035140"><img alt="Zhihu" src="https://img.shields.io/badge/Zhihu-%E4%B8%93%E6%A0%8F-1772f6?style=for-the-badge&logo=zhihu&logoColor=white"></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/License-MIT-64748b?style=for-the-badge"></a>
  <a href="https://skills.sh"><img alt="Agent Skill Compatible" src="https://img.shields.io/badge/Agent%20Skill-Compatible-22c55e?style=for-the-badge"></a>
  <img alt="Version 2.5" src="https://img.shields.io/badge/version-2.5-38bdf8?style=for-the-badge">
  <a href="README.en.md"><img alt="Language English" src="https://img.shields.io/badge/lang-English-0284c7?style=for-the-badge"></a>
  <a href="README.cn.md"><img alt="Language Simplified Chinese" src="https://img.shields.io/badge/%E8%AF%AD%E8%A8%80-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-c63c3c?style=for-the-badge"></a>
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
