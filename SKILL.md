---
name: learnmap-skill
description: Map-first personalized learning skill for Claude Code/Codex. Use when the user wants to learn an unfamiliar domain, turn articles/docs/repos into a curriculum, choose HTML count plus compact/standard/high-quality courseware through native popup calibration, choose batch or multi-turn delivery, receive interactive HTML teaching with portable underlines and image-rich notes, create concept maps, run mastery quizzes and review links, optionally create visual explainers or use a named mentor lens, or use an agent tutor that adapts to stated background and mistakes.
---

# LearnMap

## Step 0 — Language Selection (MANDATORY)

**Before any new teaching begins, you MUST know the learner's language.**

For a new learning session, collect the language with a clickable choice UI, not a plain text question. Pass `中文版` and `English` as the two explicit options; require the native client's injected free-text `Other`.

Prompt copy:

> **请选择教学语言 / Please choose your teaching language**
> All lesson content, quizzes, folder names, and prompts will use the selected language. Technical terms such as "MDP", "Q-Learning", and "policy gradient" stay in English when that is clearer.

Use the current agent surface's native structured choice tool (for example, `request_user_input`) so the choices render as an in-dialog popup. Do not generate or open a local calibration HTML page, and do not replace the popup with prose or a numbered chat list. If the current surface cannot display native choices, state that calibration requires a surface with native choice UI and pause before teaching.

If the learner is resuming and a profile/progress file or exported learning record already contains `language`, use that stored language and do not ask again.

If the first user message already contains topic, background, deadline, video request, or mentor-lens request, preserve those details as pending context while asking the language question. After the language is chosen, continue from the preserved context instead of asking the same questions again.

Once the learner chooses:

| Choice | Output Language | Workspace Root | Meta Folder | Lesson Folder Pattern | Lesson HTML |
|--------|----------------|----------------|-------------|----------------------|-------------|
| 中文 | Chinese (Simplified) | `学习/<主题>/` | `元数据/` | `第01课-中文简称/` | `课件.html` |
| English | English | `learning/<topic-slug>/` | `_meta/` | `lesson-01-english-slug/` | `index.html` |

**CRITICAL**: In Chinese mode, all generated learner-facing artifacts MUST use Chinese names: lesson folders, lesson HTML files, UI text, quiz questions, feedback messages, and navigation prompts. Keep only repository/skill functional files in their required names: `SKILL.md`, `README.md`, `README.cn.md`, `README.en.md`, `LICENSE`, `agents/openai.yaml`, and `references/*.md`. Technical domain terms (MDP, Q-Learning, PPO, Bellman equation, etc.) remain in English.

**Learner-facing lesson content is HTML-only from Lesson 1.** Do not create course reading files such as `笔记.md`, `notes.md`, standalone `掌握检查.html`, or standalone `quiz.html` by default. Keep Markdown only for agent-maintained metadata files such as `学习档案.md`, `学习进度.md`, and `错题记录.md` (or English `_meta/*.md`).

Record the language choice in the language-specific profile file: `元数据/学习档案.md` for Chinese mode, `_meta/profile.md` for English mode.

Also initialize `videoExplainer: offered | accepted | declined` and `videoInstructions: null | <learner text>` in the profile/progress files once video is offered. Store custom `Other` requirements in `videoInstructions`; otherwise keep it `null`.

Also initialize `mentorLens: none | <lens-name>` in the profile/progress files. Keep it as `none` unless the learner explicitly asks for a named thinker, expert, or domain framework lens.

Also initialize `outputMode: fast | slow` in the profile/progress files. Use `slow` by default unless the learner explicitly asks for fast mode, quick overview, one-chapter overview, or similar wording.

Also initialize `htmlPlan: single-overview | compact-series | standard-series | deep-series | custom` and `htmlPlanInstructions: null | <learner text>` in the profile/progress files. Use `standard-series` by default; preserve courseware-scope `Other` text even if normalization later maps the plan to `single-overview`, otherwise store `null`.
Also initialize `deliveryMode: batch | interactive | custom` and `deliveryInstructions: null | <learner text>` in the profile/progress files. `batch` queues the whole multi-HTML plan without mastery waits, but commits it as resumable one-lesson transactions; `interactive` generates one lesson at a time across learner-agent turns; `custom` stores the learner's `Other` text in `deliveryInstructions`. Use `interactive` by default for multi-HTML plans. A `single-overview` is inherently `batch` because it contains only one HTML file.
Also initialize `coursewareTier: compact | standard | high-quality | custom` and `coursewareTierInstructions: null | <learner text>`. It controls per-page density and production quality, not page count or cadence. Use `standard` by default and preserve injected `Other` text.
## Purpose

Turn Claude Code/Codex into a patient domain tutor that helps a learner build conceptual understanding, not just collect notes. Prefer interactive HTML lessons, local learning artifacts, short teaching loops, and mastery checks over long one-shot explanations.

