# Annotation And Notes Contract

Use this reference for every newly generated LearnMap lesson. The annotation runtime is a deterministic Skill asset, not model-written lesson code. Existing committed lessons remain untouched unless the learner explicitly requests regeneration.

## Contents

1. Product boundary
2. Runtime integration
3. Selection and underline behavior
4. Notes and images
5. Anchors and recovery
6. Persistence and learning records
7. Portable package
8. Accessibility and security
9. Validation checklist

## 1. Product Boundary

- Enable annotations by default without another calibration question.
- Treat all static teaching text as annotatable: headings, paragraphs, lists, tables, code, callouts, and visible expanded explanations.
- Exclude navigation, buttons, form controls, quiz controls, tooltips, the notes UI, hidden content, SVG, and canvas.
- Keep annotations independent from quiz completion and weak spots. Only a note explicitly tagged `question` may inform continuation.
- Do not add collaboration, cloud sync, comment threads, mentions, OCR, drawing, or arbitrary overlapping marks.

## 2. Runtime Integration

Generate the lesson content shell first, then inject the canonical runtime before validation:

```text
lesson.html.partial
  -> scripts/inject-courseware-runtime.mjs
  -> scripts/validate-courseware.mjs --tier <tier>
  -> atomic commit
```

The runtime source is:

- `assets/courseware-runtime/annotation-notes.css`
- `assets/courseware-runtime/annotation-notes.js`

Required lesson metadata:

```js
var LESSON_META = {
  courseId: "stable-course-id",
  lessonId: "lesson-01",
  annotationEnabled: true,
  annotationRuntimeVersion: "1",
  contentFingerprint: "sha256-of-normalized-annotatable-text"
};
```

Mark the teaching root with `data-lm-annotatable`. Give stable content blocks `data-lm-scope` or stable IDs. Add `data-lm-ignore` to any custom interactive region that the learner must not annotate. Runtime-created UI always carries `data-lm-ignore`.

The injected block contains version and SHA-256 markers. Injection is idempotent: replace an earlier LearnMap annotation runtime block instead of duplicating it. Never copy source from a CDN or ask the model to recreate it.

Public browser API:

```js
window.LearnMapAnnotations = {
  version: "1",
  init: function(meta) {},
  getSummary: function() {},
  clearLessonAnnotations: function() {},
  exportPackage: function() {},
  importPackage: function(file) {},
  exportMarkdown: function() {}
};
```

## 3. Selection And Underline Behavior

Use the Selection/Range APIs. Prefer CSS Custom Highlight because it does not mutate teaching DOM. When unavailable or when underline decoration is unreliable, draw pointer-transparent geometry from `Range.getClientRects()` in `.lm-overlay-layer`. Never make `<span>`, `<u>`, or `<mark>` wrapping the primary renderer.

Allowed styles:

- `solid`
- `dashed`
- `wavy`

Allowed colors: `amber`, `red`, `blue`, `cyan`, `green`, `violet`. Use both text labels and visual swatches; color alone never conveys meaning.

After a valid selection, show the compact `.lm-toolbar` near the selection. Provide current line style, current color, add note, remove mark, and a low-priority more menu. Remember the previous style. Escape closes the toolbar without changing the selection.

V1 permits one underline per character. A new mark replaces the overlapping part. Adjacent marks with identical style and color merge. Never silently discard an attached note during conflict resolution.

## 4. Notes And Images

Use a Feishu-inspired, LearnMap-branded layout:

- desktop: non-modal 360-400 px right drawer
- medium viewport: overlay drawer without shrinking teaching text below its readable width
- mobile: bottom sheet with 44 px minimum controls

Each note card includes section, source quote, style label, blocks, images, updated time, jump to source, edit, and delete actions. Clicking a card opens any required accordion/tab, scrolls to the anchor, and briefly flashes the source.

Store controlled blocks only:

- paragraph and small heading
- ordered or unordered list
- checklist
- quote
- code
- image with caption and alt text

Allow bold, italic, inline code, and `http`/`https` links. Normalize pasted rich text to the allowlist. Never persist or render arbitrary HTML.

