# Annotation And Notes Contract

Use this reference for every newly generated LearnMap lesson. The annotation runtime is a deterministic Skill asset, not model-written lesson code. Existing committed lessons remain untouched unless the learner explicitly requests regeneration.

Current contract: annotation runtime v2. Runtime v2 must read and migrate v1 annotation data and v1 `.learnmap` packages without requiring existing lessons to be regenerated.

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

Generate the lesson content shell first, then inject the canonical runtime before validation. Resolve all runtime scripts from the loaded LearnMap Skill root, not from the learner's current project directory:

```text
lesson.html.partial
  -> node "<loaded-learnmap-skill-root>/scripts/inject-courseware-runtime.mjs" "<partial-path>"
  -> node "<loaded-learnmap-skill-root>/scripts/validate-courseware.mjs" "<partial-path>" --tier <tier>
  -> atomic commit
```

`<loaded-learnmap-skill-root>` is the directory that contains the `SKILL.md` currently being followed. A target course/project directory usually does not contain `scripts/` or `assets/courseware-runtime/`; do not glob there. If the Skill root, injector, runtime assets, or validator cannot be located, stop with a blocker and do not publish the lesson.

The runtime source is:

- `assets/courseware-runtime/annotation-notes.css`
- `assets/courseware-runtime/annotation-notes.js`

Required lesson metadata:

```js
var LESSON_META = {
  courseId: "stable-course-id",
  lessonId: "lesson-01",
  annotationEnabled: true,
  annotationRuntimeVersion: "2",
  contentFingerprint: "sha256-of-normalized-annotatable-text"
};
```

Mark the teaching root with `data-lm-annotatable`. Give stable content blocks `data-lm-scope` or stable IDs. Add `data-lm-ignore` to any custom interactive region that the learner must not annotate. Runtime-created UI always carries `data-lm-ignore`.

The injected block contains version and SHA-256 markers. Injection is idempotent: replace an earlier LearnMap annotation runtime block instead of duplicating it. Never copy source from a CDN or ask the model to recreate it.

Public browser API:

```js
window.LearnMapAnnotations = {
  version: "2",
  init: function(meta) {},
  getSummary: function() {},
  clearLessonAnnotations: function() {},
  exportPackage: function() {},
  importPackage: function(file) {},
  exportMarkdown: function() {}
};
```

## 3. Selection, Underline, And Highlight Behavior

Use the Selection/Range APIs. Prefer CSS Custom Highlight because it does not mutate teaching DOM. When unavailable or when underline decoration is unreliable, draw pointer-transparent geometry from `Range.getClientRects()` in `.lm-overlay-layer`. Never make `<span>`, `<u>`, or `<mark>` wrapping the primary renderer.

Each annotation stores:

- `markType`: `underline` or `highlight`; missing legacy values mean `underline`
- `lineStyle`: `solid`, `dashed`, or `wavy`; only used for underline
- `color`: `amber`, `red`, `blue`, `cyan`, `green`, `violet`, or `custom`
- `customColor`: optional exact `#RRGGBB`, used only when `color` is `custom`
- note `surfaceColor`: optional exact `#RRGGBB`; missing values fall back to `#FFFFFF`

Allowed underline styles:

- `solid`
- `dashed`
- `wavy`

Default mark colors: `amber`, `red`, `blue`, `cyan`, `green`, `violet`. Also accept custom hex colors in exact `#RRGGBB` form for marks and note surfaces. Use both text labels and visual swatches; color alone never conveys meaning. Reject invalid hex strings instead of normalizing ambiguous input.

After a valid selection, show a compact Feishu-style `.lm-toolbar` near the selection. Keep it icon-led: underline, highlight, line-style dropdown, color dropdown with custom `#RRGGBB` entry, add note, remove mark, and a low-priority more menu. Do not show all default colors as a long always-visible row; open a small dropdown/popover for color selection. Remember the previous mark type, line style, mark color, and note surface. Escape closes transient UI without changing the selection.

V2 permits one learner mark per character. Underline and highlight are mutually exclusive: a new mark replaces the overlapping part. Adjacent marks with identical `markType`, `lineStyle`, and `color` merge. Never silently discard an attached note during conflict resolution. Missing legacy v1 values migrate to `underline`, `solid`, and a valid default color.

## 4. Notes And Images

Use a Feishu-inspired, LearnMap-branded layout, but keep the reading surface centered on the original text:

- desktop: anchored source popovers, the floating editor, and the floating notes manager are the only note surfaces
- medium viewport: floating manager may become a lightweight overlay, but it must not behave as a side drawer or shrink teaching text below its readable width
- mobile: bottom sheet with 44 px minimum controls

Completely forbid note side drawers. Do not create a right drawer, left drawer, slide-out note rail, or any persistent side panel for notes. This prohibition does not affect the lesson table-of-contents: the existing `.toc` lesson navigation remains allowed and required by the lesson scaffold.

When a mark has a note, the marked source text receives a subtle note icon. Hovering the marked text or icon shows a compact anchored popover near the source. Clicking the note icon toggles expand/collapse for the anchored popover; clicking blank page space collapses it. The expanded popover shows the source quote, note preview, image count or thumbnails, note surface color, and edit/jump/delete controls.