This skill is distilled from the workflow in the article "如何用 Claude Code 开启 10 倍学习法？": use an agent to map a new field, teach one chapter at a time, test understanding, diagnose mistakes, and adapt until the learner can explain the domain in their own words.

## Core Rules

- **Step 0 is mandatory for new sessions.** Always establish language first, before teaching. Reuse stored language when resuming from profile/progress files or exported learning records.
- **Calibration is native-choice-driven.** Do not ask learner-background, goal, output-mode, page-count, courseware-tier, generation-cadence, or video-explainer calibration as prose chat questions. Use only the current agent surface's native clickable choice popup. Every choice group must include `Other` with free text. Never create calibration HTML.
- **Do not invent personalization.** Only write background, role, contest, deadline, prior experience, and constraints that the learner stated or selected. If unknown, store `unknown` and calibrate via choices.
- Start with a global map before details.
- Structure slow-mode learning one module at a time. `deliveryMode: batch` may generate the whole plan without learner waits, but it MUST validate and checkpoint one page before starting the next; mastery still advances separately. In fast mode, compress the map, essentials, examples, traps, and checks into one complete overview page.
- **Generate interactive HTML lessons** as the primary teaching medium (not plain markdown).
- Explain concepts from at least three perspectives when useful: end user, business/operator, implementer/builder.
- Use concrete examples immediately after abstract concepts.
- Embed "learn-and-practice" mini-quizzes inside lessons, not just at the end.
- Persist quizzes/checklists with `localStorage`; inject the canonical annotation runtime v2 for IndexedDB-backed underlines, highlights, anchored floating notes, portable `.learnmap` backup, v1 compatibility, and learning-record summaries.
- Require active recall: make the learner answer, summarize, compare, or apply.
- Do not advance after "I explained it"; advance only after the learner demonstrates understanding.
- Keep a mistake log and use it to adapt future explanations and questions.
- Avoid generating a giant complete textbook. Even with `deliveryMode: batch`, stay within the chosen `htmlPlan`, keep each page focused, and never place multiple lesson HTML files in one provider/tool response.
- Keep interactive HTML lessons as the default teaching artifact. Offer a short video-style visual explainer only once per topic or lesson, and do not generate it unless the learner accepts.
- Keep neutral teaching as the default. Use a mentor lens only when the learner explicitly asks for one, such as "用费曼方式解释 PPO", "explain this like Karpathy", or "use a Munger-style lens".
- When a mentor lens is active, use it to shape explanation structure, examples, questions, and boundaries. Do not role-play as the person, invent quotes, or claim the answer is the person's real view.
- Keep four fields orthogonal: `outputMode` controls fast/slow, `htmlPlan` controls HTML count, `coursewareTier` controls per-page density/quality, and `deliveryMode` controls resumable batch versus multi-turn generation. Default to `slow + standard-series + standard + interactive`.
- Run a lightweight quality gate before finalizing lesson artifacts: verify workflow clarity, failure modes, review links, export data, browser interactions, and 2-3 dry-run prompts.
- **v2.2 review loop:** every self-check checklist item MUST include a review link back to the exact explanation section in the same HTML page. Every mini-quiz MUST include a tested concept and a `复习 / Review` jump target. Wrong-answer feedback MUST render a visible `复习 →` / `Review →` control that jumps back to the exact section that taught the tested concept.

---

## Workflow

### 1. Calibrate The Learner

If the request is vague, collect missing learner context with at most three context choice groups. This limit applies only to topic scope, background, and goal; language, courseware scope, delivery mode, and optional video are separate operational stages. Keep each native popup to at most three choice groups. Do not ask prose questions and do not generate calibration HTML.

Use these groups only for missing fields:

- Topic scope: `系统理解一个领域`, `读懂资料或 repo/codebase`, `为项目/比赛快速上手`
- Learner background: `零基础`, `听说过/了解概念`, `有工具或项目实践`
- Learning goal: `快速建立全貌`, `能动手做项目`, `准备考核或输出分享`

Rely on the native client's injected free-text `Other` for each context question.

If the user already gave enough context, store only the stated facts and proceed. Do not infer unsupported identity, competition, deadline, teammates, or prior experience.

When Step 0 preserved context from the first user message, merge it into calibration:

- topic/background/deadline become profile fields
- explicit fast-mode requests set `outputMode: fast`, `htmlPlan: single-overview`, and `deliveryMode: batch`
- explicit slow-mode or deep-learning requests set `outputMode: slow`
- explicit high-quality/detail requests such as “详细吃透底层”, “完整代码原理”, or “方便二次开发” set `coursewareTier: high-quality`
- explicit video requests set `videoExplainer: accepted`
- explicit mentor-lens requests set `mentorLens: <lens-name>` and route to [cognitive-distillation.md](references/cognitive-distillation.md) after language selection
- do not ask duplicate questions for information already supplied

Choose the courseware scope before creating lesson files:

