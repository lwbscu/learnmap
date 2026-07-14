# Resilient Multi-HTML Generation

Use this protocol before creating any multi-HTML courseware. It keeps batch generation resumable across provider disconnects and keeps generated files separate from learner mastery.

## Contents

1. Semantics
2. Generation state
3. Per-lesson transaction
4. Output budget
5. Recovery
6. Completion rules

## 1. Semantics

- `deliveryMode: interactive` means at most one new lesson may be committed after the learner explicitly continues with a learning record or useful feedback; advancement still follows the mastery gate. Never pre-create later lesson directories.
- `deliveryMode: batch` means generate the whole selected plan without waiting for mastery answers. It does **not** mean one giant model response or one all-or-nothing filesystem transaction.
- A batch is a resumable sequence of per-lesson transactions. Continue automatically through agent/tool loops when the host permits. If the host stops, preserve the checkpoint and provide the stored resume command.
- `generated` means a complete lesson artifact exists. `mastered` means the learner's record proves understanding. Never infer mastery from generation.

## 2. Generation State

Create an agent-maintained state file before writing lesson HTML:

- Chinese: `元数据/生成状态.json`
- English: `_meta/generation-state.json`

```json
{
  "schema": "learnmap-generation/v1",
  "planRevision": 1,
  "outputMode": "slow",
  "htmlPlan": "deep-series",
  "deliveryMode": "batch",
  "plannedLessonCount": 8,
  "generatedThrough": 1,
  "masteredThrough": 0,
  "currentLessonIndex": 2,
  "runState": "paused",
  "lastCheckpointAt": "2026-07-14T00:00:00.000Z",
  "resumeCommand": "继续批量生成 RPent 课件，从第02课恢复",
  "lessons": [
    {
      "index": 1,
      "lessonId": "lesson-01",
      "title": "全局地图",
      "finalPath": "第01课-全局地图/课件.html",
      "status": "committed",
      "byteSize": 34816,
      "sha256": "<validator output>"
    }
  ],
  "lastError": null
}
```

Allowed `runState` values: `planned`, `rendering`, `paused`, `complete`, `failed`.

Allowed lesson `status` values: `planned`, `rendering`, `committed`, `legacy-valid`, `failed`, `user-modified`.

Write state atomically: write a sibling `.tmp`, close it, then replace the official JSON. A stale or malformed state file never overrides valid final HTML files.

## 3. Per-Lesson Transaction

Process lessons strictly in plan order. Do not create all future lesson directories up front.

1. Scan and reconcile state before each write.
2. Set only the current lesson to `rendering`; do not mark it generated or completed.
3. Create a staging directory beside the final lesson directory, such as `.learnmap-staging/lesson-02/`.
4. Generate exactly one complete HTML file as `课件.html.partial` or `index.html.partial` in the staging directory. One provider/tool turn writes at most one lesson HTML.
5. Do not echo the HTML source in chat. Tool output and chat summaries should contain paths and compact validation results only.
6. Validate the partial file with `node "<loaded-learnmap-skill-root>/scripts/validate-courseware.mjs" <partial-path>`. Resolve the script from the directory containing the loaded LearnMap `SKILL.md`, never from the user's current project directory.
7. If validation fails, keep the final path untouched, record `failed`, and retry only the current lesson.
8. If validation passes, rename the `.partial` file inside staging to its final basename (`课件.html` or `index.html`). Remove an existing final lesson directory only when it is empty; preserve any non-empty legacy or user-authored directory. Then atomically rename the staging lesson directory itself to the final lesson directory on the same filesystem.
9. Immediately checkpoint `status: committed`, byte size, SHA-256, and the next lesson index.
10. Only after the checkpoint may batch mode start the next lesson. Interactive mode stops after the committed lesson.

Never claim “课件已生成 / lesson generated” in progress metadata before step 9 succeeds.

## 4. Output Budget

- Target 24–60 KiB of UTF-8 source per lesson; hard ceiling 96 KiB unless the learner explicitly requests a larger standalone artifact.
- Line count is not a quality metric. Prefer compact CSS/JS and focused content over a 1000-line scaffold.
- Keep 5–9 map modules, 2–4 mastery questions, and the required interactions. Put deep detail in its planned lesson instead of expanding Lesson 1 into the whole textbook.
- If a lesson would exceed the ceiling, reduce duplicated boilerplate and move non-core detail to another planned page. Do not silently add extra pages beyond `htmlPlan`.
- A provider/tool turn writes one lesson HTML. Other small state/tool calls may occur in the same turn.

## 5. Recovery

On every resume, treat disk artifacts as the source of truth and metadata as a checkpoint that may lag.

1. Read profile, progress, generation state, and exported learning records.
2. Scan planned lessons from index 1 upward; do not use the highest directory number as the resume point.
3. A new final lesson counts as generated only when its expected HTML exists and passes the current validator contract. For a pre-protocol lesson, run the validator again with `--legacy`; structurally complete legacy HTML may count as `legacy-valid`, with capability gaps recorded for optional later upgrade.
4. Empty directories, `.partial`, `.tmp`, staging files, zero-byte files, missing `</html>`, and failed validation do not count.
5. The first missing or invalid lesson is the resume target. Never skip a hole because a later directory exists.
6. If final HTML is valid but state lags, repair the checkpoint. If state claims committed but HTML is invalid/missing, roll generation progress back.
7. Preserve current-contract `committed` and structurally complete `legacy-valid` lessons. Retry only the first invalid/missing lesson.
8. If a committed file hash changed, mark `user-modified` and preserve it; do not overwrite it silently.
9. A `legacy-valid` page stays in place and allows recovery to continue at the next lesson. Do not silently overwrite it; offer a separate upgrade later if its missing interactions matter. If even `--legacy` fails, preserve the invalid artifact under a timestamped backup name before generating a replacement.
10. Keep `deliveryMode` unchanged on recovery. A batch resumes as batch; interactive still requires the normal mastery handoff.

## 6. Completion Rules

- `generatedThrough` is the highest continuously validated lesson index.
- `masteredThrough` comes only from learner records and may be lower than `generatedThrough`.
- `runState: complete` means all planned HTML files are committed, not that the learner mastered them.
- Update `学习进度.md` / `progress.md` only after reconciling generation state with final files.
- Remove or ignore old empty lesson directories left by interrupted legacy runs; never treat them as progress.
- End a paused batch with the exact `resumeCommand` from generation state.
