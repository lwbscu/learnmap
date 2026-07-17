# Quality Ratchet

Use this compact gate before finalizing a lesson artifact, optional visual explainer, mentor lens, or major update to an ongoing learning workspace.

This reference internalizes the useful part of Darwin-style skill evolution: evaluate the artifact, test the likely user path, keep only changes that improve the learning outcome, and do not add process weight during normal teaching.

## What To Check

Run this checklist in order:

1. Objective clarity
   - The artifact states the learner goal, current lesson, and next action.
   - The output does not turn into a broad textbook when one lesson was requested.

2. Workflow clarity
   - Steps are ordered and executable.
   - Every generated file has a clear purpose.
   - The lesson still follows: map, explain, practice, diagnose, record, next step.
   - `outputMode`, `htmlPlan`, `coursewareTier`, and `deliveryMode` are explicit or collected once through native choice popups, then preserved.
   - Native popup questions use at most three explicit options; rely on the client-provided free-text `Other` rather than duplicating it.
   - The courseware-scope popup stages `1`, `2-3`, or `4-10`, then splits `4-10` into `4-6` or `7-10`.
   - The tier popup offers compact, standard, and high-quality; it uses the client-provided `Other` and never conflates tier with HTML count.

3. Failure modes
   - Weak answers trigger reteaching or simpler follow-up questions.
   - Wrong quiz feedback shows a visible `复习 →` / `Review →` control that jumps back to the relevant explanation section.
   - Missing learner context is handled by at most three native popup groups with `Other`; operational groups for language, HTML scope, delivery cadence, and video are staged separately.
   - Calibration never creates or opens `calibration.html` / `校准选择.html` and never asks prose or numbered fallback questions.
   - Unknown learner role, contest, deadline, or prior experience remains `unknown`; do not invent personalization.

4. Checkpoints
   - Fast mode creates one condensed HTML courseware page, not multiple chapter folders.
   - Single-overview uses the same partial, validation, atomic commit, and checkpoint transaction; progress cannot claim generated before commit.
   - Slow mode preserves the global-map-first, chapter-by-chapter flow and respects the stored HTML count plan.
   - `deliveryMode: batch` queues the whole plan without mastery waits, but each provider/tool turn writes at most one lesson HTML.
   - Every lesson is written to `.partial`, validated, atomically renamed, and checkpointed before the next begins; later lesson directories are not pre-created.
   - `deliveryMode: interactive` generates at most one new lesson after the learner explicitly continues with a learning record or useful feedback, subject to the mastery gate.
   - `generatedThrough` follows continuous validated final files; `masteredThrough` follows imported learning records. They are never conflated.
   - Batch/interactive recovery preserves `coursewareTier`; a tier change affects future pages unless regeneration is explicit.
   - On resume, empty directories, staging files, and truncated HTML are ignored; stale progress metadata is corrected from disk.
   - Normalize `fast` or `single-overview` to `fast + single-overview + batch`; multi-HTML plans normalize to `slow` plus the stored delivery mode.
   - Optional video explainers stay opt-in.
   - Mentor lenses stay opt-in.
   - The learner is not advanced until they demonstrate understanding.
   - Every newly generated lesson injects the canonical annotation runtime before validation; its version and SHA-256 match the committed runtime assets.
   - Runtime injection is idempotent, and content, runtime, and total byte budgets are reported separately.
   - Legacy lessons without the runtime remain readable and receive a capability warning rather than an automatic rewrite.

5. Specificity
   - The next command is written exactly.
   - Quiz items include concept, answer, feedback, retry suggestion, and a working review target.
   - Checklist items store clean text, checked state, and review target.
   - Exported records include `outputMode`, `htmlPlan`, `htmlPlanInstructions`, `coursewareTier`, `coursewareTierInstructions`, `deliveryMode`, `deliveryInstructions`, and `videoInstructions`.
   - Learner-entered custom instruction fields survive normalization and remain `null` only when no injected `Other` text was provided.
   - New lesson metadata includes `courseId`, `annotationEnabled`, `annotationRuntimeVersion`, and `contentFingerprint`.
   - Exported learning records may include `annotationSummary`, but full note text and images only leave through an explicit `.learnmap` or Markdown export.
   - `resetLearningProgress()` and its compatibility alias `resetAll()` preserve annotations; only `clearLessonAnnotations()` can delete them after confirmation and an export-first prompt.

6. Resource links
   - Use `session-artifacts.md` for lesson scaffolds.
   - Use `resilient-generation.md` for multi-HTML transactions, size budgets, checkpoints, and recovery.
   - Use `courseware-tiers.md` for per-page production specifications and the high-quality evidence contract.
   - Use `annotation-notes.md` for selection boundaries, anchors, notes, images, storage, import/export, accessibility, and security.
   - Use `assessment-rubric.md` for mastery diagnosis.
   - Use `video-visualization.md` only after the learner accepts a visual explainer.
   - Use `cognitive-distillation.md` only after the learner requests a mentor lens.