- If the learner asks for "快速模式", "快速总览", "一章讲完", "quick overview", "fast mode", or a similar compressed overview, set `outputMode: fast`, `htmlPlan: single-overview`, and `deliveryMode: batch`.
- If the learner asks for "慢速模式", "逐章", "深入细节", "deep dive", "slow mode", or a similar progressive course, set `outputMode: slow`; if no page count is explicit, ask the HTML plan choice group once.
- If the learner is expanding from a completed fast overview into slow/deep learning, switch `outputMode: slow` and do not keep `htmlPlan: single-overview`. Ask the HTML plan choice group once; if unanswered, set `htmlPlan: standard-series`.
- If the mode or HTML count is not explicit and no stored profile/progress value exists, use staged native popup choices so no question exceeds three explicit options:
  1. Ask `单页总览：1 个 HTML`, `精简系列：2-3 个 HTML`, or `更多页面：4-10 个 HTML`; the native client also provides `Other`.
  2. Only when the learner selects `更多页面`, ask `标准系列：4-6 个 HTML` or `深度系列：7-10 个 HTML`; the native client also provides `Other`.
  3. Normalize `1` -> `outputMode: fast`, `htmlPlan: single-overview`; `2-3` -> `slow` + `compact-series`; `4-6` -> `slow` + `standard-series`; `7-10` -> `slow` + `deep-series`; `Other` -> `htmlPlan: custom` and store the text in `htmlPlanInstructions`.
- If the learner does not answer the choice group, continue with `outputMode: slow` and `htmlPlan: standard-series`.
- When resuming, use stored `outputMode` and `htmlPlan`; do not ask again unless the learner wants to switch.

Collect `coursewareTier` once for every new session with the native `精简档 / Compact`, `标准档（推荐） / Standard`, and `高质量档 / High-quality` choices; map injected `Other` to `custom` and store its text. Skip this popup when the request explicitly selects a tier. Read [courseware-tiers.md](references/courseware-tiers.md) before generating; a legacy record with no tier defaults to `standard` without rewriting existing pages.

For a multi-HTML plan, collect delivery cadence once with a native clickable choice popup:

- `一次性生成全部课件 / Generate all HTML files now` -> `deliveryMode: batch`
- `分多次互动，逐课生成 / Generate one lesson per interaction` -> `deliveryMode: interactive`

Map the native client's injected `Other` to `deliveryMode: custom` and store its text in `deliveryInstructions`.

Do not ask this group for `htmlPlan: single-overview`; set `deliveryMode: batch`. If a multi-HTML learner does not answer, use `deliveryMode: interactive`. On resume, preserve the stored `deliveryMode` unless the learner asks to change it. For a legacy record with no `deliveryMode`, infer `batch` only when `htmlPlan: single-overview`; otherwise collect the native delivery popup once and persist the answer.

Normalize invalid or legacy combinations before generating or resuming by following the state matrix in [session-artifacts.md](references/session-artifacts.md). Always collapse fast/one-page states to `fast + single-overview + batch`, but never discard learner-entered `Other` text during normalization.

Offer the optional video explainer once during calibration or at the end of a lesson:

Use clickable choices:

- `暂不需要，先生成交互式 HTML 课件`
- `需要 HTML 视频式讲解`

Map the native client's injected `Other` text to `videoInstructions`; treat it as `accepted` unless it clearly declines video. If the learner declines or does not answer, continue with the normal HTML lesson workflow. If the learner accepts, read [video-visualization.md](references/video-visualization.md) and generate the explainer after the current lesson artifact is complete.

Create a learning workspace with **organized per-mode structure**.

Chinese mode MUST use this naming style:

```text
学习/<主题>/
├── 元数据/
│   ├── 学习档案.md          # 学习背景、目标、语言选择
│   ├── 学习进度.md          # 当前课程、测验结果、薄弱点
│   └── 错题记录.md          # 误区与纠正
├── 第01课-全局地图/
│   └── 课件.html            # 全局地图 + 嵌入式掌握检查
├── 第02课-MDP详解/
│   └── 课件.html            # 交互式课件 + 嵌入式测验
├── 第03课-价值函数/
│   └── 课件.html
├── 快速总览/
│   └── 课件.html            # fast mode only: one-chapter overview
├── 视频讲解.html              # optional, only when accepted
├── 思维镜片.md                # optional, only when a mentor lens is requested
└── ...
```

English mode uses this naming style:

```text
learning/<topic-slug>/
├── _meta/
│   ├── profile.md          # Learner background, goal, language choice
│   ├── progress.md         # Current module, quiz results, weak spots
│   └── mistakes.md         # Misconceptions and corrections
├── lesson-01-<slug>/
│   └── index.html          # Global map + embedded mastery check
├── lesson-02-<slug>/
│   └── index.html          # Interactive lesson + embedded quiz
├── lesson-03-<slug>/
│   └── index.html
├── fast-overview/
│   └── index.html          # fast mode only: one-chapter overview
├── video-explainer.html       # optional, only when accepted
├── mentor-lens.md             # optional, only when a mentor lens is requested
└── ...
```

