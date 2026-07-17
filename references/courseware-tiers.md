# Courseware Tiers

Use this reference whenever LearnMap calibrates or generates lesson HTML. `coursewareTier` controls each page's content density, production specification, and quality gate. It is independent from `outputMode`, `htmlPlan`, and `deliveryMode`.

## State

```json
{
  "coursewareTier": "standard",
  "coursewareTierInstructions": null
}
```

Allowed values: `compact`, `standard`, `high-quality`, `custom`.

- Default to `standard` only when the learner does not answer or a legacy record has no tier.
- Map the native client's injected `Other` to `custom` and preserve its text in `coursewareTierInstructions`.
- Explicit requests such as “高质量”, “精品课件”, “详细吃透底层”, “完整代码原理”, or “方便二次开发” select `high-quality` without asking again.
- A tier change applies to future lessons. Never rewrite committed lessons unless the learner explicitly requests an upgrade.

## Native Popup

Ask once for new sessions, after HTML count and before multi-page delivery cadence:

- `精简档 / Compact` — shorter focused pages
- `标准档（推荐） / Standard` — balanced depth and reading time
- `高质量档 / High-quality` — deeper evidence, execution chains, boundaries, and transfer practice

Rely on the native client for free-text `Other`. Never ask this as prose and never create calibration HTML.

## Shared Quality Floor

Every tier keeps the complete LearnMap interaction contract:

- table-of-contents navigation
- expandable explanations
- anchored note icons/popovers
- wrong-answer analysis with exact `Review / 复习` jumps
- self-check items with exact review targets
- local persistence and learning-record copy/download
- weak-spot continuation
- canonical runtime v2 learner underlines/highlights, custom `#RRGGBB` mark/note colors, anchored floating editor, floating notes manager, structured text/image notes, note-icon expand/collapse, orphan recovery, portable `.learnmap` backup, and v1 data/package compatibility

Do not trade away the lesson table-of-contents. Do not add note side drawers in any tier.

Compact means less scope per page, not missing functionality. Fast mode also does not imply compact quality: `fast + single-overview + high-quality` is valid.

## Tier Contracts

| Tier | Teaching planning signal | Content contract |
|---|---:|---|
| `compact` | 16–32 KiB | Shortest complete concept path, at least 2 concrete examples or worked steps, 2 diagnostic quizzes, and 2 reviewable checklist items. |
| `standard` | 24–60 KiB | Balanced architecture/concept flow, at least 3 examples or worked steps, 2–4 quizzes, at least 3 checklist items, practical task, and common failure modes. |
| `high-quality` | 48 KiB+ when the topic needs it | Standard contract plus evidence mapping, at least 2 end-to-end execution/reasoning chains, tradeoffs and failure boundaries, extension/transfer path, one domain-specific interactive, 3–4 diagnostic quizzes, and at least 4 checklist items. |
| `custom` | Parse learner text | Follow the stored instructions while preserving the shared quality floor; use standard density as a starting point when size is unspecified. |

Teaching content and deterministic tooling are measured separately. The canonical annotation runtime, lesson content, and total HTML have no default hard size ceiling. Planning ranges guide density and truncation checks; they are not quality scores. A concise but complete page may be below its signal, while a demanding high-quality lesson may be substantially larger. Never add filler to hit a byte target or delete useful depth merely to shrink the file. An explicit learner size request or validator `--max-bytes` remains binding.

## High-Quality Evidence Contract

High-quality pages must make their added value inspectable. Mark the relevant HTML sections with:

```html
<section data-quality-evidence="evidence-map">...</section>
<section data-quality-evidence="execution-chain">...</section>
<section data-quality-evidence="execution-chain">...</section>
<section data-quality-evidence="tradeoffs">...</section>
<section data-quality-evidence="extension-path">...</section>
<div class="domain-interactive">...</div>
```

Interpret the evidence map by domain:

- Codebase/repository: component → file/symbol → responsibility.
- Mathematics/research: claim → formula/evidence → assumption.
- Operational domain: decision → observable signal → consequence.

Execution chains must be real worked flows, not duplicate headings. The domain-specific interactive should teach causality or state change, such as a call-stack stepper, state-flow simulator, parameter explorer, or decision-path exercise.

## Persistence And Recovery

- Store both fields in profile, progress, generation state, `LESSON_META`, exported JSON, and copied Markdown reports.
- Preserve the tier across batch interruption and interactive continuation.
- For legacy profile/record/state data with no tier, normalize to `standard` without rewriting existing pages.
- If a committed page has a different tier, preserve its recorded tier. A later tier switch changes only future pages unless the learner explicitly requests regeneration.