The anchored floating editor is required and complete. Its primary desktop surface is a compact white note card, approximately 360-380 px wide, with a restrained shadow, dark readable text, and no nested form-card treatment. The top toolbar exposes bold, italic, underline, ordered list, unordered list, an image icon, and close. The body is a quiet borderless writing surface; the footer exposes delete, the note-surface color/options dot, and a high-contrast save action. It opens from selected text or an existing note icon, stays positioned near the anchor when possible, and supports writing text, pasting text, copying text, uploading images from the image icon, pasting clipboard images directly into the writing surface, copying images, adding captions/alt text, choosing default white/pastel note surfaces, choosing custom `#RRGGBB` note surfaces, saving, canceling, deleting, and export-first clear flows. Keep block type, question tagging, image alt/decorative controls, and color presets in a compact secondary options popover instead of displaying the old full form by default.

The floating notes manager is required. It is a movable or popover-style manager, never a side drawer. It supports search, import/export, orphan rebind, bulk review, jump to source, edit, delete, and copy text/images from notes. Keep it terse by default; show the editor only when creating or editing a note.

Each note card includes section, source quote, mark label, surface swatch, blocks, images, updated time, jump to source, edit, copy, and delete actions. Clicking a card opens any required accordion/tab, scrolls to the anchor, and briefly flashes the source.

Store controlled blocks only:

- paragraph and small heading
- ordered or unordered list
- checklist
- quote
- code
- image with caption and alt text

Allow bold, italic, underline, ordered lists, unordered lists, inline code, and `http`/`https` links. Toolbar formatting must update the actual note text and render through the safe allowlist parser; it must not depend on `contenteditable` HTML. Normalize pasted rich text to the allowlist. Never persist or render arbitrary HTML.

Accept images from paste, drag/drop, or file input. The image toolbar icon must open the native file picker, and a clipboard image pasted while the note writing surface is focused must enter the same sanitized preview/save pipeline without disturbing ordinary text paste. Allow PNG, JPEG, and WebP only. Reject SVG, GIF, HTML, remote URLs, files above 5 MiB, and decoded images above 12 MP. Re-encode through canvas, strip metadata, and scale the longest edge to at most 1920 px. Require alt text or an explicit decorative flag. Copying an image back to the clipboard should use the sanitized stored blob when the browser permits it; otherwise provide a clear save/export fallback.

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

Runtime API v2 intentionally keeps IndexedDB database `learnmap-annotations-v1` with stores `annotations`, `notes`, `assets`, and `settings`. Add v2 fields as optional record extensions so existing lessons load without a destructive database migration. Use 350 ms debounced transactions and keep the last valid state after failure. If IndexedDB is unavailable, retain an in-memory session and keep export available.

For `file://`, report actual capability: `persisted`, `session-only`, or `save-failed`. Never promise cross-file persistence. Same-origin localhost/HTTPS pages may share a course database through `courseId`.

When storage usage reaches 70%, warn. At 85%, block new images but allow text notes, deletion, and export.

Keep `ai-10x-learning-record/v1`. Add only this optional summary:

```json
{
  "annotationSummary": {
    "underlineCount": 0,
    "highlightCount": 0,
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

Keep package schema `learnmap-annotations/v1`. Validate CRC, schema, entry paths, counts, lengths, IDs, references, optional runtime-v2 fields, image signatures, decoded dimensions, and aggregate bytes before one atomic import transaction. Missing v2 fields fall back to named mark colors and a white note surface. Reject encryption, unsupported compression methods, traversal paths, duplicate entries, unsupported files, or malformed references. A failed import must not change existing notes.

Also offer an AI-readable Markdown export without binary image content. Warn that exported files may contain personal notes and screenshots.

## 8. Accessibility And Security

- Implement the toolbar as one Tab stop with arrow-key navigation, Enter/Space activation, and Escape dismissal.
- The floating editor and floating manager must have visible focus order and Escape dismissal. Trap and restore focus only for the mobile modal sheet.
- Provide visible focus, named colors/styles, `aria-live` save/error status, reduced motion, and forced-colors support. Compact desktop toolbar controls may be 32 px to stay within 260 px; mobile and touch-oriented sheet controls must be at least 44 px.
- Render user strings with `textContent` and safe attributes. Never pass them to `innerHTML`, `outerHTML`, `document.write`, `eval`, or string event handlers.
- Allow no network upload, telemetry, remote font, script, editor, or image dependency.
- Revoke object URLs after image views are destroyed, not before images finish loading.

## 9. Validation Checklist

A current-contract page must have:

- canonical runtime markers, version, and matching hash
- `courseId`, annotation metadata, annotatable root, and stable scopes
- runtime v2 metadata/API, v1 data/package migration, three underline styles, default plus custom `#RRGGBB` mark colors, mark toolbar, compact white B/I/U/list/image note card, file-picker and clipboard image flows, floating notes manager, status, import/export, and orphan UI
- separate learning reset and annotation clear behavior
- `annotationSummary` without full notes/images in the learning record
- no note side drawer, remote dependency, arbitrary editable course root, or unsafe user-data HTML rendering

Run browser tests for Selection/Range, refresh, import/export, images, failure states, keyboard/touch, and all existing LearnMap interactions. Static token checks alone are insufficient.