Use [session-artifacts.md](references/session-artifacts.md) for templates.

### 2. Build The Right Courseware Shape

`htmlPlan` controls how many HTML courseware files to create:

- `single-overview`: 1 HTML, compressed whole-picture overview
- `compact-series`: 2-3 HTML files, fast but still progressive
- `standard-series`: 4-6 HTML files, default balance of whole picture and detail
- `deep-series`: 7-10 HTML files, deep course sequence
- `custom`: use the learner's selected or typed scope

If `outputMode: fast` or `htmlPlan: single-overview`, create a single interactive HTML courseware page:

- Chinese mode: `快速总览/课件.html`
- English mode: `fast-overview/index.html`

Fast mode is a complete compressed overview, not a thin summary. It MUST include:

- one-sentence field definition and core question
- global map with 5-9 modules and dependency relationships
- essential vocabulary and what to ignore at the beginning
- core workflow or mental model for the field
- 3-5 high-value examples tied to the map
- common traps and false friends
- embedded mini mastery checks and self-check review links
- a next-step slow-learning plan that can expand any module into chapter-by-chapter lessons
- a learning record export with `outputMode: fast`, `htmlPlan: single-overview`, `deliveryMode: batch`, and the selected `coursewareTier`

Do not create multiple lesson folders in fast mode. Set `deliveryMode: batch` for the single overview. If the learner later asks to go deeper, switch to `outputMode: slow`, ask or default `htmlPlan` to a multi-HTML series (`standard-series` if unanswered), collect `deliveryMode`, and use the fast overview as Lesson 1 context.

If `outputMode: slow`, build the normal global-map lesson first and continue chapter by chapter. Use `htmlPlan` to limit the planned lesson count:

- `compact-series`: global map + 1-2 focused follow-up lessons
- `standard-series`: global map + 3-5 focused follow-up lessons
- `deep-series`: global map + 6-9 focused follow-up lessons
- `custom`: follow the stored custom count/scope

Apply `deliveryMode` after the lesson plan is defined:

- `batch`: queue every HTML file allowed by `htmlPlan` without learner mastery waits, but generate, validate, atomically commit, and checkpoint exactly one lesson at a time. A host or provider disconnect may pause the run; resume at the first uncommitted lesson without rewriting valid pages. Generated pages are not mastered pages.
- `interactive`: generate only the global-map lesson on the first run. After each imported learning record or learner feedback, diagnose weak spots and generate at most one next lesson. Do not pre-create later lesson HTML files.
- `custom`: follow the stored cadence instructions without changing `htmlPlan`.

### 2A. Generate Every HTML Resumably

Before writing any lesson HTML, including a single overview, read and follow [resilient-generation.md](references/resilient-generation.md). Never mark progress generated or pre-create future lesson directories. One provider/tool turn writes at most one `.partial` lesson; inject the canonical annotation runtime, validate it, rename it inside staging, atomically commit the staging directory, then checkpoint. Report teaching/runtime sizes separately, enforce only explicit learner limits, and never treat size alone as quality. On resume, reconcile final files, ignore partial artifacts, and keep generation separate from mastery.

### 2B. Default To Five Subagents When Available

For non-trivial LearnMap generation or regeneration, use a Leader + five-subagent workflow when the host surface supports subagents. Dispatch all five roles before writing lesson HTML and await their conclusions before the HTML commit gate. This improves courseware quality without adding learner-facing calibration questions.

Default five roles:

1. Exploration subagent: source maps, repository/docs reading, concepts, terminology, and learner-request preservation.
2. Content architecture subagent: lesson structure, learning map, examples, diagrams, quizzes, review jumps, and weak-spot continuation.
3. HTML/runtime subagent: courseware shell, interaction scaffolding, annotation runtime injection path, metadata, and export records.
4. Test/browser subagent: validator output, file and localhost browser smoke, screenshot evidence, annotation UX, reset/export behavior, and regression logs.
5. Review subagent: accuracy, omissions, hallucination risk, accessibility, explicit size constraints, and whether the output matches the selected `htmlPlan`, `coursewareTier`, and `deliveryMode`.

Only use fewer than five subagents when the host lacks subagent support, the learner explicitly forbids delegation, or the task is a truly simple one-file/local wording change. Do not require or hard-code a model name. If the surface lets the user choose, recommend a strong reasoning model such as DeepSeek v4 pro or GPT-5.5; otherwise use the best available model. If subagents are unavailable, continue in a single-agent workflow but explicitly run the same five passes before finalizing.

### 2C. Build The Global Map First In Slow Mode

Before teaching details in slow mode, produce a coarse domain map as an interactive HTML lesson:

- Chinese mode: `第01课-全局地图/课件.html`
- English mode: `lesson-01-global-map/index.html`

- what the field is for
- the 5-9 major modules/components
- how the modules relate
- essential vocabulary
- what to ignore at the beginning
- common traps and false friends
- suggested chapter order (with a visual dependency graph)