Accept images from paste, drag/drop, or file input. Allow PNG, JPEG, and WebP only. Reject SVG, GIF, HTML, remote URLs, files above 5 MiB, and decoded images above 12 MP. Re-encode through canvas, strip metadata, and scale the longest edge to at most 1920 px. Require alt text or an explicit decorative flag.

## 5. Anchors And Recovery

Persist a compound anchor rather than live DOM nodes:

```json
{
  "scopeId": "s3-p2",
  "start": 18,
  "end": 34,
  "exact": "selected teaching text",
  "prefix": "nearby text before",
  "suffix": "nearby text after",
  "textFingerprint": "normalized-scope-hash"
}
```

Split a cross-block selection into segments under one annotation ID. Restore in this order:

1. scope plus position, verified against `exact`
2. unique `exact + prefix + suffix` match in the same scope
3. unique course-text match scored by context and scope proximity
4. `orphaned` when confidence is insufficient

Never bind to a merely similar passage. Preserve orphaned notes and offer reselect-to-rebind.

## 6. Persistence And Learning Records

Use IndexedDB database `learnmap-annotations-v1` with stores `annotations`, `notes`, `assets`, and `settings`. Use 350 ms debounced transactions and keep the last valid state after failure. If IndexedDB is unavailable, retain an in-memory session and keep export available.

For `file://`, report actual capability: `persisted`, `session-only`, or `save-failed`. Never promise cross-file persistence. Same-origin localhost/HTTPS pages may share a course database through `courseId`.

When storage usage reaches 70%, warn. At 85%, block new images but allow text notes, deletion, and export.

Keep `ai-10x-learning-record/v1`. Add only this optional summary:

```json
{
  "annotationSummary": {
    "underlineCount": 0,
    "noteCount": 0,
    "imageCount": 0,
    "questionNoteCount": 0,
    "orphanedCount": 0,
    "updatedAt": null
  }
}
```

Do not place full notes or images in the normal learning record. `resetLearningProgress()` resets quizzes/checklists only. Keep `resetAll()` as a compatibility alias that also preserves notes. `clearLessonAnnotations()` is a separate confirmed action that offers export first.

## 7. Portable Package

Export `<topic>-<lesson>-notes.learnmap` with MIME `application/vnd.learnmap.notes+zip`. It is a ZIP STORE container with:

```text
manifest.json
notes.json
assets/<uuid>.<ext>
```

Validate CRC, schema `learnmap-annotations/v1`, entry paths, counts, lengths, IDs, references, image signatures, decoded dimensions, and aggregate bytes before one atomic import transaction. Reject encryption, unsupported compression methods, traversal paths, duplicate entries, unsupported files, or malformed references. A failed import must not change existing notes.

Also offer an AI-readable Markdown export without binary image content. Warn that exported files may contain personal notes and screenshots.

## 8. Accessibility And Security

- Implement the toolbar as one Tab stop with arrow-key navigation, Enter/Space activation, and Escape dismissal.
- Keep the desktop drawer non-modal. Trap and restore focus only for the mobile modal sheet.
- Provide visible focus, named colors/styles, `aria-live` save/error status, reduced motion, forced-colors support, and at least 44 px touch targets.
- Render user strings with `textContent` and safe attributes. Never pass them to `innerHTML`, `outerHTML`, `document.write`, `eval`, or string event handlers.
- Allow no network upload, telemetry, remote font, script, editor, or image dependency.
- Revoke object URLs after image views are destroyed, not before images finish loading.

## 9. Validation Checklist

A current-contract page must have:

- canonical runtime markers, version, and matching hash
- `courseId`, annotation metadata, annotatable root, and stable scopes
- three styles, six named colors, toolbar, drawer, status, import/export, and orphan UI
- separate learning reset and annotation clear behavior
- `annotationSummary` without full notes/images in the learning record
- no remote dependency, arbitrary editable course root, or unsafe user-data HTML rendering

Run browser tests for Selection/Range, refresh, import/export, images, failure states, keyboard/touch, and all existing LearnMap interactions. Static token checks alone are insufficient.
