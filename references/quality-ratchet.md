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
   - `outputMode` is explicit or asked once, then preserved.

3. Failure modes
   - Weak answers trigger reteaching or simpler follow-up questions.
   - Wrong quiz feedback points back to the relevant explanation section.
   - Missing learner context is handled by at most three calibration questions.

4. Checkpoints
   - Fast mode creates one condensed HTML courseware page, not multiple chapter folders.
   - Slow mode preserves the global-map-first, chapter-by-chapter flow.
   - Optional video explainers stay opt-in.
   - Mentor lenses stay opt-in.
   - The learner is not advanced until they demonstrate understanding.

5. Specificity
   - The next command is written exactly.
   - Quiz items include concept, answer, feedback, retry suggestion, and review target.
   - Checklist items store clean text, checked state, and review target.
   - Exported records include `outputMode`.

6. Resource links
   - Use `session-artifacts.md` for lesson scaffolds.
   - Use `assessment-rubric.md` for mastery diagnosis.
   - Use `video-visualization.md` only after the learner accepts a visual explainer.
   - Use `cognitive-distillation.md` only after the learner requests a mentor lens.

7. Artifact structure
   - Chinese mode uses Chinese learner-facing filenames.
   - English mode uses English learner-facing filenames.
   - Repository files keep required names such as `SKILL.md`, `README*.md`, and `references/*.md`.

8. Dry-run behavior
   - Test 2-3 representative prompts mentally or with a subagent when available.
   - Confirm the skill stays on the intended path and does not introduce a negative behavior.
   - When `DEEPSEEK_API_KEY` is available, run `node scripts/deepseek-skill-eval.mjs` and read the generated `.skill-evals/*.json` feedback before editing.

9. Anti-pattern blacklist
   - Do not create plain Markdown lessons instead of HTML courseware.
   - Do not generate MP4 by default.
   - Do not impersonate a mentor lens or invent quotes.
   - Do not add unrelated frameworks just to look comprehensive.
   - Do not create commits, result cards, scoring logs, or optimizer branches during normal teaching.

## Standard Dry-Run Prompts

Use these when validating the learning skill itself or a major artifact template:

```text
使用 learnmap-skill 教我强化学习，我有 Python 基础，希望一周内能跑一个简单实验。
```

Expected: ask language first, then calibrate, create a global-map HTML lesson, and do not enable video or mentor lens by default.

```text
快速模式教我强化学习，我有 Python 基础。
```

Expected: set `outputMode: fast`, generate only `快速总览/课件.html` after language is known, include a concept map, essential examples, traps, mastery checks, exportable record, and a plan to expand into slow mode.

```text
慢速模式教我强化学习，我要逐章理解全貌和细节。
```

Expected: set `outputMode: slow`, create the global-map lesson first, then proceed one chapter at a time with mastery checks and mistake tracking.

```text
我看完快速总览了，把 MDP 展开成慢速第 2 课。
```

Expected: switch or continue with `outputMode: slow`, reuse the fast overview as context, create the next detailed lesson, and preserve prior weak spots and learning records.

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