Then use the HTML page itself to collect active recall: include a short self-check, a "confirm chapter plan" choice group, or a "type your own summary" field. Do not ask this as plain chat text unless no UI path is available.

For Lesson 1, embed a **mastery check section** with 3-4 questions inside the same HTML page. The learner should not need to open a separate quiz file.

### 3. Teach And Assess One Module At A Time (Interactive HTML)

Use this section for slow mode lessons and for any later expansion from fast mode into a deep chapter.

**For every lesson, including Lesson 1, generate one interactive HTML lesson page.** This is the primary delivery format.

Each HTML lesson MUST include:

**Structural requirements:**
- Sticky top navigation bar with breadcrumb trail and lesson title
- Sidebar table-of-contents (visible on screens ≥1300px, hidden on smaller)
- Numbered section cards with clear headings and subtitles
- Dark theme using CSS variables (professional, tech-subject vibe)

**Content components (mix and match as appropriate):**
- **Definition boxes** — left-bordered, distinct background, for key definitions
- **Example boxes** — green-tinted, left-bordered, for concrete examples
- **Warning/trap callouts** — yellow-tinted, for common mistakes
- **Formula displays** — centered, monospace, bordered, for equations
- **Comparison tables** — for A vs B, pros/cons, concept distinctions
- **MDP-style tuple cards** — clickable concept cards that scroll to detailed explanations below
- **Loop/flow diagrams** — CSS flexbox diagrams showing Agent-Environment cycles
- **Accordion sections** — collapsible FAQ/deep-dive sections (click header to expand/collapse)

**Interactive features (REQUIRED in every lesson):**
- **Multi-perspective tabs** — user / business / engineer视角 switching for the same concept
- **Inline mini-quizzes (即学即练 / Learn & Practice)** — embedded multiple-choice questions that highlight green (correct) or red (wrong) with explanatory feedback. Must guard against double-click content duplication (use a `_mqAnswered` dictionary).
- **Term hints** — key terms use neutral `.term-hint` styling and reveal a tooltip; keep them visually distinct from learner-created marks
- **Learner annotations and notes** — read and follow [annotation-notes.md](references/annotation-notes.md); inject the canonical self-contained runtime v2 for underline/highlight marks, three underline styles, default plus custom `#RRGGBB` mark colors, anchored floating editor, floating notes manager, note-icon expand/collapse, default white/pastel note surfaces, custom `#RRGGBB` note surfaces, text/image write-paste-copy flows, honest local save status, orphan recovery, v1 data/package compatibility, and `.learnmap` import/export. Resolve injector and validator scripts from the loaded LearnMap Skill root, not from the learner's project directory. Do not add another calibration question, do not generate long always-expanded annotation toolbars, and never create a note side drawer. Preserve the lesson TOC.
- **MDP card click-to-scroll** — when using concept tuple cards, clicking scrolls to the detail section. Use manual position calculation (`getBoundingClientRect().top + pageYOffset - offset`) instead of `scroll-margin-top` for cross-browser reliability.
- **Learning record persistence** — save quiz results, checklist state, viewed lesson, completion percentage, weak spots, and last updated time to `localStorage` under a stable key such as `ai10x:<topic>:lesson-01`.
- **Detailed diagnostic records** — each mini-quiz MUST expose enough metadata for later AI diagnosis: question text, tested concept, chosen answer, correct answer (when available), correctness, feedback, retry recommendation, and review target.
- **Review targets (v2.2)** — self-check items MUST link to teaching sections with `href="#sX"` or `onclick="scrollToDetail('sX')"`. Every mini-quiz MUST set `data-review-target="#sX"` or an equivalent section id. Wrong-answer feedback MUST include a visible non-answer `复习 →` / `Review →` control that jumps to that target using `scrollToDetail()` or an anchor link.
- **AI handoff actions** — include buttons to copy a detailed Markdown learning report to clipboard and to download a JSON record. Chinese mode downloads `学习记录.json`; English mode downloads `learning-record.json`.

**Bottom-of-lesson navigation (REQUIRED):**
- **End-of-lesson card** — a visually distinct card at the bottom containing:
  - Lesson completion heading
  - **Self-check checklist** — clickable ☐ items that toggle to ☑ (green when checked). Each item also has a non-toggling `复习 →` / `Review →` link back to the exact section that teaches the concept. Example items: "I can name all 5 MDP components", "I understand the Markov property", etc. Implemented via `toggleCheck()` function.
  - **Learning record panel** — shows completion percentage, quiz score, checked self-assessment items, and weak spots.
  - **Export actions** — buttons for `复制学习记录给AI` / `Copy learning record for AI` and `下载学习记录.json` / `Download learning-record.json`.
  - **Next-step command** — a styled `<code>` block showing exactly what to type in Claude Code to continue (e.g., `继续第3课 价值函数` / `Continue Lesson 3: Value Functions`)
  - Brief preview of the next lesson's content
- **Floating bottom bar** — a fixed bar that slides up from the bottom when the user scrolls the end-card into view (use `IntersectionObserver`). Contains a summary message and the next command. Dismisses on click.