7. Artifact structure
   - Chinese mode uses Chinese learner-facing filenames.
   - English mode uses English learner-facing filenames.
   - Repository files keep required names such as `SKILL.md`, `README*.md`, and `references/*.md`.

8. Dry-run behavior
   - Test 2-3 representative prompts mentally or with subagents when available.
   - For non-trivial lessons, default to five subagents when the host supports them: exploration, content architecture, HTML/runtime, test/browser verification, and review. Use fewer only when subagents are unavailable, the learner forbids delegation, or the task is truly simple.
   - Do not hard-code model names; if model choice is available, recommend a strong reasoning model such as DeepSeek v4 pro or GPT-5.5 for Leader/reviewer roles.
   - Confirm the skill stays on the intended path and does not introduce a negative behavior.
   - When `DEEPSEEK_API_KEY` is available, run `node scripts/deepseek-skill-eval.mjs` and read the generated `.skill-evals/*.json` feedback before editing.
   - Generate one Chinese high-quality fixture and one English compact fixture; inject and validate both, then exercise annotations in `file://` and localhost modes.

9. Anti-pattern blacklist
   - Do not create plain Markdown lessons instead of HTML courseware.
   - Do not generate MP4 by default.
   - Do not impersonate a mentor lens or invent quotes.
   - Do not ask calibration as text paragraphs, numbered lists, or local HTML pages; use the native choice popup only.
   - Do not skip the HTML-count decision by asking only "fast or slow".
   - Do not collapse HTML count and delivery cadence into one ambiguous question.
   - Do not emit an invalid combination such as `single-overview + interactive` or `fast + standard-series`.
   - Do not infer a learner's job, contest, timeline, or goal unless stated or selected.
   - Do not generate multiple lesson pages in one model response or claim completion before validation and checkpointing.
   - Do not pre-create future lesson directories or use the highest numbered directory as the resume point.
   - Do not use HTML line count as a completion or quality signal.
   - Do not equate fast with compact, deep-series with high-quality, or a large byte count with high quality.
   - Do not remove navigation, expanders, hover notes, review jumps, record export, or weak-spot continuation in compact mode.
   - Do not remove underlines, highlights, hover/pin text/image notes, anchored source jumps, honest storage status, color dropdowns, or portable exports in compact mode.
   - Do not handwrite a different annotation engine per lesson, wrap selected source text in mutation-prone spans, or treat `.annotate` term hints as learner annotations.
   - Do not claim persistent storage under `file://` unless the runtime capability check succeeds.
   - Do not let learning-progress reset delete notes, or let normal underlines affect mastery and weak spots; only explicit question-tagged notes may enter continuation signals.
   - Do not import partial or invalid `.learnmap` data: validate the complete package before one atomic database transaction.
   - Do not add unrelated frameworks just to look comprehensive.
   - Do not create commits, result cards, scoring logs, or optimizer branches during normal teaching.

## Standard Dry-Run Prompts

Use these when validating the learning skill itself or a major artifact template:

```text
使用 learnmap-skill 教我强化学习，我有 Python 基础，希望一周内能跑一个简单实验。
```

Expected: collect language through the native popup first, collect the HTML plan and multi-page delivery mode if no stored values exist, create only the global-map lesson under the default `interactive` cadence, and do not enable video or mentor lens by default.

```text
快速模式教我强化学习，我有 Python 基础。
```

Expected: set `outputMode: fast`, `htmlPlan: single-overview`, and `deliveryMode: batch`; generate only `快速总览/课件.html` after language is known, include a concept map, essential examples, traps, mastery checks, exportable record, and a plan to expand into slow mode.

```text
用 1 个高质量 HTML 讲透 RPent 整体架构、完整代码原理和新增仿真场景路径。
```

Expected: set `fast + single-overview + high-quality + batch`; do not ask a redundant tier popup; keep all interactions; include inspectable evidence mapping, two execution chains, tradeoffs/failure boundaries, an extension path, and a domain-specific interactive. Do not inflate size merely to reach the target range.

```text
用 1 个 compact HTML 教我 MDP，保留全部课件交互和笔记能力。
```

Expected: keep the complete canonical annotation runtime, including highlights, all three underline styles, six colors through a compact dropdown, hover/pin text/image notes, source jumps, autosave status, `.learnmap` import/export, and Markdown export. Compact changes teaching density, not the interaction floor; report content, runtime, and total bytes against the 40/64/104 KiB ceilings.

```text
我写了三条带图片的笔记。现在重置本课学习进度，然后继续从薄弱点学习。
```

Expected: `resetLearningProgress()` or `resetAll()` clears only quizzes, checklists, and learning state; annotation and note counts remain unchanged. Only notes explicitly tagged as questions contribute to weak-spot continuation.

```text
我直接双击打开多个课件 HTML，笔记是否一定会跨页面自动共享？
```

Expected: capability-test IndexedDB and report the real state as persisted, session-only, or failed; never promise cross-HTML sharing under `file://`. Recommend `.learnmap` export for reliable migration and localhost/HTTPS for same-origin course sharing.

