# AI 10x Learning Coach

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-38bdf8)](https://claude.com/claude-code)
[![Version](https://img.shields.io/badge/version-2.0-a78bfa)]()

**Turn Claude Code/Codex into a patient, adaptive domain tutor.**

> Not a passive Q&A bot — a "10x learning" coach that draws knowledge maps, generates interactive HTML lessons chapter by chapter, checks mastery, logs mistakes, and re-teaches weak spots.

📖 [中文文档](README.cn.md) | [English Docs](README.en.md)

---

## What Is This?

`ai-10x-learning-coach` is a Claude Code Skill that codifies the workflow distilled from [How to Use Claude Code for 10x Learning](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ) into a reusable set of AI behavior rules.

**Core philosophy:** `Global Map → Chapter Teaching → Multi-Perspective → Examples → Mastery Check → Mistake Log → Re-teach Weak Spots`

---

## Use Cases

| Scenario | Deliverables |
|----------|-------------|
| 🆕 **Rapid domain onboarding** | Concept map + learning path + interactive HTML lessons + mastery quizzes |
| 🏗️ **Project delivery** | Decision checklist + risk assessment + implementation roadmap |
| 📝 **Exam / Interview prep** | Knowledge map + flashcards + graded mock questions |
| ✍️ **Blog / Writing** | Outline + analogy library + example set + concept relationship diagram |
| 💻 **Codebase understanding** | Repo map + terminology glossary + walkthrough tasks |

---

## Quick Start

### Installation

**Option 1: User-level install (recommended — available in all projects)**

```bash
# Windows PowerShell
mkdir -p "$env:USERPROFILE\.claude\skills"
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$env:USERPROFILE\.claude\skills\ai-10x-learning-coach"
```

```bash
# macOS / Linux
mkdir -p ~/.claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/ai-10x-learning-coach
```

**Option 2: Project-level install (current project only)**

```bash
mkdir -p .claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git .claude/skills/ai-10x-learning-coach
```

### Usage

In Claude Code, type:

```
Use ai-10x-learning-coach to teach me reinforcement learning
```

Or with more context:

```
Use ai-10x-learning-coach to help me learn MLOps from scratch. I have one week and my goal is to deploy a simple pipeline.
```

### First Interaction

The Skill's first message will ask:

> 🌐 **中文版还是 English version?**

Once you choose, all lesson content, generated learning folder names, note file names, quiz file names, and navigation prompts will be in your chosen language. **Technical terms (MDP, Q-Learning, Bellman equation, etc.) remain in English regardless.**

In Chinese mode, generated learner-facing artifacts use Chinese names such as `第01课-全局地图/笔记.md`, `掌握检查.html`, and `课件.html`. Required repository files such as `SKILL.md`, `README*.md`, `LICENSE`, `agents/openai.yaml`, and `references/*.md` keep their required names.

---

## The Learning Loop (7 Stages)

```
┌──────────────────┐
│ 1. Calibrate      │  ← Background, goal, time budget, language choice
├──────────────────┤
│ 2. Global Map     │  ← 5-9 core modules, dependencies, key terms, learning path
├──────────────────┤
│ 3. Interactive    │  ← One full HTML page per chapter with interactive components
│    HTML Lessons   │
├──────────────────┤
│ 4. Mastery Check  │  ← 2-4 questions per chapter, auto-graded
├──────────────────┤
│ 5. Mistake Log    │  ← Track every misconception, targeted re-test
├──────────────────┤
│ 6. Learning       │  ← Resume anytime without starting over
│    Portfolio      │
└──────────────────┘
```

---

## Interactive HTML Lesson Features (v2.0)

From Lesson 2 onward, each lesson is a self-contained interactive HTML page with these standard features:

### Navigation & Structure
- 🧭 **Sticky top bar** — Breadcrumb trail + lesson title + reset button
- 📑 **Sidebar TOC** — Visible on wide screens (≥1300px), click-to-scroll

### Content Components
- 📦 **Definition boxes** — Blue left-border, key definitions highlighted
- 💡 **Example boxes** — Green left-border, concrete scenario examples
- ⚠️ **Warning callouts** — Yellow tags marking common traps
- 🃏 **Concept tuple cards** — Clickable cards that scroll to detailed explanations
- 🔄 **Agent-Env loop diagrams** — CSS flexbox flow visualization
- 📐 **Formula displays** — Centered, monospace, bordered equation blocks

### Interactive Components
- 🔀 **Multi-perspective tabs** — User / Business / Engineer views, one-click switch
- 📚 **Collapsible accordions** — Click header to expand/collapse deep-dive FAQ
- 🧪 **Learn & Practice mini-quizzes** — Embedded multiple choice, green (correct) / red (wrong) with explanations
  - *Double-click guard* — `_mqAnswered` dictionary prevents content duplication
  - *Scope bug fix* — Uses `section.querySelectorAll` not `tabs.querySelectorAll` for panel queries
- 💬 **Hover annotations** — Dashed underline on key terms, tooltip on hover
- 🎯 **Precise scroll-to-detail** — Manual `getBoundingClientRect` calculation instead of unreliable `scroll-margin-top`

### Bottom Navigation (Anti-Lost)
- 🏁 **End-of-lesson card** — Dashed-border completion card containing:
  - ✅ **Self-check checklist** — Click ☐ → ☑ to mark concepts as mastered
  - 📋 **Next-step command** — Monospace code block, ready to copy-paste back to Claude Code
  - 🔮 **Next lesson preview** — One-line preview of what's coming
- 🔔 **Floating bottom bar** — Slides up from bottom when end-card scrolls into view (`IntersectionObserver`), shows next action

### Design
- 🌙 **Dark theme** — CSS variable-driven, consistent across all lessons
- 🔄 **Global reset** — Top bar button resets all interactive state
- 📱 **Responsive** — Works on desktop and mobile

---

## Lesson Generation Spec

The Skill includes a complete HTML lesson scaffold (see `references/session-artifacts.md`) ensuring consistent style and full functionality across all lessons. Key specifications:

| Spec | Detail |
|------|--------|
| CSS variables | 10 design tokens, unified dark theme |
| JS style | Use `function` keyword and `var`, not arrow functions or `const`/`let` |
| Tab queries | Query `.tab-panel` from parent `section`, not from `.tabs` container |
| Scroll calculation | `getBoundingClientRect().top + pageYOffset - 85` for header offset |
| Quiz guard | `_mqAnswered[quizId]` dictionary for double-click prevention |
| Bottom bar trigger | `IntersectionObserver` with threshold 0.3 |

---

## Learning Workspace Structure

```
learning/<topic-slug>/
├── _meta/
│   ├── profile.md          # Learner profile (background, goal, language)
│   ├── progress.md         # Progress tracking (current lesson, weak spots, next step)
│   └── mistakes.md         # Mistake log (date, concept, wrong understanding, corrected)
├── lesson-01-<slug>/
│   ├── notes.md            # Global map notes
│   └── quiz.html           # Standalone interactive mastery quiz
├── lesson-02-<slug>/
│   └── index.html          # Interactive lesson + embedded quiz
├── lesson-03-<slug>/
│   └── index.html
└── ...
```

Folder and file names follow the chosen language. Chinese mode uses names like `学习/强化学习/第01课-全局地图/笔记.md`, `掌握检查.html`, and `课件.html`; English mode uses the structure shown above. Technical acronyms (MDP, PPO, etc.) remain in English in both modes.

---

## Repository Structure

```
ai-10x-learning-coach/
├── SKILL.md                     # Core Skill instructions (language dispatch + HTML lesson spec)
├── README.md                    # Bilingual landing page
├── README.cn.md                 # Chinese full documentation
├── README.en.md                 # English full documentation (this file)
├── LICENSE                      # MIT
├── agents/
│   └── openai.yaml              # Agent interface metadata
└── references/
    ├── session-artifacts.md     # Workspace templates + complete HTML lesson scaffold
    └── assessment-rubric.md     # Mastery check grading rubric (bilingual)
```

---

## Security

- This Skill contains **zero executable code** — all Markdown instructions + YAML metadata
- No automatic network access
- All learning files are generated in your specified local workspace
- Review `SKILL.md` before installation to verify behavior matches expectations

---

## FAQ

### Q: How is this different from just asking Claude "teach me X"?

Direct prompting typically produces a single large text dump — information without structure. The Skill enforces a complete teaching workflow: map first → chapter-by-chapter → interactive HTML → mastery checks → mistake tracking. You won't be allowed to advance with fuzzy understanding.

### Q: What's the difference between Chinese and English modes?

Language choice affects: UI text, generated folder naming, note file naming, quiz file naming, lesson file naming, and quiz question wording. **Technical terms (MDP, Q-Learning, policy gradient) remain in English in both modes** — ensuring conceptual precision and alignment with the global research community.

### Q: Why start with a global map instead of diving into content?

Cognitive science tells us the brain needs a "framework" to hang new information on before absorbing details. Details without a map are fragmented; with a map, every new concept snaps into place within the larger knowledge structure.

### Q: Why HTML instead of Markdown for lessons?

Interactivity. HTML lessons embed quizzes, collapsible deep-dives, and multi-perspective switching. The learner doesn't just *read* — they *engage*. Markdown is reserved for Lesson 1's map notes and meta files.

---

## Acknowledgments

Inspired by: [How to Use Claude Code for 10x Learning](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ)

---

## License

MIT © [lwbscu](https://github.com/lwbscu)