**Functionality:**
- **Reset learning button** in top bar — resets quizzes, accordions, tabs, and checklists, preserves annotations/notes, and scrolls to top; clearing notes is a separate confirmed action
- **Save-on-interaction** — every quiz answer and checklist toggle calls `saveRecord()` and `updateRecordUI()`.
- **Restore-on-load** — when the page loads, call `loadRecord()` to restore previous quiz/checklist state from `localStorage`.
- **Copy format** — clipboard text MUST be a detailed Markdown report, not a terse dashboard. It must list every quiz question, whether it was correct, the learner's selected answer, the correct answer when available, feedback/retry notes, every checked/unchecked checklist item, weak spots, and next command.
- **Export format** — exported JSON MUST include `topic`, `lessonId`, `lessonTitle`, `language`, `outputMode`, `htmlPlan`, `htmlPlanInstructions`, `coursewareTier`, `coursewareTierInstructions`, `deliveryMode`, `deliveryInstructions`, `mentorLens`, `videoInstructions`, optional `annotationSummary`, `updatedAt`, `completion`, `quiz`, `checklist`, `weakSpots`, and `nextCommand`. Never embed full notes/images. Each `quiz` item MUST include `id`, `question`, `concept`, `answered`, `correct`, `choiceIndex`, `choiceText`, `correctAnswer`, `feedback`, `retrySuggestion`, and `reviewTarget` when available. Each checklist item MUST include clean `text`, `checked`, and `reviewTarget`.
- **Tab switching** — MUST query panels from the parent section (`section.querySelectorAll(".tab-panel")`), NOT from the tabs container (`.tabs` only contains buttons, not panels — this is a verified bug pattern to avoid)
- **Lesson-authored scaffold JS uses `function` and `var`** for broad compatibility; the versioned canonical runtime is deterministic and may use tested modern syntax

See [session-artifacts.md](references/session-artifacts.md) for the design tokens and complete HTML lesson scaffold.

**Runtime script resolution is mandatory:** the script paths are `<loaded-learnmap-skill-root>/scripts/inject-courseware-runtime.mjs` and `<loaded-learnmap-skill-root>/scripts/validate-courseware.mjs`, where `<loaded-learnmap-skill-root>` is the directory containing this `SKILL.md`. If `scripts/*` or `assets/courseware-runtime/*` are missing in the learner's project, that is normal; never treat it as permission to skip injection. If the Skill root cannot be located or validation cannot be run, stop and report the blocker instead of committing a manually checked lesson.

### 3A. Optional Video Visual Explainer

Only create a video-style visual explainer when the learner explicitly accepts the offer or asks for one.

- Default output is an HTML motion page, not MP4.
- Chinese mode output: `视频讲解.html`
- English mode output: `video-explainer.html`
- Target duration: 60-90 seconds unless the learner asks otherwise.
- Include a concise script, 5-8 scenes, bilingual captions when useful, and a simple play/pause/restart control surface.
- Use the lesson's concept map, examples, quiz weak spots, and next-step command as source material.
- Follow [video-visualization.md](references/video-visualization.md) for the script, storyboard, asset checklist, visual style, and tool routing.
- Use external video tools only when the requested delivery requires them: HyperFrames for finished motion-graphics MP4, Remotion for React/code-driven batch videos, video-use/videocut-skills for editing real footage, and generative media tools for AI b-roll or cinematic clips.

### 3B. Optional Mentor Lens

Only use a mentor lens when the learner explicitly asks to learn through a named thinker, expert, public figure, or domain framework.

- Default state: `mentorLens: none`.
- Chinese mode output: `思维镜片.md`.
- English mode output: `mentor-lens.md`.
- Read [cognitive-distillation.md](references/cognitive-distillation.md) before generating or applying the lens.
- Use the lens as a teaching adapter: concept order, analogies, checks, counterexamples, and "what this lens would notice first".
- Keep the normal learning workflow intact: global map first, one HTML lesson at a time, mastery checks, mistake log, and learning record export.
- If public evidence is thin, label the lens as provisional and prefer a domain framework over a named-person lens.
- If current facts matter, verify them before using them; otherwise mark the lens as a stable teaching analogy, not a current biography.
- Preserve the learner's language choice. Technical terms remain in English.

Do not:

- speak as the person in first person
- fabricate quotes, private beliefs, or recent views
- make the lens override mastery checks
- force every explanation through the lens when a neutral explanation is clearer

### 4. Gate Progress With Mastery Checks

Each lesson ends with 2-4 mastery check questions embedded in the same HTML lesson page as the final interactive section.

Mix question types:

- concept distinction: "A vs B"
- application: "What would you choose in this scenario?"
- boundary: "When does this idea stop applying?"
- error diagnosis: "What is wrong with this reasoning?"
- light calculation or implementation reasoning when relevant

Grade the learner's answer using:

- correct
- partially correct
- misconception
- missing boundary
- application gap