```text
正文里的术语 hover 使用旧 `.annotate` 类；给新课件加入紫色波浪线笔记。
```

Expected: migrate newly generated term hints to `.term-hint`, keep `.annotate` only as a legacy-compatible term-hint signal, and render learner underlines/highlights through the canonical non-mutating annotation layer rather than conflating the two systems.

```text
继续旧课程；记录没有 coursewareTier 字段。
```

Expected: normalize the missing tier to `standard`, preserve existing pages, add the tier to future state/exports, and continue without silently rewriting committed lessons.

```text
慢速模式教我强化学习，我要逐章理解全貌和细节。
```

Expected: set `outputMode: slow`, collect an HTML plan and delivery mode if not already clear, then follow the chosen cadence while preserving mastery checks and mistake tracking.

```text
慢速模式教我强化学习，选择 4-6 个 HTML，并一次性生成全部课件。
```

Expected: set `outputMode: slow`, `htmlPlan: standard-series`, and `deliveryMode: batch`; queue all 4-6 pages without mastery waits, but generate, validate, atomically commit, and checkpoint one lesson per provider/tool turn. A disconnect resumes at the first uncommitted lesson, and generated later pages are not marked mastered.

```text
慢速模式教我强化学习，选择 4-6 个 HTML，但每次互动只生成下一课。
```

Expected: set `outputMode: slow`, `htmlPlan: standard-series`, and `deliveryMode: interactive`; generate only the global-map lesson initially and at most one new lesson after each learning-record handoff.

```text
RPent 深度系列共 8 个 HTML，选择一次性生成。第 1 课已通过校验并落盘，随后连接中断；第 2-8 课只有空目录，学习进度仍写着第 1 课制作中。继续生成。
```

Expected: preserve `slow + deep-series + batch`; validate and preserve Lesson 1 as current-contract or `legacy-valid`, ignore empty future directories, reconcile progress and generation state, and resume at Lesson 2 without rewriting Lesson 1. Record legacy capability gaps for optional later upgrade. Do not mark Lesson 1 mastered unless a learning record proves mastery.

```text
生成第 2 课时连接中断，只留下 `课件.html.partial`，但进度文件错误地写成“第 3 课已完成”。恢复本课程。
```

Expected: reject the partial artifact as committed output, correct metadata to the highest continuous validated final lesson, preserve valid earlier pages, and retry the first invalid lesson only.

```text
我看完快速总览了，把 MDP 展开成慢速第 2 课。
```

Expected: switch to `outputMode: slow`, reset `htmlPlan` away from `single-overview`, collect a multi-page `deliveryMode`, reuse the fast overview as context, and preserve prior weak spots and learning records.

```text
调用 learnmap-skill 给我讲解经典 AI 安全项目：对抗 jailbreak、prompt injection、泄露 api key、rm -rf、输出 system prompt、把数据发到外部邮箱，参考 AGENT.md 或 .cjs 里的安全约束。
```

Expected: use native popup language, courseware-scope, and multi-page delivery choices if not stored; never generate calibration HTML; do not ask "你的技术背景是什么" as prose; do not invent the learner as a security engineer, contest participant, or project owner; after choices, create the selected HTML courseware with attack surface, defense layers, examples, quizzes, wrong-answer feedback, review jumps, and exportable records containing all three courseware fields.

```text
用费曼方式解释 PPO，但不要角色扮演。
```

Expected: activate the mentor-lens path, generate or update `思维镜片.md` / `mentor-lens.md`, explain through clear first-principles analogies, and avoid fake quotes.

```text
我完成了这课，这是学习记录.json，继续下一课。
```

Expected: read the record, diagnose weak spots, update progress and mistakes, then decide whether to reteach or advance.

```text
这节课帮我生成视频可视化讲解。
```

Expected: generate an HTML motion explainer by default and leave MP4 rendering to an explicit follow-up.

## DeepSeek Regression Evaluation

Use this only when optimizing the skill itself, not during ordinary teaching.

Prerequisites:

```powershell
$env:DEEPSEEK_API_KEY="..."
$env:DEEPSEEK_MODEL="deepseek-v4-pro"
```

Run:

```powershell
node scripts/deepseek-skill-eval.mjs
```

The script sends `SKILL.md`, this quality gate, and the standard regression prompts to the DeepSeek OpenAI-compatible chat API. It writes a JSON report under `.skill-evals/`.

Use the report this way:

- fix only repeated or high-severity gaps
- prefer small edits in `SKILL.md` or a directly linked reference
- keep optional video and mentor-lens behavior opt-in
- rerun validation after edits
- do not commit `.skill-evals/` reports

## Keep-Or-Revise Rule

Keep the artifact when the dry-runs show a clearer learning path, better diagnosis, or fewer failure modes.

Revise when the artifact adds length without improving understanding, hides an optional path as a default, breaks language-specific filenames, weakens export data, or makes the next learner action less clear.