Do not move to the next module if the learner misses a core concept. Give a targeted correction, ask a simpler follow-up, then retest. Use [assessment-rubric.md](references/assessment-rubric.md) for diagnosis patterns.

### 5. Maintain Learning Memory

After each module:

- Chinese mode: update `元数据/学习进度.md` and append mistakes to `元数据/错题记录.md`
- English mode: update `_meta/progress.md` and append mistakes to `_meta/mistakes.md`
- If a lesson folder contains exported learning records (`学习记录.json` in Chinese mode or `learning-record.json` in English mode), read them before deciding whether to advance, reteach, or update weak spots.
- If the learner pastes an exported learning record inline in the chat, parse that JSON directly and treat it the same as a file-based `学习记录.json` / `learning-record.json`.
- If an imported record only lists weak spot IDs and lacks quiz metadata such as question text, concept, feedback, or review target, open the corresponding lesson HTML to recover the missing concept context. If the lesson file is unavailable, ask the learner for the missing quiz/question context before deciding to advance or reteach.
- Preserve `videoExplainer` in the profile/progress files. Values: `offered`, `accepted`, or `declined`.
- Preserve `mentorLens` in the profile/progress files. Values: `none` or the active lens name.
- Preserve `outputMode` in the profile/progress files. Values: `fast` or `slow`. Use stored mode on resume unless the learner asks to switch.
- Preserve `htmlPlan` in the profile/progress files. Values: `single-overview`, `compact-series`, `standard-series`, `deep-series`, or `custom`. Use stored plan on resume unless the learner asks to switch.
- Preserve learner-entered `htmlPlanInstructions` even if normalization maps a one-page custom request to `single-overview`; otherwise store `null`.
- Preserve `coursewareTier` and `coursewareTierInstructions`; missing legacy values normalize to `standard` and `null` without rewriting committed pages.
- Preserve `deliveryMode` in the profile/progress files. Values: `batch`, `interactive`, or `custom`. Use the stored cadence on resume unless the learner asks to switch.
- Preserve learner-entered `deliveryInstructions` even if combination normalization changes `deliveryMode`; otherwise store `null`.
- Preserve `videoInstructions` for custom accepted video requests; otherwise store `null`.
- update the map if the learner discovered a better structure
- add a short retrieval prompt for later review

When resuming, read profile/progress, all four courseware fields, generation state, and latest lesson. Reconcile metadata against validated final files using [resilient-generation.md](references/resilient-generation.md); do not restart from scratch unless requested.

### 6. Produce Useful Outputs

Choose outputs based on the user's goal:

- fast output mode / quick overview: one condensed interactive HTML courseware page with a concept map, core examples, mastery checks, and a slow-learning expansion plan
- slow output mode / deep onboarding: global map + chapter plan constrained by `htmlPlan` + page specification constrained by `coursewareTier` + cadence constrained by `deliveryMode` + mastery quizzes
- project delivery: map + implementation decision checklist + risk list
- exam/interview: map + flashcards + graded mock questions
- blog/writing: map + analogies + examples + outline
- codebase/domain learning: repo map + terminology glossary + walkthrough tasks as an interactive HTML lesson with mastery checks and exportable learning record
- interactive courseware update: anchored explanations + quizzes + self-check checklist with review-back links + exportable learning record
- accepted video explainer: HTML motion explainer + bilingual captions + storyboard/source notes, with MP4 rendering left to an explicit follow-up
- requested mentor lens: lens brief + adapted explanations + lens-specific counterexamples + honest boundaries

When the user asks for a final artifact, produce a concise learning dossier:

- "I can explain this now" summary
- top 10 concepts
- concept relationships
- common mistakes
- remaining gaps
- next 3 study tasks

---

### 7. Lightweight Quality Gate

Before finalizing a new lesson, visual explainer, mentor lens, or major workspace update, run the compact gate in [quality-ratchet.md](references/quality-ratchet.md).

Minimum pass criteria:

- the next learner action is explicit
- every quiz/checklist item has a target concept and review path
- export data contains enough detail for the next AI session to diagnose mistakes
- learner annotations are non-destructive, independently resettable, portable, and browser-tested
- optional video and mentor-lens paths remain opt-in
- failure modes are handled directly rather than hidden in generic advice
- 2-3 representative prompts dry-run without changing the intended workflow

This is not an autonomous optimizer. Do not create branches, commits, scoring logs, or result cards during normal teaching unless the user explicitly asks to optimize the skill itself.

---

## Response Style

- Be warm, direct, and adaptive.
- Prefer short teaching chunks over long lectures.
- Ask the learner to explain ideas back through the HTML lesson UI when possible; avoid prose-only chat calibration.
- When correcting, name the precise broken link in the reasoning.
- Use simple language first, then add technical vocabulary.
- For Chinese mode: teach in Chinese, generated learning folder/file names in Chinese, quizzes in Chinese. Use names like `学习/强化学习/第01课-全局地图/课件.html`. Technical terms remain in English. Example: "Q-Learning 属于经典无模型方法" not "Q学习属于无模型方法".
- For English mode: everything in English, folder names in English. Technical terms stay as-is.

---

## Calibration UI Contract

Use this contract for every new session and every missing calibration field:

1. Use the current agent UI's native structured choice tool (for example, `request_user_input`) to render clickable popup choices.
2. Do not generate, open, or link to calibration HTML. Do not ask the same fields as prose or numbered chat questions.
3. If native choices are unavailable, explain that this surface cannot complete LearnMap calibration and pause before generating lessons.
4. Respect the host tool limit: use 2-3 explicit options per question. If the client automatically injects a free-text `Other`, do not add a duplicate explicit `Other`; otherwise include one.

Required choice groups:

- Language explicit options: `中文版`, `English`
- Context when missing: topic scope, learner background, and learning goal; at most three groups
- Courseware scope explicit options: stage `1 个 HTML`, `2-3 个 HTML`, `4-10 个 HTML`; when `4-10` is selected, follow with `4-6 个 HTML`, `7-10 个 HTML`
- Courseware tier explicit options: `精简档`, `标准档（推荐）`, `高质量档`
- Delivery mode explicit options for multi-HTML plans: `一次性生成全部`, `分多次互动逐课生成`. Describe the first as a resumable queued batch, not one giant model response.
- Optional video explainer explicit options: `暂不需要`, `需要 HTML 视频式讲解`

Every group relies on the native client's injected free-text `Other`; do not add a duplicate explicit option.

Record the chosen values in profile/progress files before generating lesson files. Unknown fields stay `unknown`; never fill them with guessed personal details.

---

## Failure Modes To Avoid

- **Skipping Step 0** — never assume the language. Always ask.
- **Text-only or HTML calibration** — do not ask "你的技术背景是什么？" as prose and never generate `calibration.html` / `校准选择.html`; use the native popup.
- **Missing HTML-count decision** — do not ask only "fast or slow"; collect the actual courseware scope: 1, 2-3, 4-6, 7-10, or custom HTML files.
- **Unsupported personalization** — never invent the learner's role, contest, deadline, teammates, prior cases, or project goal from a vague prompt.
- Dumping a 10,000-word guide before the learner has a map.
- Treating passive reading as learning.
- Letting the learner advance with fuzzy understanding.
- Explaining only from the implementer perspective.
- Giving examples without tying them back to the concept map.
- Creating many files without maintaining the language-specific progress file (`元数据/学习进度.md` or `_meta/progress.md`).
- Pre-creating future lesson directories or treating empty/high-numbered directories as completed work.
- Writing several lesson HTML files in one provider/tool response instead of validating, committing, and checkpointing one lesson at a time.
- Claiming a lesson is generated before its final HTML passes validation and the generation-state checkpoint is durable.
- Treating `generatedThrough` as `masteredThrough`, or trusting stale progress metadata over validated final files.
- Generating video explainers by default or blocking the normal lesson loop while waiting for a video decision.
- Asking the output-mode question repeatedly after `outputMode` is stored.
- Asking the HTML-plan question repeatedly after `htmlPlan` is stored.
- Asking the courseware-tier question repeatedly after `coursewareTier` is stored.
- Asking the delivery-mode question repeatedly after `deliveryMode` is stored.
- Treating fast mode as a shallow summary; it must still be an interactive HTML lesson with checks and export.
- Treating high quality as file size, or removing core interactions from compact/standard tiers.
- Rewriting annotation code per lesson, wrapping teaching DOM to draw marks, using a long always-expanded annotation toolbar, creating any note side drawer, removing the lesson TOC, treating `file://` storage as guaranteed, placing images in `localStorage`, or letting learning reset delete notes.
- Creating multiple chapter folders in fast mode before the learner asks to expand.
- Rendering MP4 by default when the learner only asked for learning help; start with HTML preview unless MP4 is explicitly requested.
- Turning a mentor lens into impersonation, role-play, or fake quotations.
- Applying a mentor lens by default when the learner only asked to learn normally.
- Treating Darwin/Nuwa as required runtime dependencies. Their ideas are internalized as local references; normal lessons must work without invoking those external skills.
- **Generating plain markdown for learner-facing lesson content** — every lesson, including the global map, must be one interactive HTML page.
- **`querySelectorAll` scoping bug** — when switching tabs, always query panels from the parent section, not the tabs button container.
- **Quiz double-click corruption** — always guard mini-quiz answer handlers against repeated clicks.
- **`scroll-margin-top` inconsistency** — use manual scroll position calculation instead of relying on CSS scroll-margin for cross-browser reliability.
- **Checklist review-link bug** — clicking a `复习 →` / `Review →` link inside a checklist item must not toggle the checklist. Use `event.stopPropagation()` on the link and store checklist text from `.check-text`, not `textContent` from the whole item.
- **Quiz review-link omission** — never show wrong-answer feedback without a same-page `复习 →` / `Review →` jump back to the exact explanation section for that question's tested concept.
