(() => {
  "use strict";

  const API_VERSION = "2";
  const DB_NAME = "learnmap-annotations-v1";
  const DB_VERSION = 1;
  const PACKAGE_SCHEMA = "learnmap-annotations/v1";
  const PACKAGE_VERSION = 1;
  const PACKAGE_LIMIT_BYTES = 64 * 1024 * 1024;
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const MAX_IMAGE_PIXELS = 12 * 1024 * 1024;
  const MAX_IMAGE_EDGE = 1920;
  const SAVE_DELAY_MS = 350;
  const STYLE_KEYS = ["solid", "dashed", "wavy"];
  const COLOR_KEYS = ["amber", "red", "blue", "cyan", "green", "violet", "custom"];
  const NAMED_COLORS = {
    amber: "#c78b00",
    red: "#dc3a36",
    blue: "#246bfd",
    cyan: "#0089a7",
    green: "#16855b",
    violet: "#7f4bd8"
  };
  const SURFACE_COLORS = {
    white: "#FFFFFF",
    blue: "#EAF2FF",
    mint: "#ECFDF3",
    yellow: "#FFF7D6",
    pink: "#FFF0F3",
    purple: "#F5F3FF"
  };
  const BLOCK_TYPES = new Set(["paragraph", "heading", "ordered-list", "unordered-list", "checklist", "quote", "code", "image"]);
  const ID_RE = /^[A-Za-z0-9._-]{1,160}$/;

  const state = {
    meta: null,
    root: null,
    annotations: [],
    notes: [],
    assets: [],
    settings: {
      markType: "underline",
      style: "solid",
      color: "amber",
      customColor: "#C78B00"
    },
    pending: null,
    pendingGroupId: null,
    activeId: null,
    editingNoteId: null,
    rebindId: null,
    pendingBlocks: [],
    pendingAssets: [],
    db: null,
    storage: "session-only",
    saveTimer: null,
    lastErrorAt: 0,
    highlightNames: [],
    undo: [],
    ui: {},
    previewId: null,
    previewReturnFocus: null,
    imageLightboxReturnFocus: null,
    editorReturnFocus: null,
    editorSnapshot: null,
    initialized: false
  };

  function now() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function cleanText(value) {
    return `${value ?? ""}`.replace(/\s+/g, " ").trim();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function bytes(value) {
    return new TextEncoder().encode(`${value ?? ""}`);
  }

  let crcTable = null;
  function crc32(input) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    const data = typeof input === "string" ? bytes(input) : input;
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i += 1) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return ((0xffffffff ^ c) >>> 0).toString(16).padStart(8, "0");
  }

  function buildAnchor(input) {
    const text = `${input.text || ""}`;
    const start = Math.max(0, Math.min(text.length, Number(input.start) || 0));
    const end = Math.max(start, Math.min(text.length, Number(input.end) || start));
    return {
      scopeId: `${input.scopeId || ""}`,
      start,
      end,
      exact: text.slice(start, end),
      prefix: text.slice(Math.max(0, start - 48), start),
      suffix: text.slice(end, end + 48),
      textFingerprint: input.textFingerprint || crc32(cleanText(text))
    };
  }

  function findMatches(text, needle) {
    const out = [];
    if (!needle) return out;
    let index = 0;
    while ((index = text.indexOf(needle, index)) !== -1) {
      out.push(index);
      index += Math.max(1, needle.length);
    }
    return out;
  }

  function resolveAnchor(anchor, scopes) {
    const source = anchor || {};
    const candidates = Array.isArray(scopes) ? scopes : [];
    const sameScope = candidates.find((scope) => scope.scopeId === source.scopeId);
    if (sameScope && sameScope.text.slice(source.start, source.end) === source.exact) {
      return { scopeId: sameScope.scopeId, start: source.start, end: source.end, status: "anchored", method: "position" };
    }
    const scoreIn = (pool) => {
      const matches = [];
      pool.forEach((scope) => {
        findMatches(scope.text, source.exact).forEach((start) => {
          const prefix = scope.text.slice(Math.max(0, start - `${source.prefix || ""}`.length), start);
          const suffix = scope.text.slice(start + source.exact.length, start + source.exact.length + `${source.suffix || ""}`.length);
          let score = 0;
          if (source.prefix && prefix === source.prefix) score += 3;
          if (source.suffix && suffix === source.suffix) score += 3;
          if (scope.scopeId === source.scopeId) score += 2;
          matches.push({ scopeId: scope.scopeId, start, end: start + source.exact.length, score });
        });
      });
      matches.sort((a, b) => b.score - a.score);
      if (!matches.length) return null;
      if (matches.length > 1 && matches[0].score === matches[1].score) return null;
      return matches[0];
    };
    const same = sameScope ? scoreIn([sameScope]) : null;
    const any = same || scoreIn(candidates);
    if (any) return { scopeId: any.scopeId, start: any.start, end: any.end, status: "anchored", method: same ? "quote-context" : "course-quote" };
    return { scopeId: null, start: null, end: null, status: "orphaned", method: "none" };
  }

  function normalizeHex(value, fallback = "#C78B00") {
    const text = `${value || ""}`.trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toUpperCase() : fallback;
  }

  function contrastColor(value) {
    const hex = normalizeHex(value, "#FFFFFF").slice(1);
    const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((channel) => (
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    return luminance > 0.45 ? "#1F2329" : "#FFFFFF";
  }

  function uiText(english, chinese) {
    return /^zh(?:-|$)/iu.test(document.documentElement.lang || "") ? chinese : english;
  }

  function placeFloating(element, rect, { width = 380, gap = 10, avoid = [] } = {}) {
    const margin = 8;
    const measuredWidth = Math.min(width, innerWidth - margin * 2);
    const measuredHeight = Math.min(element.offsetHeight || 320, innerHeight - margin * 2);
    const clampLeft = (value) => Math.max(margin, Math.min(value, innerWidth - measuredWidth - margin));
    const clampTop = (value) => Math.max(margin, Math.min(value, innerHeight - measuredHeight - margin));
    const blockers = Array.from(avoid).map((item) => item?.getBoundingClientRect?.() || item).filter(Boolean);
    const candidates = [
      { left: rect.left, top: rect.bottom + gap },
      { left: rect.left, top: rect.top - measuredHeight - gap },
      { left: rect.right + gap, top: rect.top },
      { left: rect.left - measuredWidth - gap, top: rect.top }
    ].map((candidate) => {
      const left = clampLeft(candidate.left);
      const top = clampTop(candidate.top);
      return { left, top, right: left + measuredWidth, bottom: top + measuredHeight };
    });
    const chosen = candidates.find((candidate) => !blockers.some((blocker) => boxesOverlap(candidate, blocker, 2))) || candidates[0];
    Object.assign(element.style, { left: `${chosen.left + scrollX}px`, top: `${chosen.top + scrollY}px` });
  }

  function markColor(annotation) {
    if ((annotation.color || state.settings.color) === "custom") return normalizeHex(annotation.customColor || state.settings.customColor);
    return NAMED_COLORS[annotation.color] || NAMED_COLORS.amber;
  }

  function normalizeAnnotation(annotation) {
    annotation.markType = annotation.markType === "highlight" ? "highlight" : "underline";
    annotation.lineStyle = STYLE_KEYS.includes(annotation.lineStyle || annotation.style) ? annotation.lineStyle || annotation.style : "solid";
    annotation.style = annotation.lineStyle;
    annotation.color = COLOR_KEYS.includes(annotation.color) ? annotation.color : "amber";
    annotation.customColor = normalizeHex(annotation.customColor || state.settings.customColor);
    return annotation;
  }

  function mergeAnnotations(items) {
    const list = (Array.isArray(items) ? items : []).map(clone).map(normalizeAnnotation).sort((a, b) => {
      const scope = `${a.scopeId || ""}`.localeCompare(`${b.scopeId || ""}`);
      return scope || ((a.anchor && a.anchor.start) || 0) - ((b.anchor && b.anchor.start) || 0);
    });
    const out = [];
    list.forEach((item) => {
      const prev = out[out.length - 1];
      const canMerge = prev &&
        prev.scopeId === item.scopeId &&
        prev.markType === item.markType &&
        prev.lineStyle === item.lineStyle &&
        prev.color === item.color &&
        prev.customColor === item.customColor &&
        !prev.noteId &&
        !item.noteId &&
        prev.anchor &&
        item.anchor &&
        prev.anchor.end === item.anchor.start;
      if (!canMerge) {
        out.push(item);
        return;
      }
      prev.anchor.end = item.anchor.end;
      prev.anchor.exact = `${prev.anchor.exact || ""}${item.anchor.exact || ""}`;
      prev.anchor.suffix = item.anchor.suffix || prev.anchor.suffix;
      prev.updatedAt = item.updatedAt || prev.updatedAt;
    });
    return out;
  }

  function validateImport(data) {
    const errors = [];
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, errors: ["Import must be an object."] };
    const normalized = clone(data);
    normalized.courseId = normalized.courseId || normalized.lesson?.courseId;
    normalized.lessonId = normalized.lessonId || normalized.lesson?.lessonId;
    normalized.annotations = Array.isArray(normalized.annotations) ? normalized.annotations.map((item) => {
      if (!item || typeof item !== "object") return item;
      const color = `${item.color || "amber"}`;
      const directCustomColor = /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null;
      return {
        ...item,
        lineStyle: item.lineStyle || item.style || "solid",
        style: item.lineStyle || item.style || "solid",
        color: directCustomColor ? "custom" : color,
        customColor: directCustomColor || item.customColor
      };
    }) : normalized.annotations;
    normalized.notes = Array.isArray(normalized.notes) ? normalized.notes.map((item) => {
      if (!item || typeof item !== "object") return item;
      const surface = item.surfaceColor ?? item.surface ?? "#FFFFFF";
      const blocks = Array.isArray(item.blocks) ? item.blocks.map((block) => (
        block && isListBlock(block.type) ? { ...block, text: normalizeBlockText(block.type, block.text) } : block
      )) : item.blocks;
      const assetIds = Array.from(new Set([
        ...(Array.isArray(item.assetIds) ? item.assetIds : []),
        ...(Array.isArray(blocks) ? blocks.filter((block) => block?.type === "image" && block.assetId).map((block) => block.assetId) : [])
      ]));
      return { ...item, blocks, assetIds, surfaceColor: /^#[0-9a-f]{6}$/i.test(surface) ? surface.toUpperCase() : surface };
    }) : normalized.notes;

    if (normalized.schema !== PACKAGE_SCHEMA) errors.push("Unsupported schema.");
    if (normalized.version !== PACKAGE_VERSION) errors.push("Unsupported version.");
    if (typeof normalized.courseId !== "string" || !normalized.courseId || typeof normalized.lessonId !== "string" || !normalized.lessonId) errors.push("Invalid course or lesson id.");
    if (!Array.isArray(normalized.annotations)) errors.push("annotations must be an array.");
    if (!Array.isArray(normalized.notes)) errors.push("notes must be an array.");
    if (!Array.isArray(normalized.assets)) errors.push("assets must be an array.");
    if ((normalized.annotations || []).length > 10000 || (normalized.notes || []).length > 5000 || (normalized.assets || []).length > 1000) errors.push("Import entry count exceeds limits.");

    const seen = new Set();
    const annotationIds = new Set((normalized.annotations || []).map((item) => item && item.id));
    const noteIds = new Set((normalized.notes || []).map((item) => item && item.id));
    const assetIds = new Set((normalized.assets || []).map((item) => item && item.id));

    (normalized.annotations || []).forEach((item) => {
      if (!item || typeof item.id !== "string" || !ID_RE.test(item.id) || seen.has(item.id)) errors.push("Invalid or duplicate annotation id.");
      else seen.add(item.id);
      const colorOk = COLOR_KEYS.includes(item.color) && (item.color !== "custom" || /^#[0-9a-f]{6}$/i.test(item.customColor || ""));
      if (!item.anchor || typeof item.anchor.exact !== "string" || item.anchor.exact.length > 200000 || !["underline", "highlight", undefined, null].includes(item.markType) || !STYLE_KEYS.includes(item.lineStyle || item.style || "solid") || !colorOk) errors.push("Invalid annotation.");
      if (item.noteId && !noteIds.has(item.noteId)) errors.push("Dangling note reference.");
    });
    (normalized.notes || []).forEach((item) => {
      if (!item || typeof item.id !== "string" || !ID_RE.test(item.id) || seen.has(item.id)) errors.push("Invalid or duplicate note id.");
      else seen.add(item.id);
      if (typeof item.text !== "string" || item.text.length > 200000) errors.push("Invalid note text.");
      if (!annotationIds.has(item.annotationId)) errors.push("Dangling annotation reference.");
      if (item.surfaceColor && !/^#[0-9a-f]{6}$/i.test(item.surfaceColor)) errors.push("Invalid note surface color.");
      if (item.blocks != null && !Array.isArray(item.blocks)) errors.push("Note blocks must be an array.");
      if (Array.isArray(item.blocks) && item.blocks.some((block) => !block || !BLOCK_TYPES.has(block.type))) errors.push("Unsupported note block.");
      (item.assetIds || []).forEach((id) => {
        if (!assetIds.has(id)) errors.push("Dangling asset reference.");
      });
    });
    (normalized.assets || []).forEach((item) => {
      if (!item || typeof item.id !== "string" || !ID_RE.test(item.id) || seen.has(item.id)) errors.push("Invalid or duplicate asset id.");
      else seen.add(item.id);
      if (!/^(image\/png|image\/jpeg|image\/webp)$/.test(item.mime || "")) errors.push("Unsupported asset type.");
      if (!Number.isInteger(item.bytes) || item.bytes <= 0 || item.bytes > MAX_IMAGE_BYTES || !Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width <= 0 || item.height <= 0 || item.width * item.height > MAX_IMAGE_PIXELS) {
        errors.push("Invalid asset dimensions or size.");
      }
    });
    return errors.length ? { ok: false, errors } : { ok: true, errors: [], value: normalized };
  }

  function createElement(tag, attrs, text) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === false || value == null) return;
      if (key === "class") el.className = value;
      else if (key === "testid") el.dataset.testid = value;
      else if (key === "htmlFor") el.htmlFor = value;
      else if (key === "hidden" && value) el.hidden = true;
      else el.setAttribute(key, value === true ? "" : value);
    });
    if (text != null) el.textContent = text;
    return el;
  }

  function button(label, testid, handler, attrs = {}) {
    const el = createElement("button", { type: "button", "aria-label": label, testid, ...attrs }, label);
    el.addEventListener("click", handler);
    return el;
  }

  function status(message, type = "ok") {
    if (type === "error") state.lastErrorAt = Date.now();
    else if (Date.now() - state.lastErrorAt < 5000) return;
    if (state.ui.status) {
      state.ui.status.textContent = message;
      state.ui.status.dataset.status = type;
    }
  }

  function toast(message) {
    if (!state.ui.toasts) return;
    const el = createElement("div", { class: "lm-toast", role: "status" }, message);
    state.ui.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function storageKey() {
    return `learnmap:annotations:${state.meta.courseId}:${state.meta.lessonId}`;
  }

  function rememberUndo() {
    state.undo.push({ annotations: clone(state.annotations), notes: clone(state.notes), assets: clone(state.assets) });
    if (state.undo.length > 20) state.undo.shift();
  }

  function textNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      if (parent.closest("[data-lm-ignore],.lm-ui,[hidden],nav,button,input,textarea,select,option,svg,canvas,.mini-quiz,.tooltip,[role=button],[contenteditable=true]")) continue;
      nodes.push(node);
    }
    return nodes;
  }

  function scopeId(el) {
    return el.dataset.lmScope || el.id || "lesson-root";
  }

  function collectScopes() {
    if (!state.root) return [];
    const nodes = Array.from(state.root.querySelectorAll("[data-lm-scope], [id]"));
    if (state.root.matches("[data-lm-scope], [id]")) nodes.unshift(state.root);
    const unique = nodes.filter((el, index) => {
      if (el.closest("[data-lm-ignore],.lm-ui")) return false;
      const id = scopeId(el);
      return nodes.findIndex((candidate) => scopeId(candidate) === id) === index;
    });
    return unique.map((el) => ({ scopeId: scopeId(el), text: textNodes(el).map((node) => node.data).join(""), element: el }));
  }

  function pointAt(root, offset) {
    const nodes = textNodes(root);
    let seen = 0;
    for (const node of nodes) {
      const next = seen + node.data.length;
      if (offset <= next) return { node, offset: Math.max(0, offset - seen) };
      seen = next;
    }
    return { node: root, offset: root.childNodes.length };
  }

  function rangeFor(root, start, end) {
    const a = pointAt(root, start);
    const b = pointAt(root, end);
    const range = document.createRange();
    try {
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
      return range;
    } catch {
      return null;
    }
  }

  function selectionSegments(range) {
    const segments = [];
    collectScopes().forEach((scope) => {
      let start = null;
      let end = null;
      let offset = 0;
      textNodes(scope.element).forEach((node) => {
        const nodeStart = offset;
        const nodeEnd = offset + node.data.length;
        offset = nodeEnd;
        try {
          if (!range.intersectsNode(node)) return;
        } catch {
          return;
        }
        let localStart = 0;
        let localEnd = node.data.length;
        if (node === range.startContainer) localStart = range.startOffset;
        if (node === range.endContainer) localEnd = range.endOffset;
        if (localEnd > localStart) {
          if (start == null) start = nodeStart + localStart;
          end = nodeStart + localEnd;
        }
      });
      if (start != null && end > start && cleanText(scope.text.slice(start, end))) {
        segments.push({ scope: scope.element, anchor: buildAnchor({ scopeId: scope.scopeId, text: scope.text, start, end }) });
      }
    });
    return segments.filter((segment) => !segments.some((other) => other !== segment && segment.scope.contains(other.scope)));
  }

  function closeToolbar() {
    state.ui.toolbar?.classList.remove("open");
    if (state.ui.toolbar) state.ui.toolbar.dataset.open = "false";
    closeMenus();
  }

  function closePreview(options = {}) {
    state.ui.popover?.classList.remove("open");
    if (state.ui.popover) state.ui.popover.dataset.pinned = "false";
    state.previewId = null;
    document.querySelectorAll('.lm-note-hit[aria-expanded="true"]').forEach((hit) => hit.setAttribute("aria-expanded", "false"));
    if (options.restoreFocus) {
      const target = state.previewReturnFocus;
      state.previewReturnFocus = null;
      target?.setAttribute?.("aria-expanded", "false");
      target?.focus?.({ preventScroll: true });
    }
  }

  function editorDraft() {
    if (!state.ui.editor) return "";
    return JSON.stringify({
      text: state.ui.textarea.value,
      blockType: state.ui.blockType.value,
      blocks: state.pendingBlocks,
      assets: state.pendingAssets.map((asset) => asset.id),
      question: state.ui.question.checked,
      surface: state.ui.surface.value,
      alt: state.ui.alt.value,
      decorative: state.ui.decorative.checked
    });
  }

  function closeEditor({ force = false, restoreFocus = true } = {}) {
    if (state.ui.editor?.classList.contains("open") && !force && state.editorSnapshot !== editorDraft() && !confirm("Discard the unsaved note draft?")) return false;
    state.ui.editor?.classList.remove("open");
    state.ui.editor?.setAttribute("aria-hidden", "true");
    if (state.ui.options) {
      state.ui.options.hidden = true;
      state.ui.options.setAttribute("aria-hidden", "true");
    }
    state.ui.optionsToggle?.setAttribute("aria-expanded", "false");
    state.editingNoteId = null;
    state.pendingBlocks = [];
    state.pendingAssets = [];
    state.editorSnapshot = null;
    const target = state.editorReturnFocus;
    state.editorReturnFocus = null;
    if (restoreFocus) target?.focus?.({ preventScroll: true });
    return true;
  }

  function closeManager() {
    state.ui.manager?.classList.remove("open");
    state.ui.manager?.setAttribute("aria-modal", "false");
    state.ui.lastFocus?.focus?.();
  }

  function repositionOpenPanel() {
    const mobile = innerWidth < 768;
    if (state.ui.editor?.classList.contains("open")) {
      state.ui.editor.dataset.layout = mobile ? "bottom-sheet" : "anchored";
      const annotation = state.annotations.find((item) => item.id === state.activeId);
      const rect = annotation && selectionRectFor(annotation);
      if (rect) placeFloating(state.ui.editor, rect, { width: 380 });
    }
    if (state.ui.manager?.classList.contains("open")) {
      state.ui.manager.dataset.layout = mobile ? "bottom-sheet" : "floating";
      state.ui.manager.setAttribute("aria-modal", mobile ? "true" : "false");
    }
    if (state.ui.popover?.classList.contains("open")) {
      const hit = Array.from(document.querySelectorAll(".lm-note-hit")).find((item) => item.dataset.annId === state.previewId);
      if (hit) placeFloating(state.ui.popover, hit.getBoundingClientRect(), { width: 320, avoid: document.querySelectorAll(".lm-note-hit") });
    }
  }

  function openOne(panel) {
    if (panel !== "editor" && !closeEditor()) return false;
    if (panel !== "manager") closeManager();
    if (panel !== "preview") closePreview();
    if (panel !== "lightbox") closeImageLightbox({ restoreFocus: false });
    closeToolbar();
    return true;
  }

  function syncToolbarState() {
    if (!state.ui.toolbar) return;
    state.ui.toolbar.querySelectorAll("[data-mark-type]").forEach((el) => el.setAttribute("aria-pressed", `${el.dataset.markType === state.settings.markType}`));
    state.ui.toolbar.querySelectorAll("[data-style]").forEach((el) => el.setAttribute("aria-pressed", `${el.dataset.style === state.settings.style}`));
    state.ui.toolbar.querySelectorAll("[data-color]").forEach((el) => el.setAttribute("aria-pressed", `${el.dataset.color === state.settings.color}`));
    const custom = state.ui.toolbar.querySelector(".lm-custom-color");
    if (custom) custom.value = normalizeHex(state.settings.customColor);
    state.ui.toolbar.querySelector(".lm-current-color")?.style.setProperty("--lm-swatch", markColor(state.settings));
  }

  function saveSettings() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify({ settings: state.settings }));
    } catch {
      /* localStorage can be unavailable on some file contexts. */
    }
  }

  function queueSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
  }

  function putAll(snapshot) {
    if (!state.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const stores = ["annotations", "notes", "assets"];
      const tx = state.db.transaction([...stores, "settings"], "readwrite");
      stores.forEach((name) => {
        const store = tx.objectStore(name);
        const all = store.getAll();
        all.onsuccess = () => {
          all.result
            .filter((item) => item.courseId === state.meta.courseId && item.lessonId === state.meta.lessonId)
            .forEach((item) => store.delete(item.id));
          (snapshot[name] || []).forEach((item) => store.put(item));
        };
      });
      tx.objectStore("settings").put({ id: storageKey(), courseId: state.meta.courseId, lessonId: state.meta.lessonId, value: snapshot.settings || state.settings });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  async function storageUsage() {
    try {
      const estimate = await navigator.storage.estimate();
      return estimate.quota ? estimate.usage / estimate.quota : 0;
    } catch {
      return 0;
    }
  }

  async function saveNow() {
    if (!state.db) {
      status(state.storage === "save-failed" ? "Save failed. Export now." : "Session-only notes. Export for backup.", state.storage === "save-failed" ? "error" : "ok");
      return;
    }
    try {
      await putAll({ annotations: state.annotations, notes: state.notes, assets: state.assets, settings: state.settings });
      state.storage = "persisted";
      const usage = await storageUsage();
      if (usage >= 0.85) status("Saved locally. Storage is above 85%; delete or export images.", "error");
      else status(usage >= 0.7 ? "Saved locally. Storage is above 70%." : "Saved locally.");
    } catch {
      state.storage = "save-failed";
      status("Save failed. Export now.", "error");
    }
  }

  function getAll(store) {
    return new Promise((resolve, reject) => {
      const request = state.db.transaction(store, "readonly").objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        ["annotations", "notes", "assets", "settings"].forEach((name) => {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB failed"));
    });
  }

  async function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()) || "null");
      if (saved) state.settings = { ...state.settings, ...(saved.settings || {}) };
    } catch {
      /* ignored */
    }
    try {
      state.db = await openDb();
      const [annotations, notes, assets, settings] = await Promise.all([getAll("annotations"), getAll("notes"), getAll("assets"), getAll("settings")]);
      const here = (item) => item.courseId === state.meta.courseId && item.lessonId === state.meta.lessonId;
      const merge = (current, stored) => current.filter((item) => !stored.some((other) => other.id === item.id)).concat(stored);
      const hadMemoryState = Boolean(state.annotations.length || state.notes.length || state.assets.length);
      state.annotations = merge(state.annotations, annotations.filter(here)).map(normalizeAnnotation);
      state.notes = merge(state.notes, notes.filter(here)).map((note) => {
        const blocks = Array.isArray(note.blocks) && note.blocks.length
          ? note.blocks.map((block) => block && isListBlock(block.type) ? { ...block, text: normalizeBlockText(block.type, block.text) } : block)
          : note.text ? [{ type: "paragraph", text: note.text }] : [];
        const assetIds = Array.from(new Set([
          ...(Array.isArray(note.assetIds) ? note.assetIds : []),
          ...blocks.filter((block) => block?.type === "image" && block.assetId).map((block) => block.assetId)
        ]));
        return { surfaceColor: "#FFFFFF", ...note, blocks, assetIds, surfaceColor: normalizeHex(note.surfaceColor, "#FFFFFF") };
      });
      state.assets = merge(state.assets, assets.filter(here));
      const savedSettings = settings.find((item) => item.id === storageKey());
      if (savedSettings) state.settings = { ...state.settings, ...(savedSettings.value || {}) };
      state.storage = "persisted";
      if (Date.now() - state.lastErrorAt > 5000) status("Saved locally.");
      renderAll();
      syncToolbarState();
      if (hadMemoryState) queueSave();
    } catch {
      state.storage = "session-only";
      status(location.protocol === "file:" ? "Session-only in this browser. Export regularly." : "Session-only notes. Export for backup.", "error");
    }
  }

  function applyMark(options = {}) {
    if (options.markType) state.settings.markType = options.markType === "highlight" ? "highlight" : "underline";
    if (STYLE_KEYS.includes(options.style)) {
      state.settings.style = options.style;
      state.settings.markType = "underline";
    }
    if (COLOR_KEYS.includes(options.color)) state.settings.color = options.color;
    if (options.customColor) {
      state.settings.customColor = normalizeHex(options.customColor);
      state.settings.color = "custom";
    }
    saveSettings();
    syncToolbarState();

    if (state.pending?.segments?.length > 1) {
      const groupId = uid("ann-group");
      const original = state.pending;
      state.pendingGroupId = groupId;
      original.segments.forEach((segment) => {
        state.pending = segment;
        state.activeId = null;
        applyMark({});
      });
      state.pending = original;
      state.pendingGroupId = null;
      return;
    }

    rememberUndo();
    let annotation = state.annotations.find((item) => item.id === state.activeId);
    if (annotation) {
      annotation.markType = state.settings.markType;
      annotation.lineStyle = state.settings.style;
      annotation.style = state.settings.style;
      annotation.color = state.settings.color;
      annotation.customColor = normalizeHex(state.settings.customColor);
      annotation.updatedAt = now();
    } else if (state.pending) {
      const anchor = state.pending.anchor;
      const scope = collectScopes().find((item) => item.scopeId === anchor.scopeId);
      const overlaps = state.annotations.filter((item) => item.scopeId === anchor.scopeId && item.anchor.start < anchor.end && anchor.start < item.anchor.end);
      const noteIds = overlaps.map((item) => item.noteId).filter(Boolean);
      if (new Set(noteIds).size > 1) {
        status("The selection overlaps multiple notes. Adjust them separately.", "error");
        toast("Cannot merge multiple attached notes.");
        return;
      }
      const replacements = [];
      overlaps.forEach((item) => {
        if (!scope) return;
        if (item.anchor.start < anchor.start) {
          replacements.push({ ...item, id: uid("ann"), noteId: null, anchor: buildAnchor({ scopeId: anchor.scopeId, text: scope.text, start: item.anchor.start, end: anchor.start }), updatedAt: now() });
        }
        if (item.anchor.end > anchor.end) {
          replacements.push({ ...item, id: uid("ann"), noteId: null, anchor: buildAnchor({ scopeId: anchor.scopeId, text: scope.text, start: anchor.end, end: item.anchor.end }), updatedAt: now() });
        }
      });
      state.annotations = state.annotations.filter((item) => !overlaps.includes(item)).concat(replacements);
      annotation = {
        id: uid("ann"),
        courseId: state.meta.courseId,
        lessonId: state.meta.lessonId,
        scopeId: anchor.scopeId,
        anchor: clone(anchor),
        markType: state.settings.markType,
        lineStyle: state.settings.style,
        style: state.settings.style,
        color: state.settings.color,
        customColor: normalizeHex(state.settings.customColor),
        noteId: noteIds[0] || null,
        groupId: state.pendingGroupId,
        createdAt: now(),
        updatedAt: now()
      };
      state.annotations.push(annotation);
      state.activeId = annotation.id;
      if (noteIds.length) state.notes.forEach((note) => {
        if (noteIds.includes(note.id)) note.annotationId = annotation.id;
      });
    }
    state.annotations = mergeAnnotations(state.annotations);
    renderAll();
    queueSave();
  }

  function removeMark() {
    if (!state.activeId) return;
    rememberUndo();
    const active = state.annotations.find((item) => item.id === state.activeId);
    const ids = active?.groupId ? state.annotations.filter((item) => item.groupId === active.groupId).map((item) => item.id) : [state.activeId];
    const deletedNotes = state.notes.filter((note) => ids.includes(note.annotationId) || (active?.groupId && note.groupId === active.groupId));
    const deletedAssets = new Set(deletedNotes.flatMap(noteAssetIds));
    state.annotations = state.annotations.filter((item) => !ids.includes(item.id));
    state.notes = state.notes.filter((note) => !ids.includes(note.annotationId) && !(active?.groupId && note.groupId === active.groupId));
    state.assets = state.assets.filter((asset) => !deletedAssets.has(asset.id) || state.notes.some((note) => noteAssetIds(note).includes(asset.id)));
    state.activeId = null;
    renderAll();
    queueSave();
    closeToolbar();
    toast("Mark removed. Press Ctrl+Z to undo.");
  }

  function handleSelection(event) {
    if (!state.root) return;
    if (event.target?.closest?.("[data-lm-ignore],.lm-ui")) return;
    const selection = window.getSelection && window.getSelection();
    if (!selection || !selection.rangeCount) {
      closeToolbar();
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      closeToolbar();
      return;
    }
    const segments = selectionSegments(range);
    const first = segments[0];
    if (!first) {
      closeToolbar();
      return;
    }
    if (state.rebindId) {
      rebindActive(segments);
      return;
    }
    state.pending = segments.length > 1 ? { segments, anchor: first.anchor } : first;
    state.activeId = segments.length === 1 ? (state.annotations.find((item) => item.scopeId === first.anchor.scopeId && item.anchor.start === first.anchor.start && item.anchor.end === first.anchor.end) || {}).id || null : null;
    const rect = range.getBoundingClientRect();
    state.ui.toolbar.style.setProperty("--lm-toolbar-x", `${Math.max(8, Math.min(innerWidth - 260, rect.left))}px`);
    state.ui.toolbar.style.setProperty("--lm-toolbar-y", `${Math.max(8, rect.top - 52)}px`);
    state.ui.toolbar.classList.add("open");
    state.ui.toolbar.dataset.open = "true";
    syncToolbarState();
  }

  function rebindActive(segments) {
    const active = state.annotations.find((item) => item.id === state.rebindId);
    if (!active || !segments.length) return;
    rememberUndo();
    if (active.groupId) {
      const oldIds = state.annotations.filter((item) => item.groupId === active.groupId).map((item) => item.id);
      const groupId = active.groupId;
      const replacements = segments.map((segment) => ({
        ...active,
        id: uid("ann"),
        groupId,
        scopeId: segment.anchor.scopeId,
        anchor: segment.anchor,
        orphaned: false,
        updatedAt: now()
      }));
      state.annotations = state.annotations.filter((item) => !oldIds.includes(item.id)).concat(replacements);
      state.notes.filter((note) => note.groupId === groupId || oldIds.includes(note.annotationId)).forEach((note) => {
        note.groupId = groupId;
        note.annotationId = replacements[0].id;
      });
    } else {
      active.scopeId = segments[0].anchor.scopeId;
      active.anchor = segments[0].anchor;
      active.orphaned = false;
      active.updatedAt = now();
    }
    state.rebindId = null;
    renderAll();
    queueSave();
    closeToolbar();
    toast("Note rebound to the new source.");
  }

  function clearRenderedMarks() {
    if (window.CSS && CSS.highlights) state.highlightNames.forEach((name) => CSS.highlights.delete(name));
    state.highlightNames = [];
    document.getElementById("lm-highlight-rules")?.remove();
    document.getElementById("lm-geometry-lines")?.remove();
    document.querySelectorAll("[data-lm-note-lane]").forEach((element) => {
      element.style.paddingInlineEnd = element.dataset.lmNotePadding || "";
      element.style.boxSizing = element.dataset.lmNoteBoxSizing || "";
      delete element.dataset.lmNoteLane;
      delete element.dataset.lmNotePadding;
      delete element.dataset.lmNoteBoxSizing;
    });
  }

  function resolvedAnnotations() {
    const scopes = collectScopes();
    return state.annotations.map((annotation) => {
      normalizeAnnotation(annotation);
      const resolved = resolveAnchor(annotation.anchor, scopes);
      const scope = scopes.find((item) => item.scopeId === resolved.scopeId);
      annotation.orphaned = resolved.status === "orphaned";
      return { annotation, resolved, scope, range: scope ? rangeFor(scope.element, resolved.start, resolved.end) : null };
    }).filter((item) => item.range);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readableBlockForRange(range, fallback) {
    let el = range.commonAncestorContainer;
    if (el && el.nodeType !== Node.ELEMENT_NODE) el = el.parentElement;
    while (el && el !== document.body) {
      if (el.closest("[data-lm-ignore],.lm-ui")) return fallback || state.root;
      const display = getComputedStyle(el).display;
      if (display && display !== "contents" && !display.startsWith("inline") && el.getClientRects().length) return el;
      if (el === state.root) break;
      el = el.parentElement;
    }
    return fallback || state.root;
  }

  function boxesOverlap(a, b, pad = 4) {
    return a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;
  }

  function noteVisualBox(box, size, side) {
    if (size !== 44) return box;
    const left = box.left + (side === "right-rail" ? 26 : 13);
    const top = box.top + 13;
    return { left, top, right: left + 18, bottom: top + 18 };
  }

  function collectTextBoxes(root) {
    const boxes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.data.trim() || node.parentElement?.closest("[data-lm-ignore],.lm-ui")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      Array.from(range.getClientRects()).forEach((rect) => {
        if (rect.width && rect.height) boxes.push({ left: rect.left + scrollX, top: rect.top + scrollY, right: rect.right + scrollX, bottom: rect.bottom + scrollY });
      });
    }
    return boxes;
  }

  function reserveNoteLane(item) {
    const block = readableBlockForRange(item.range, item.scope?.element);
    if (!block || block.dataset.lmNoteLane) return;
    const rect = block.getBoundingClientRect();
    const size = innerWidth < 768 ? 44 : 24;
    const gap = innerWidth < 768 ? 2 : 8;
    const margin = 6;
    const hasOutsideSpace = rect.right + gap + size <= innerWidth - margin || rect.left - gap - size >= margin;
    if (hasOutsideSpace) return;
    const computed = getComputedStyle(block);
    const lane = innerWidth < 768 ? 28 : 34;
    block.dataset.lmNoteLane = "true";
    block.dataset.lmNotePadding = block.style.paddingInlineEnd;
    block.dataset.lmNoteBoxSizing = block.style.boxSizing;
    block.style.boxSizing = "border-box";
    block.style.paddingInlineEnd = `${(Number.parseFloat(computed.paddingInlineEnd) || 0) + lane}px`;
  }

  function resolveNoteHitCollision(candidate, size, bounds, occupied, textBoxes) {
    const left = clamp(candidate.left, bounds.left, bounds.right - size);
    const shifts = [0, 1, -1, 2, -2, 3, -3, 4, -4].map((step) => step * (size + 4));
    for (const shift of shifts) {
      const top = clamp(candidate.top + shift, bounds.top, bounds.bottom - size);
      const box = { left, top, right: left + size, bottom: top + size };
      const visual = noteVisualBox(box, size, candidate.side);
      if (!occupied.some((item) => boxesOverlap(box, item)) && !textBoxes.some((item) => boxesOverlap(visual, item, 1))) {
        return { left, top, box, side: candidate.side, clear: true };
      }
    }
    const top = clamp(candidate.top, bounds.top, bounds.bottom - size);
    return { left, top, box: { left, top, right: left + size, bottom: top + size }, side: candidate.side, clear: false };
  }

  function noteHitPosition(item, rects, occupied, textBoxes) {
    const rect = rects[rects.length - 1];
    const block = readableBlockForRange(item.range, item.scope?.element);
    const blockRect = block?.getBoundingClientRect?.() || rect;
    const size = innerWidth < 768 ? 44 : 24;
    const gap = innerWidth < 768 ? 2 : 8;
    const margin = 6;
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth);
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, innerHeight);
    const bounds = { left: scrollX + margin, right: scrollX + innerWidth - margin, top: margin, bottom: docHeight - margin };
    const blockLeft = blockRect.left + scrollX;
    const blockRight = blockRect.right + scrollX;
    const lineTop = rect.top + scrollY;
    const lineBottom = rect.bottom + scrollY;
    const centeredTop = lineTop + (rect.height - size) / 2;
    const preferRight = rect.left + rect.width / 2 >= blockRect.left + blockRect.width / 2;
    const edgeRight = Math.min(blockRight - size, docWidth - margin - size);
    const edgeLeft = Math.max(blockLeft, margin);
    const preferredEdge = preferRight ? edgeRight : edgeLeft;
    const oppositeEdge = preferRight ? edgeLeft : edgeRight;
    const outsideRight = blockRight + gap;
    const outsideLeft = blockLeft - size - gap;
    const viewportRightRail = scrollX + innerWidth - margin - size;
    const candidates = [];
    const add = (left, top, side, requireInside = true) => {
      if (!Number.isFinite(left) || !Number.isFinite(top)) return;
      if (requireInside && (left < bounds.left || left + size > bounds.right)) return;
      candidates.push({ left, top, side });
    };

    if (block?.dataset?.lmNoteLane) {
      const visualOffset = size === 44 ? 26 : 0;
      const visualSize = size === 44 ? 18 : 24;
      add(blockRight - gap - visualSize - visualOffset, centeredTop, size === 44 ? "right-rail" : "right-edge");
    } else if (preferRight) {
      add(outsideRight, centeredTop, "right");
      add(outsideLeft, centeredTop, "left");
    } else {
      add(outsideLeft, centeredTop, "left");
      add(outsideRight, centeredTop, "right");
    }
    if (size === 44) add(viewportRightRail, centeredTop, "right-rail");
    add(preferredEdge, lineTop - size - gap, preferRight ? "right-edge" : "left-edge");
    add(preferredEdge, lineBottom + gap, preferRight ? "right-edge" : "left-edge");
    add(oppositeEdge, lineTop - size - gap, preferRight ? "left-edge" : "right-edge");
    add(oppositeEdge, lineBottom + gap, preferRight ? "left-edge" : "right-edge");
    add(preferredEdge, centeredTop, preferRight ? "right-edge" : "left-edge", false);

    for (const candidate of candidates) {
      const placed = resolveNoteHitCollision(candidate, size, bounds, occupied, textBoxes);
      if (placed.clear) return placed;
    }
    return resolveNoteHitCollision(candidates[0] || { left: rect.right + scrollX + gap, top: centeredTop, side: "right" }, size, bounds, occupied, textBoxes);
  }

  function renderMarks() {
    clearRenderedMarks();
    const resolved = resolvedAnnotations();
    resolved.filter((item) => item.annotation.noteId).forEach(reserveNoteLane);
    const textBoxes = collectTextBoxes(state.root);
    const canHighlight = window.CSS && CSS.highlights && window.Highlight;
    if (canHighlight) {
      const rules = [];
      resolved.forEach((item, index) => {
        const name = `lm-${index}-${item.annotation.id.replace(/[^a-z0-9_-]/gi, "")}`;
        state.highlightNames.push(name);
        CSS.highlights.set(name, new Highlight(item.range));
        const color = markColor(item.annotation);
        rules.push(`::highlight(${name}){${item.annotation.markType === "highlight" ? `background-color:${color}66;text-decoration:underline solid ${color} 2px;text-underline-offset:2px` : `text-decoration:underline ${item.annotation.lineStyle} ${color} 2px;text-underline-offset:3px`}}`);
      });
      const style = createElement("style", { id: "lm-highlight-rules" });
      style.textContent = rules.join("\n");
      document.head.appendChild(style);
    }

    const layer = createElement("div", { id: "lm-geometry-lines", class: "lm-overlay-layer open", "data-lm-ignore": "" });
    Object.assign(layer.style, {
      width: `${Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)}px`,
      height: `${Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)}px`
    });
    const occupiedHits = [];
    resolved.forEach((item) => {
      const color = markColor(item.annotation);
      const rects = Array.from(item.range.getClientRects());
      rects.forEach((rect) => {
        if (!canHighlight) {
          const segment = createElement("div", {
            class: "lm-overlay-segment",
            "data-style": item.annotation.lineStyle,
            "data-color": item.annotation.color,
            "data-mark-type": item.annotation.markType
          });
          Object.assign(segment.style, item.annotation.markType === "highlight" ? {
            left: `${rect.left + scrollX}px`,
            top: `${rect.top + scrollY}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          } : {
            left: `${rect.left + scrollX}px`,
            top: `${rect.bottom + scrollY - 2}px`,
            width: `${rect.width}px`
          });
          segment.style.setProperty("--lm-mark", color);
          layer.appendChild(segment);
        }
      });
      const rect = rects.at(-1);
      if (rect && item.annotation.noteId) {
        const hit = createElement("button", { class: "lm-note-hit", testid: "lm-note-hit", "aria-label": "Toggle note preview", title: "Toggle note preview", "aria-expanded": "false", "data-ann-id": item.annotation.id });
        const position = noteHitPosition(item, rects, occupiedHits, textBoxes);
        Object.assign(hit.style, {
          left: `${position.left}px`,
          top: `${position.top}px`
        });
        hit.dataset.side = position.side;
        hit.style.setProperty("--lm-mark", color);
        hit.style.setProperty("--lm-note-ink", contrastColor(color));
        occupiedHits.push(position.box);
        hit.addEventListener("mouseenter", () => {
          const samePinned = state.ui.popover?.classList.contains("open") && state.ui.popover?.dataset.pinned === "true" && state.previewId === item.annotation.id;
          if (!samePinned) openPreview(item.annotation, hit.getBoundingClientRect(), false);
        });
        hit.addEventListener("mouseleave", () => {
          if (state.ui.popover?.dataset.pinned !== "true") closePreview();
        });
        hit.addEventListener("click", (event) => {
          event.stopPropagation();
          const alreadyPinned = state.ui.popover?.classList.contains("open") && state.ui.popover?.dataset.pinned === "true" && state.previewId === item.annotation.id;
          if (alreadyPinned) {
            hit.setAttribute("aria-expanded", "false");
            closePreview({ restoreFocus: true });
            return;
          }
          state.activeId = item.annotation.id;
          state.previewReturnFocus = hit;
          document.querySelectorAll('.lm-note-hit[aria-expanded="true"]').forEach((other) => other.setAttribute("aria-expanded", "false"));
          hit.setAttribute("aria-expanded", "true");
          openPreview(item.annotation, hit.getBoundingClientRect(), true);
        });
        layer.appendChild(hit);
      }
    });
    if (layer.children.length) document.body.appendChild(layer);
  }

  function noteFor(annotation) {
    const ids = (annotation.groupId ? state.annotations.filter((item) => item.groupId === annotation.groupId) : [annotation]).map((item) => item.noteId).filter(Boolean);
    return state.notes.find((note) => ids.includes(note.id));
  }

  function noteText(note) {
    if (!note) return "";
    if (Array.isArray(note.blocks) && note.blocks.length) {
      return note.blocks.filter((block) => block.type !== "image").map((block) => block.text || "").join("\n\n");
    }
    return note.text || "";
  }

  function renderBlocks(parent, blocks) {
    parent.textContent = "";
    (blocks || []).forEach((block) => {
      if (block.type === "image") return;
      const listType = block.type === "ordered-list" || block.type === "unordered-list" || block.type === "checklist";
      const tag = block.type === "heading" ? "h4" : block.type === "quote" ? "blockquote" : block.type === "code" ? "pre" : listType ? (block.type === "ordered-list" ? "ol" : "ul") : "p";
      const el = createElement(tag, { class: `lm-rendered-block lm-block-${block.type}`, "data-block-type": block.type });
      if (listType) {
        listItemsFromText(block.text, block.type).forEach((line) => {
          const item = createElement("li");
          renderInline(item, line);
          el.appendChild(item);
        });
      } else if (block.type === "code") {
        el.textContent = block.text || "";
      } else {
        renderInline(el, block.text || "");
      }
      parent.appendChild(el);
    });
  }

  function renderInline(parent, text) {
    const source = `${text || ""}`;
    const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\+\+([^+]+)\+\+|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu;
    let offset = 0;
    for (const match of source.matchAll(pattern)) {
      parent.append(document.createTextNode(source.slice(offset, match.index)));
      if (match[1]) parent.appendChild(createElement("strong", {}, match[1]));
      else if (match[2]) parent.appendChild(createElement("em", {}, match[2]));
      else if (match[3]) parent.appendChild(createElement("u", {}, match[3]));
      else if (match[4]) parent.appendChild(createElement("code", {}, match[4]));
      else parent.appendChild(createElement("a", { href: match[6], target: "_blank", rel: "noopener noreferrer" }, match[5]));
      offset = match.index + match[0].length;
    }
    parent.append(document.createTextNode(source.slice(offset)));
  }

  function notifyTextareaInput(textarea) {
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
  }

  function wrapTextareaSelection(textarea, marker) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const selected = textarea.value.slice(start, end);
    textarea.setRangeText(`${marker}${selected}${marker}`, start, end, "end");
    if (selected) textarea.setSelectionRange(start + marker.length, end + marker.length);
    else textarea.setSelectionRange(start + marker.length, start + marker.length);
    notifyTextareaInput(textarea);
  }

  function isListBlock(type) {
    return type === "ordered-list" || type === "unordered-list" || type === "checklist";
  }

  function stripLegacyListPrefix(line, type) {
    let value = `${line ?? ""}`.trimStart();
    if (type === "ordered-list" && /^ordered-list:\s*/iu.test(value)) return value.replace(/^ordered-list:\s*/iu, "");
    if (type === "unordered-list" && /^unordered-list:\s*/iu.test(value)) return value.replace(/^unordered-list:\s*/iu, "");
    if (type === "checklist" && /^checklist:\s*/iu.test(value)) return value.replace(/^checklist:\s*/iu, "");
    return value.replace(/^(?:(?:\d+[\.)])|[-*+•]|\[[ xX]\])\s*/u, "");
  }

  function listItemsFromText(text, type) {
    return `${text || ""}`.split(/\r?\n/u).map((line) => stripLegacyListPrefix(line, type)).map((line) => line.trim()).filter(Boolean);
  }

  function normalizeBlockText(type, text) {
    return isListBlock(type) ? listItemsFromText(text, type).join("\n") : `${text || ""}`.trim();
  }

  function blockTypeLabel(type) {
    const labels = {
      paragraph: uiText("Paragraph", "正文"),
      heading: uiText("Heading", "标题"),
      "ordered-list": uiText("Ordered list", "有序列表"),
      "unordered-list": uiText("Unordered list", "无序列表"),
      checklist: uiText("Checklist", "检查清单"),
      quote: uiText("Quote", "引用"),
      code: uiText("Code", "代码")
    };
    return labels[type] || uiText("Text", "文本");
  }

  function syncEditorBlockTypeButtons() {
    const value = state.ui.blockType?.value;
    state.ui.editor?.querySelectorAll("[data-editor-block-type]").forEach((el) => {
      el.setAttribute("aria-pressed", `${el.dataset.editorBlockType === value}`);
    });
  }

  function setEditorBlockType(type) {
    if (!state.ui.blockType || !BLOCK_TYPES.has(type)) return;
    state.ui.blockType.value = type;
    syncEditorBlockTypeButtons();
  }

  function syncNoteOptionsSurface() {
    const value = normalizeHex(state.ui.surface?.value, "#FFFFFF");
    state.ui.surfacePresets?.querySelectorAll("[data-surface]").forEach((preset) => {
      preset.setAttribute("aria-pressed", `${normalizeHex(preset.dataset.surface, "") === value}`);
    });
    if (state.ui.optionsToggle) {
      state.ui.optionsToggle.dataset.surface = value;
      state.ui.optionsToggle.style.setProperty("--lm-swatch", value);
    }
  }

  function imageAlt(asset) {
    return asset.decorative ? "" : asset.alt || asset.name || "note image";
  }

  function noteAssetIds(note) {
    const ids = new Set(note?.assetIds || []);
    (note?.blocks || []).forEach((block) => {
      if (block?.type === "image" && block.assetId) ids.add(block.assetId);
    });
    return Array.from(ids);
  }

  function closeImageLightbox({ restoreFocus = true } = {}) {
    const lightbox = state.ui.imageLightbox;
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    if (state.ui.imageLightboxImage) {
      state.ui.imageLightboxImage.removeAttribute("src");
      state.ui.imageLightboxImage.alt = "";
    }
    if (state.ui.imageLightboxCaption) state.ui.imageLightboxCaption.textContent = "";
    const target = state.imageLightboxReturnFocus;
    state.imageLightboxReturnFocus = null;
    if (restoreFocus) target?.focus?.({ preventScroll: true });
  }

  function openImageLightbox(asset, trigger) {
    if (!asset || !state.ui.imageLightbox || !state.ui.imageLightboxImage) return;
    closeMenus();
    state.imageLightboxReturnFocus = trigger || document.activeElement;
    state.ui.imageLightboxImage.src = asset.dataUrl;
    state.ui.imageLightboxImage.alt = imageAlt(asset);
    if (state.ui.imageLightboxCaption) state.ui.imageLightboxCaption.textContent = asset.decorative ? uiText("Note image", "笔记图片") : imageAlt(asset);
    state.ui.imageLightbox.hidden = false;
    state.ui.imageLightbox.classList.add("open");
    state.ui.imageLightbox.setAttribute("aria-hidden", "false");
    state.ui.imageLightboxClose?.focus?.({ preventScroll: true });
  }

  function imageZoomTrigger(asset) {
    const trigger = button("", "lm-image-zoom-trigger", (event) => openImageLightbox(asset, event.currentTarget), {
      class: "lm-image-zoom-trigger",
      "aria-label": uiText("Enlarge image", "放大图片")
    });
    trigger.appendChild(createElement("img", { src: asset.dataUrl, alt: imageAlt(asset), "data-block-type": "image" }));
    return trigger;
  }

  function renderImages(parent, assetIds) {
    parent.textContent = "";
    (assetIds || []).forEach((id) => {
      const asset = state.assets.find((item) => item.id === id);
      if (!asset) return;
      parent.appendChild(imageZoomTrigger(asset));
    });
  }

  function openPreview(annotation, rect, pinned) {
    const note = noteFor(annotation);
    if (!note || state.ui.editor?.classList.contains("open")) return;
    if (!openOne("preview")) return;
    if (!state.ui.popover) {
      state.ui.popover = createElement("div", { class: "lm-ui lm-note-popover", "data-lm-ignore": "", role: "dialog", "aria-live": "polite", testid: "lm-note-popover" });
      document.body.appendChild(state.ui.popover);
    }
    const popover = state.ui.popover;
    popover.textContent = "";
    popover.dataset.pinned = pinned ? "true" : "false";
    state.previewId = annotation.id;
    const surface = normalizeHex(note.surfaceColor, "#FFFFFF");
    popover.style.setProperty("--lm-note-surface", surface);
    popover.style.setProperty("--lm-note-fg", contrastColor(surface));
    popover.appendChild(createElement("div", { class: "lm-popover-title" }, annotation.anchor.exact || "Source"));
    const body = createElement("div", { class: "lm-popover-body" });
    renderBlocks(body, note.blocks?.length ? note.blocks : [{ type: "paragraph", text: noteText(note) }]);
    const assetIds = noteAssetIds(note);
    if (assetIds.length) {
      const images = createElement("div", { class: "lm-note-images" });
      renderImages(images, assetIds);
      body.appendChild(images);
    }
    popover.appendChild(body);
    const actions = createElement("div", { class: "lm-popover-actions" });
    actions.append(
      button(uiText("Edit", "编辑"), "lm-popover-edit", (event) => { event.stopPropagation(); state.activeId = annotation.id; openEditor(); }),
      button(uiText("Jump", "跳回"), "lm-popover-jump", (event) => { event.stopPropagation(); jumpTo(annotation.id); }),
      button(uiText("Copy", "复制"), "lm-note-copy", (event) => { event.stopPropagation(); copyNote(note); }),
      button(uiText("Close", "收起"), "lm-popover-close", (event) => { event.stopPropagation(); closePreview({ restoreFocus: true }); })
    );
    popover.appendChild(actions);
    popover.classList.add("open");
    placeFloating(popover, rect, { width: 320, avoid: document.querySelectorAll(".lm-note-hit") });
  }

  function buildUi() {
    const toolbar = createElement("div", { class: "lm-ui lm-toolbar", role: "toolbar", tabindex: "0", testid: "lm-toolbar", "aria-label": "Annotation tools", "data-lm-ignore": "" });
    const markGroup = createElement("div", { class: "lm-toolbar-group" });
    const underlineButton = button("Underline", "lm-mark-underline", () => applyMark({ markType: "underline" }), { class: "lm-mark-button lm-icon-button", title: "Underline", "data-mark-type": "underline", "aria-pressed": "true", tabindex: "-1" });
    const highlightButton = button("Highlight", "lm-mark-highlight", () => applyMark({ markType: "highlight" }), { class: "lm-mark-button lm-icon-button", title: "Highlight", "data-mark-type": "highlight", "aria-pressed": "false", tabindex: "-1" });
    underlineButton.textContent = "U";
    highlightButton.textContent = "H";
    markGroup.append(underlineButton, highlightButton);

    const styleWrap = createElement("div", { class: "lm-menu-wrap" });
    const styleButton = button("Line style", "lm-style-menu-trigger", () => toggleMenu("style"), { class: "lm-style-menu-button lm-icon-button", title: "Line style", "aria-haspopup": "menu", "aria-expanded": "false", tabindex: "-1" });
    styleButton.textContent = "S";
    const styleMenu = createElement("div", { class: "lm-style-menu", testid: "lm-style-menu", role: "menu", hidden: true });
    STYLE_KEYS.forEach((style) => {
      const option = button(style, `lm-style-${style}`, () => {
        applyMark({ style });
        closeMenus();
      }, { class: "lm-style-option", "data-style": style, role: "menuitemradio", "aria-pressed": "false" });
      option.textContent = "";
      option.appendChild(createElement("span", { class: "lm-line-preview", "data-style": style, "aria-hidden": "true" }));
      option.appendChild(createElement("span", { class: "lm-option-label" }, style));
      styleMenu.appendChild(option);
    });
    styleWrap.append(styleButton, styleMenu);

    const colorWrap = createElement("div", { class: "lm-menu-wrap" });
    const colorButton = button("Mark color", "lm-color-menu-trigger", () => toggleMenu("color"), { class: "lm-color-menu-button lm-icon-button", title: "Mark color", "aria-haspopup": "menu", "aria-expanded": "false", tabindex: "-1" });
    colorButton.textContent = "";
    colorButton.appendChild(createElement("span", { class: "lm-color-swatch lm-current-color", "aria-hidden": "true" }));
    const colorMenu = createElement("div", { class: "lm-color-menu", testid: "lm-color-menu", role: "menu", hidden: true });
    Object.entries(NAMED_COLORS).forEach(([name, hex]) => {
      const option = button(name, `lm-color-${name}`, () => {
        applyMark({ color: name });
        closeMenus();
      }, { class: "lm-color-option", "data-color": name, role: "menuitemradio", "aria-pressed": "false" });
      option.textContent = "";
      option.appendChild(createElement("span", { class: "lm-color-swatch", style: `--lm-swatch:${hex}`, "aria-hidden": "true" }));
      option.appendChild(createElement("span", { class: "lm-option-label" }, name));
      colorMenu.appendChild(option);
    });
    const custom = createElement("input", { class: "lm-custom-color", testid: "lm-custom-color", type: "color", value: state.settings.customColor, "aria-label": "Custom color" });
    custom.addEventListener("input", () => applyMark({ customColor: custom.value }));
    colorMenu.appendChild(custom);
    colorWrap.append(colorButton, colorMenu);

    const noteButton = button("Add note", "lm-add-note", openEditor, { class: "lm-note-button lm-icon-button", title: "Add note", tabindex: "-1" });
    const removeButton = button("Remove mark", "lm-remove-mark", removeMark, { class: "lm-remove-button lm-icon-button", title: "Remove mark", tabindex: "-1" });
    const clearButton = button("Clear lesson marks", "lm-clear-annotations", clearLessonAnnotations, { class: "lm-remove-button lm-icon-button", title: "Clear lesson marks", tabindex: "-1" });
    noteButton.textContent = "N";
    removeButton.textContent = "Del";
    clearButton.textContent = "C";
    toolbar.append(
      markGroup,
      styleWrap,
      colorWrap,
      noteButton,
      removeButton,
      clearButton
    );
    toolbar.addEventListener("keydown", handleToolbarKeys);

    const toggleLabel = uiText("Learning notes", "学习笔记");
    const toggle = button("✎", "lm-notes-toggle", toggleManager, { class: "lm-ui lm-notes-toggle", "data-lm-ignore": "", title: toggleLabel, "aria-label": toggleLabel });
    const manager = createElement("aside", { class: "lm-ui lm-notes-manager", testid: "lm-notes-manager", role: "dialog", "aria-modal": "false", "aria-label": toggleLabel, "data-lm-ignore": "" });
    const header = createElement("div", { class: "lm-manager-header" });
    header.append(createElement("h2", {}, toggleLabel), button(uiText("Close", "关闭"), "lm-notes-manager-close", closeManager));
    const searchLabel = uiText("Search notes", "搜索笔记");
    const search = createElement("input", { type: "search", placeholder: searchLabel, "aria-label": searchLabel });
    search.addEventListener("input", renderManager);
    const list = createElement("div", { class: "lm-note-list", testid: "lm-note-list" });
    const footer = createElement("div", { class: "lm-manager-footer" });
    const statusEl = createElement("div", { class: "lm-status", testid: "lm-status", role: "status", "aria-live": "polite" }, "Session-only notes.");
    const importInput = createElement("input", { type: "file", accept: ".learnmap,application/vnd.learnmap.notes+zip", hidden: true, "aria-label": "Import LearnMap package" });
    importInput.addEventListener("change", () => {
      if (importInput.files[0]) importPackage(importInput.files[0]);
      importInput.value = "";
    });
    footer.append(
      statusEl,
      button(uiText("Export package", "导出笔记包"), "lm-export-package", exportPackage),
      button(uiText("Import package", "导入笔记包"), "lm-import-package", () => importInput.click()),
      button(uiText("Export Markdown", "导出 Markdown"), "lm-export-markdown", exportMarkdown),
      button(uiText("Clear notes", "清空笔记"), "lm-clear-annotations-manager", clearLessonAnnotations),
      importInput
    );
    manager.append(header, search, list, footer);
    manager.addEventListener("keydown", handleManagerKeys);

    const editLabel = uiText("Edit note", "编辑笔记");
    const editor = createElement("section", { class: "lm-ui lm-note-editor-popover", testid: "lm-note-editor-popover", role: "dialog", "aria-hidden": "true", "aria-label": editLabel, "data-lm-ignore": "" });
    const imageInput = createElement("input", { type: "file", accept: "image/png,image/jpeg,image/webp", multiple: true, hidden: true, testid: "lm-image-input", "aria-label": "Choose note images" });
    const textarea = createElement("textarea", { testid: "lm-note-editor", "aria-label": uiText("Note content", "笔记内容"), placeholder: uiText("Write a note, question, checklist, or code snippet.", "记录理解、问题、清单或代码片段") });
    const editorToolbar = createElement("div", { class: "lm-editor-header", role: "toolbar", "aria-label": uiText("Note formatting", "笔记格式") });
    const editorTool = (label, testid, handler, ariaLabel, attrs = {}) => button(label, testid, handler, { class: "lm-editor-tool", title: ariaLabel, "aria-label": ariaLabel, ...attrs });
    const closeButton = editorTool("", "lm-note-editor-close", () => closeEditor(), uiText("Close note editor", "关闭笔记编辑器"), { class: "lm-note-editor-close" });
    closeButton.appendChild(createElement("span", { testid: "lm-note-cancel", "aria-hidden": "true" }, "×"));
    const imageButton = editorTool("", "lm-note-image-add", () => imageInput.click(), uiText("Add images", "添加图片"));
    imageButton.appendChild(createElement("span", { class: "lm-image-glyph", "aria-hidden": "true" }));
    const orderedListButton = editorTool("", "lm-note-format-ordered-list", () => setEditorBlockType("ordered-list"), uiText("Ordered list", "有序列表"), { "aria-pressed": "false", "data-editor-block-type": "ordered-list" });
    orderedListButton.appendChild(createElement("span", { class: "lm-list-glyph lm-list-glyph-ordered", "data-list-type": "ordered", "data-block-type": "ordered-list", "aria-hidden": "true" }));
    const unorderedListButton = editorTool("", "lm-note-format-unordered-list", () => setEditorBlockType("unordered-list"), uiText("Unordered list", "无序列表"), { "aria-pressed": "false", "data-editor-block-type": "unordered-list" });
    unorderedListButton.appendChild(createElement("span", { class: "lm-list-glyph lm-list-glyph-unordered", "data-list-type": "unordered", "data-block-type": "unordered-list", "aria-hidden": "true" }));
    editorToolbar.append(
      createElement("h2", {}, editLabel),
      editorTool("B", "lm-note-format-bold", () => wrapTextareaSelection(textarea, "**"), uiText("Bold", "加粗"), { "aria-keyshortcuts": "Control+B Meta+B" }),
      editorTool("I", "lm-note-format-italic", () => wrapTextareaSelection(textarea, "*"), uiText("Italic", "斜体"), { "aria-keyshortcuts": "Control+I Meta+I" }),
      editorTool("U", "lm-note-format-underline", () => wrapTextareaSelection(textarea, "++"), uiText("Underline", "下划线"), { "aria-keyshortcuts": "Control+U Meta+U" }),
      orderedListButton,
      unorderedListButton,
      imageButton,
      closeButton
    );
    const blockType = createElement("select", { testid: "lm-block-type", "aria-label": "Block type" });
    [
      ["paragraph", uiText("Paragraph", "正文")],
      ["heading", uiText("Heading", "标题")],
      ["ordered-list", uiText("Ordered list", "有序列表")],
      ["unordered-list", uiText("Unordered list", "无序列表")],
      ["checklist", uiText("Checklist", "检查清单")],
      ["quote", uiText("Quote", "引用")],
      ["code", uiText("Code", "代码")]
    ].forEach(([value, label]) => blockType.appendChild(createElement("option", { value }, label)));
    blockType.addEventListener("change", syncEditorBlockTypeButtons);
    const blockList = createElement("div", { class: "lm-note-blocks", testid: "lm-note-blocks" });
    const blockControls = createElement("div", { class: "lm-note-block-controls" });
    blockControls.append(blockType, button(uiText("Add block", "添加内容块"), "lm-add-block", addBlock));
    const question = createElement("input", { type: "checkbox", testid: "lm-note-question", "aria-label": "Question note" });
    const questionLabel = createElement("label", { class: "lm-check-row" }, uiText("Question note", "疑问笔记"));
    questionLabel.prepend(question);
    const surfaceWrap = createElement("div", { class: "lm-surface-picker", role: "group", "aria-label": "Note surface color" });
    const surfacePresets = createElement("div", { class: "lm-surface-presets" });
    const surface = createElement("input", { type: "color", value: SURFACE_COLORS.white, testid: "lm-note-surface-custom", "aria-label": "Custom note surface color" });
    Object.entries(SURFACE_COLORS).forEach(([name, hex]) => {
      const preset = button(`${name} note surface`, `lm-note-surface-preset-${name}`, () => {
        surface.value = hex;
        syncNoteOptionsSurface();
      }, { class: "lm-surface-preset", title: `${name} note surface`, "data-surface": hex });
      preset.textContent = "";
      preset.style.setProperty("--lm-swatch", hex);
      surfacePresets.appendChild(preset);
    });
    const surfaceCustom = createElement("div", { class: "lm-surface-custom" });
    surfaceCustom.append(surface, button(uiText("Apply custom color", "应用自定义颜色"), "lm-note-surface-custom-apply", () => {
      surface.value = normalizeHex(surface.value, "#FFFFFF");
      syncNoteOptionsSurface();
    }, { class: "lm-surface-apply" }));
    surfaceWrap.append(surfacePresets, surfaceCustom);
    const alt = createElement("input", { type: "text", testid: "lm-image-alt", "aria-label": uiText("Image alt text", "图片说明"), placeholder: uiText("Image alt text", "图片说明") });
    const decorative = createElement("input", { type: "checkbox", testid: "lm-image-decorative", "aria-label": "Decorative image" });
    const decorativeLabel = createElement("label", { class: "lm-check-row" }, uiText("Decorative image", "装饰图片"));
    decorativeLabel.prepend(decorative);
    const images = createElement("div", { class: "lm-note-images" });
    const dropzone = createElement("div", { class: "lm-image-dropzone", tabindex: "0" }, uiText("Paste, drop, or choose PNG, JPEG, WebP", "粘贴、拖放或选择 PNG、JPEG、WebP"));
    const options = createElement("div", { id: "lm-note-options", class: "lm-note-options", testid: "lm-note-options", hidden: true, "aria-hidden": "true" });
    options.append(blockControls, questionLabel, createElement("label", {}, uiText("Note color", "笔记颜色")), surfaceWrap, alt, decorativeLabel, dropzone);
    const actions = createElement("div", { class: "lm-editor-actions" });
    const deleteEditorButton = button("", "lm-note-delete-editor", deleteEditorNote, { class: "lm-editor-delete", "aria-label": uiText("Delete note", "删除笔记"), title: uiText("Delete note", "删除笔记") });
    deleteEditorButton.appendChild(createElement("span", { class: "lm-trash-glyph", "aria-hidden": "true" }));
    const optionsToggle = button("", "lm-note-options-toggle", () => {
      const expanded = options.hidden;
      options.hidden = !expanded;
      options.setAttribute("aria-hidden", `${!expanded}`);
      optionsToggle.setAttribute("aria-expanded", `${expanded}`);
    }, { class: "lm-note-options-toggle lm-surface-preset", "aria-label": uiText("Note options", "笔记选项"), title: uiText("Note options", "笔记选项"), "aria-controls": "lm-note-options", "aria-expanded": "false" });
    const saveButton = button(uiText("Save", "保存"), "lm-note-save", saveNote, { class: "lm-editor-save" });
    actions.append(deleteEditorButton, optionsToggle, saveButton);
    editor.append(editorToolbar, imageInput, textarea, blockList, images, options, actions);
    imageInput.addEventListener("change", () => {
      acceptImages(imageInput.files);
      imageInput.value = "";
    });
    surface.addEventListener("input", syncNoteOptionsSurface);
    textarea.addEventListener("keydown", (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const marker = { b: "**", i: "*", u: "++" }[event.key.toLowerCase()];
      if (!marker) return;
      event.preventDefault();
      wrapTextareaSelection(textarea, marker);
    });
    dropzone.addEventListener("click", () => imageInput.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      imageInput.click();
    });
    [dropzone, textarea].forEach((target) => {
      target.addEventListener("dragover", (event) => event.preventDefault());
      target.addEventListener("drop", (event) => {
        event.preventDefault();
        acceptImages(event.dataTransfer.files);
      });
      target.addEventListener("paste", (event) => {
        const clipboardFiles = Array.from(event.clipboardData?.files || []).filter((file) => /^image\//iu.test(file.type || ""));
        const files = clipboardFiles.length ? clipboardFiles : Array.from(event.clipboardData?.items || [])
          .filter((item) => item.kind === "file" && /^image\//iu.test(item.type || ""))
          .map((item) => item.getAsFile()).filter(Boolean);
        if (files.length) {
          event.preventDefault();
          acceptImages(files);
        }
      });
    });

    const toasts = createElement("div", { class: "lm-ui lm-toast-region", "aria-live": "polite", "data-lm-ignore": "" });
    const imageLightbox = createElement("div", { class: "lm-ui lm-image-lightbox", testid: "lm-image-lightbox", role: "dialog", "aria-modal": "true", "aria-label": uiText("Image preview", "图片预览"), "aria-hidden": "true", hidden: true, tabindex: "-1", "data-lm-ignore": "" });
    const imageLightboxBackdrop = createElement("div", { class: "lm-image-lightbox-backdrop", "aria-hidden": "true" });
    const imageLightboxContent = createElement("figure", { class: "lm-image-lightbox-content" });
    const imageLightboxImage = createElement("img", { class: "lm-image-lightbox-image", testid: "lm-image-lightbox-image", alt: "" });
    const imageLightboxCaption = createElement("figcaption", { class: "lm-image-lightbox-caption" });
    const imageLightboxClose = button("", "lm-image-lightbox-close", (event) => {
      event.stopPropagation();
      closeImageLightbox();
    }, { class: "lm-image-lightbox-close", "aria-label": uiText("Close image preview", "关闭图片预览") });
    imageLightboxClose.appendChild(createElement("span", { "aria-hidden": "true" }, "×"));
    imageLightboxContent.append(imageLightboxImage, imageLightboxCaption);
    imageLightbox.append(imageLightboxBackdrop, imageLightboxContent, imageLightboxClose);
    imageLightboxBackdrop.addEventListener("click", (event) => {
      event.stopPropagation();
      closeImageLightbox();
    });
    imageLightbox.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeImageLightbox();
        return;
      }
      if (event.key !== "Tab") return;
      event.preventDefault();
      imageLightboxClose.focus();
    });
    document.body.append(toolbar, toggle, manager, editor, imageLightbox, toasts);
    state.ui = { toolbar, toggle, manager, search, list, editor, blockType, textarea, blocks: blockList, question, surface, surfacePresets, alt, decorative, images, imageInput, options, optionsToggle, deleteEditorButton, save: saveButton, status: statusEl, importInput, imageLightbox, imageLightboxImage, imageLightboxCaption, imageLightboxClose, toasts };
    syncNoteOptionsSurface();
    syncEditorBlockTypeButtons();
  }

  function closeMenus() {
    state.ui.toolbar?.querySelectorAll(".lm-style-menu,.lm-color-menu").forEach((menu) => { menu.hidden = true; });
    state.ui.toolbar?.querySelectorAll(".lm-style-menu-button,.lm-color-menu-button").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
  }

  function toggleMenu(kind) {
    const menuClass = kind === "style" ? ".lm-style-menu" : ".lm-color-menu";
    const buttonClass = kind === "style" ? ".lm-style-menu-button" : ".lm-color-menu-button";
    const menu = state.ui.toolbar.querySelector(menuClass);
    const btn = state.ui.toolbar.querySelector(buttonClass);
    const willOpen = menu.hidden;
    closeMenus();
    menu.hidden = !willOpen;
    btn.setAttribute("aria-expanded", `${willOpen}`);
    if (willOpen) menu.classList.toggle("lm-menu-up", btn.getBoundingClientRect().bottom + menu.scrollHeight + 12 > innerHeight);
  }

  function handleToolbarKeys(event) {
    const controls = Array.from(state.ui.toolbar.querySelectorAll("button:not([disabled]),input:not([disabled])"));
    const index = controls.indexOf(document.activeElement);
    if (event.key === "Tab" && document.activeElement === state.ui.toolbar) {
      event.preventDefault();
      controls[0]?.focus();
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      controls[(Math.max(0, index) + delta + controls.length) % controls.length]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenus();
      closeToolbar();
      state.root?.focus?.();
    }
  }

  function visibleControls(root) {
    return Array.from(root.querySelectorAll("button,input,select,textarea,[tabindex]")).filter((el) => el.offsetParent && !el.disabled);
  }

  function handleManagerKeys(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeManager();
      return;
    }
    if (event.key !== "Tab" || innerWidth >= 768) return;
    const controls = visibleControls(state.ui.manager);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault();
      controls[controls.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
      event.preventDefault();
      controls[0].focus();
    }
  }

  function toggleManager() {
    if (state.ui.manager.classList.contains("open")) closeManager();
    else openManager();
  }

  function openManager() {
    if (!openOne("manager")) return;
    state.ui.lastFocus = document.activeElement;
    state.ui.manager.classList.add("open");
    state.ui.manager.setAttribute("aria-modal", innerWidth < 768 ? "true" : "false");
    state.ui.manager.dataset.layout = innerWidth < 768 ? "bottom-sheet" : "floating";
    renderManager();
    if (innerWidth < 768) visibleControls(state.ui.manager)[0]?.focus();
  }

  function annotationLabel(annotation) {
    return `${annotation.color === "custom" ? annotation.customColor : annotation.color} / ${annotation.markType === "highlight" ? "highlight" : annotation.lineStyle}`;
  }

  function renderManager() {
    if (!state.ui.list) return;
    const query = cleanText(state.ui.search.value).toLowerCase();
    state.ui.list.textContent = "";
    const notes = state.notes.filter((note) => {
      const annotation = state.annotations.find((item) => item.id === note.annotationId) || {};
      const haystack = `${noteText(note)} ${annotation.anchor?.exact || ""}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    if (!notes.length) {
      state.ui.list.appendChild(createElement("p", { class: "lm-empty" }, uiText("No notes yet. Select teaching text to start.", "还没有笔记。选择课件原文即可开始。")));
      return;
    }
    notes.forEach((note) => {
      const annotation = state.annotations.find((item) => item.id === note.annotationId) || {};
      const linkedAnnotations = note.groupId ? state.annotations.filter((item) => item.groupId === note.groupId) : [annotation];
      const sourceText = linkedAnnotations.map((item) => item.anchor?.exact).filter(Boolean).join(" ... ") || uiText("Unbound source", "未绑定原文");
      const surface = normalizeHex(note.surfaceColor, "#FFFFFF");
      const card = createElement("article", { class: "lm-note-card", testid: "lm-note-card", "data-surface": surface, style: `--lm-note-surface:${surface};--lm-note-fg:${contrastColor(surface)}` });
      card.appendChild(createElement("div", { class: "lm-note-source" }, sourceText));
      card.appendChild(createElement("div", { class: "lm-note-meta" }, `${annotationLabel(annotation)}${note.tag === "question" ? " / question" : ""}${annotation.orphaned ? " / orphaned" : ""}`));
      const body = createElement("div", { class: "lm-note-body" });
      renderBlocks(body, note.blocks?.length ? note.blocks : [{ type: "paragraph", text: noteText(note) }]);
      card.appendChild(body);
      const assetIds = noteAssetIds(note);
      if (assetIds.length) {
        const images = createElement("div", { class: "lm-note-images" });
        renderImages(images, assetIds);
        card.appendChild(images);
      }
      const actions = createElement("div", { class: "lm-note-actions" });
      actions.append(
        button(uiText("Jump", "跳回"), "lm-note-jump", () => jumpTo(annotation.id)),
        button(uiText("Edit", "编辑"), "lm-note-edit", () => { state.activeId = annotation.id; openEditor(); }),
        button(uiText("Copy", "复制"), "lm-note-copy", () => copyNote(note)),
        button(uiText("Delete", "删除"), "lm-note-delete", () => deleteNote(note.id))
      );
      if (annotation.orphaned) actions.appendChild(button(uiText("Rebind", "重新绑定"), "lm-note-rebind", () => { state.rebindId = annotation.id; closeManager(); status("Select the replacement source text."); }));
      card.appendChild(actions);
      card.addEventListener("click", (event) => {
        if (!event.target.closest("button")) jumpTo(annotation.id);
      });
      state.ui.list.appendChild(card);
    });
  }

  function jumpTo(id) {
    const target = resolvedAnnotations().find((item) => item.annotation.id === id);
    const el = target?.scope?.element;
    if (!target || !el) return;
    revealElement(el);
    const rect = target.range.getBoundingClientRect();
    scrollTo({ top: Math.max(0, rect.top + scrollY - innerHeight * 0.28), behavior: "smooth" });
    flashRange(target.range);
  }

  function revealElement(el) {
    let node = el;
    while (node && node !== document.body) {
      if (node.tagName === "DETAILS") node.open = true;
      if (node.classList?.contains("accordion") && !node.classList.contains("open")) node.querySelector(".accordion-header")?.click();
      const hiddenPanel = node.closest?.("[hidden]");
      if (hiddenPanel) hiddenPanel.hidden = false;
      node = node.parentElement;
    }
  }

  function flashRange(range) {
    const marker = createElement("div", { class: "lm-flash", "data-lm-ignore": "" });
    const rect = range.getBoundingClientRect();
    Object.assign(marker.style, { left: `${rect.left + scrollX}px`, top: `${rect.top + scrollY}px`, width: `${rect.width}px`, height: `${Math.max(18, rect.height)}px` });
    document.body.appendChild(marker);
    setTimeout(() => marker.remove(), 1200);
  }

  function openEditor() {
    if (!state.activeId) applyMark({});
    const annotation = state.annotations.find((item) => item.id === state.activeId);
    if (!annotation) return;
    const note = noteFor(annotation);
    state.editorReturnFocus = document.activeElement;
    if (!openOne("editor")) return;
    state.editingNoteId = note?.id || null;
    state.pendingAssets = note ? state.assets.filter((asset) => noteAssetIds(note).includes(asset.id)) : [];
    state.pendingBlocks = note ? clone(note.blocks?.length ? note.blocks : [{ type: "paragraph", text: note.text || "" }]) : [];
    state.ui.textarea.value = "";
    state.ui.question.checked = note?.tag === "question";
    state.ui.surface.value = normalizeHex(note?.surfaceColor, "#FFFFFF");
    state.ui.alt.value = "";
    state.ui.decorative.checked = false;
    state.ui.options.hidden = true;
    state.ui.options.setAttribute("aria-hidden", "true");
    state.ui.optionsToggle.setAttribute("aria-expanded", "false");
    syncNoteOptionsSurface();
    syncEditorBlockTypeButtons();
    renderPendingBlocks();
    renderPendingImages();
    const rect = selectionRectFor(annotation) || { left: innerWidth / 2 - 160, top: 96 };
    state.ui.editor.classList.add("open");
    state.ui.editor.setAttribute("aria-hidden", "false");
    state.ui.editor.dataset.layout = innerWidth < 768 ? "bottom-sheet" : "anchored";
    placeFloating(state.ui.editor, { left: rect.left, top: rect.top, bottom: rect.bottom ?? rect.top }, { width: 380 });
    state.editorSnapshot = editorDraft();
    state.ui.textarea.focus();
  }

  function selectionRectFor(annotation) {
    const target = resolvedAnnotations().find((item) => item.annotation.id === annotation.id);
    return target?.range?.getBoundingClientRect();
  }

  function addBlock() {
    const text = normalizeBlockText(state.ui.blockType.value, state.ui.textarea.value);
    if (!text) return;
    state.pendingBlocks.push({ type: state.ui.blockType.value, text });
    state.ui.textarea.value = "";
    renderPendingBlocks();
  }

  function renderPendingBlocks() {
    state.ui.blocks.textContent = "";
    state.pendingBlocks.filter((block) => block.type !== "image").forEach((block, index) => {
      const row = createElement("div", { class: "lm-note-block lm-note-block-pending" });
      const label = createElement("span", { class: "lm-note-block-label" }, blockTypeLabel(block.type));
      const preview = createElement("div", { class: "lm-note-block-preview" });
      renderBlocks(preview, [block]);
      const removeLabel = uiText("Delete block", "删除内容块");
      const removeButton = button("", null, () => {
        state.pendingBlocks.splice(index, 1);
        renderPendingBlocks();
      }, { class: "lm-remove-button", "aria-label": removeLabel, title: removeLabel });
      removeButton.appendChild(createElement("span", { "aria-hidden": "true" }, "×"));
      row.append(label, preview, removeButton);
      state.ui.blocks.appendChild(row);
    });
  }

  function renderPendingImages() {
    state.ui.images.textContent = "";
    state.pendingAssets.forEach((asset) => {
      const card = createElement("div", { class: "lm-image-card" });
      card.append(
        imageZoomTrigger(asset),
        button(uiText("Remove image", "删除图片"), null, () => {
          state.pendingAssets = state.pendingAssets.filter((item) => item.id !== asset.id);
          state.assets = state.assets.filter((item) => item.id !== asset.id || state.notes.some((note) => noteAssetIds(note).includes(item.id)));
          renderPendingImages();
        }, { class: "lm-remove-button" })
      );
      state.ui.images.appendChild(card);
    });
  }

  function deleteEditorNote() {
    const noteId = state.editingNoteId;
    if (noteId) {
      deleteNote(noteId);
      if (!state.notes.some((note) => note.id === noteId)) closeEditor({ force: true });
      return;
    }
    state.ui.textarea.value = "";
    state.ui.imageInput.value = "";
    closeEditor({ force: true });
    renderPendingBlocks();
    renderPendingImages();
  }

  function saveNote() {
    addBlock();
    const assetBlocks = state.pendingAssets.map((asset) => ({ type: "image", assetId: asset.id }));
    const blocks = state.pendingBlocks.filter((block) => block.type !== "image").concat(assetBlocks);
    if (!blocks.length) {
      status("Enter text or add an image before saving.", "error");
      return;
    }
    const annotation = state.annotations.find((item) => item.id === state.activeId);
    if (!annotation) return;
    rememberUndo();
    let note = state.editingNoteId && state.notes.find((item) => item.id === state.editingNoteId);
    if (!note) {
      note = { id: uid("note"), courseId: state.meta.courseId, lessonId: state.meta.lessonId, annotationId: annotation.id, text: "", assetIds: [], tag: "note", surfaceColor: "#FFFFFF", createdAt: now(), updatedAt: now() };
      state.notes.push(note);
    }
    const oldAssetIds = noteAssetIds(note);
    note.text = blocks.filter((block) => block.type !== "image").map((block) => block.text).join("\n\n");
    note.blocks = blocks;
    note.assetIds = state.pendingAssets.map((asset) => asset.id);
    note.tag = state.ui.question.checked ? "question" : "note";
    note.surfaceColor = normalizeHex(state.ui.surface.value, "#FFFFFF");
    note.groupId = annotation.groupId || null;
    note.updatedAt = now();
    state.pendingAssets.forEach((asset) => {
      if (!state.assets.some((item) => item.id === asset.id)) state.assets.push(asset);
    });
    state.assets = state.assets.filter((asset) => !oldAssetIds.includes(asset.id) || note.assetIds.includes(asset.id) || state.notes.some((other) => other !== note && noteAssetIds(other).includes(asset.id)));
    (annotation.groupId ? state.annotations.filter((item) => item.groupId === annotation.groupId) : [annotation]).forEach((item) => {
      item.noteId = note.id;
      item.updatedAt = now();
    });
    renderAll();
    clearTimeout(state.saveTimer);
    closeEditor({ force: true });
    status("Saving locally...");
    saveNow();
  }

  function deleteNote(id) {
    const note = state.notes.find((item) => item.id === id);
    if (!note || !confirm("Delete this note?")) return;
    rememberUndo();
    const assetIds = new Set(noteAssetIds(note));
    state.notes = state.notes.filter((item) => item.id !== id);
    state.annotations.forEach((annotation) => {
      if (annotation.noteId === id) annotation.noteId = null;
    });
    state.assets = state.assets.filter((asset) => !assetIds.has(asset.id) || state.notes.some((item) => noteAssetIds(item).includes(asset.id)));
    renderAll();
    queueSave();
  }

  function imageMime(data) {
    if (data.length >= 8 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) return "image/png";
    if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) return "image/jpeg";
    if (data.length >= 12 && String.fromCharCode(...data.slice(0, 4)) === "RIFF" && String.fromCharCode(...data.slice(8, 12)) === "WEBP") return "image/webp";
    return null;
  }

  function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function decodeImage(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image could not be decoded."));
      };
      img.src = url;
    });
  }

  async function normalizeImage(file) {
    if (!file || file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 5 MiB or smaller.");
    const source = new Uint8Array(await file.arrayBuffer());
    const mime = imageMime(source);
    if (!mime) throw new Error("Unsupported image. Use PNG, JPEG, or WebP.");
    const decoded = await decodeImage(new Blob([source], { type: mime }));
    const width = decoded.width || decoded.naturalWidth;
    const height = decoded.height || decoded.naturalHeight;
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
      decoded.close?.();
      throw new Error("Decoded image exceeds 12 MP.");
    }
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d").drawImage(decoded, 0, 0, canvas.width, canvas.height);
    decoded.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.9));
    if (!blob) throw new Error("Image re-encode failed.");
    return {
      id: uid("asset"),
      courseId: state.meta.courseId,
      lessonId: state.meta.lessonId,
      mime,
      name: file.name || "note-image",
      alt: state.ui.decorative.checked ? "" : state.ui.alt.value.trim() || file.name || "note image",
      decorative: Boolean(state.ui.decorative.checked),
      width: canvas.width,
      height: canvas.height,
      bytes: blob.size,
      dataUrl: await readDataUrl(blob),
      createdAt: now()
    };
  }

  async function acceptImages(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    state.ui.save.disabled = true;
    try {
      if (await storageUsage() >= 0.85) throw new Error("Storage is above 85%. Delete or export images before adding more.");
      for (const file of list) {
        const asset = await normalizeImage(file);
        state.pendingAssets.push(asset);
      }
      renderPendingImages();
      status("Image processed. Save the note to persist it.");
    } catch (error) {
      status(error.message || "Image rejected.", "error");
    } finally {
      state.ui.save.disabled = false;
    }
  }

  function dataUrlBytes(dataUrl) {
    const comma = dataUrl.indexOf(",");
    const raw = atob(dataUrl.slice(comma + 1));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  function setU16(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function setU32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  function crcNumber(data) {
    return parseInt(crc32(data), 16) >>> 0;
  }

  function zipStore(entries) {
    const locals = [];
    const central = [];
    let offset = 0;
    entries.forEach((entry) => {
      const name = bytes(entry.name);
      const data = entry.data;
      const crc = crcNumber(data);
      const local = new Uint8Array(30 + name.length);
      const lv = new DataView(local.buffer);
      setU32(lv, 0, 0x04034b50);
      setU16(lv, 4, 20);
      setU16(lv, 6, 2048);
      setU16(lv, 8, 0);
      setU32(lv, 14, crc);
      setU32(lv, 18, data.length);
      setU32(lv, 22, data.length);
      setU16(lv, 26, name.length);
      local.set(name, 30);
      locals.push(local, data);

      const cd = new Uint8Array(46 + name.length);
      const cv = new DataView(cd.buffer);
      setU32(cv, 0, 0x02014b50);
      setU16(cv, 4, 20);
      setU16(cv, 6, 20);
      setU16(cv, 8, 2048);
      setU16(cv, 10, 0);
      setU32(cv, 16, crc);
      setU32(cv, 20, data.length);
      setU32(cv, 24, data.length);
      setU16(cv, 28, name.length);
      setU32(cv, 42, offset);
      cd.set(name, 46);
      central.push(cd);
      offset += local.length + data.length;
    });
    const centralSize = central.reduce((sum, item) => sum + item.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    setU32(ev, 0, 0x06054b50);
    setU16(ev, 8, entries.length);
    setU16(ev, 10, entries.length);
    setU32(ev, 12, centralSize);
    setU32(ev, 16, offset);
    const all = locals.concat(central, [end]);
    const out = new Uint8Array(all.reduce((sum, item) => sum + item.length, 0));
    let at = 0;
    all.forEach((item) => {
      out.set(item, at);
      at += item.length;
    });
    return out;
  }

  function download(blob, filename) {
    const link = createElement("a", { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function packagePayload() {
    return {
      schema: PACKAGE_SCHEMA,
      version: PACKAGE_VERSION,
      courseId: state.meta.courseId,
      lessonId: state.meta.lessonId,
      contentFingerprint: state.meta.contentFingerprint || null,
      exportedAt: now(),
      annotations: clone(state.annotations),
      notes: clone(state.notes),
      assets: state.assets.map((asset) => ({
        id: asset.id,
        mime: asset.mime,
        name: asset.name,
        alt: asset.alt,
        decorative: Boolean(asset.decorative),
        width: asset.width,
        height: asset.height,
        bytes: asset.bytes
      }))
    };
  }

  function exportPackage() {
    const payload = packagePayload();
    const entries = [
      { name: "manifest.json", data: bytes(JSON.stringify({ schema: payload.schema, version: PACKAGE_VERSION, courseId: payload.courseId, lessonId: payload.lessonId, exportedAt: payload.exportedAt })) },
      { name: "notes.json", data: bytes(JSON.stringify(payload)) }
    ];
    state.assets.forEach((asset) => entries.push({ name: `assets/${asset.id}.${asset.mime === "image/png" ? "png" : asset.mime === "image/jpeg" ? "jpg" : "webp"}`, data: dataUrlBytes(asset.dataUrl) }));
    const topic = `${state.meta.topic || "learnmap"}`.replace(/[\\/:*?"<>|]+/g, "-");
    download(new Blob([zipStore(entries)], { type: "application/vnd.learnmap.notes+zip" }), `${topic}-${state.meta.lessonId}-notes.learnmap`);
    toast("Package exported. It may contain personal notes and screenshots.");
  }

  function unzipStore(data) {
    if (data.length > PACKAGE_LIMIT_BYTES) throw new Error("Package is too large.");
    const files = new Map();
    const localMeta = new Map();
    let offset = 0;
    let total = 0;
    while (offset + 30 <= data.length && new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true) === 0x04034b50) {
      const view = new DataView(data.buffer, data.byteOffset + offset);
      const flags = view.getUint16(6, true);
      const method = view.getUint16(8, true);
      const crc = view.getUint32(14, true);
      const size = view.getUint32(18, true);
      const nameLength = view.getUint16(26, true);
      const extraLength = view.getUint16(28, true);
      if ((flags & ~2048) !== 0 || method !== 0) throw new Error("Encrypted, descriptor, or compressed packages are not supported.");
      const name = new TextDecoder().decode(data.slice(offset + 30, offset + 30 + nameLength));
      if (!name || name.includes("..") || name.startsWith("/") || name.includes("\\") || files.has(name)) throw new Error("Invalid package path.");
      const start = offset + 30 + nameLength + extraLength;
      const body = data.slice(start, start + size);
      if (body.length !== size || crcNumber(body) !== crc) throw new Error("Package CRC validation failed.");
      files.set(name, body);
      localMeta.set(name, { crc, size, offset });
      total += size;
      if (files.size > 1002 || total > PACKAGE_LIMIT_BYTES) throw new Error("Package entry limit exceeded.");
      offset = start + size;
    }
    let eocd = -1;
    for (let i = data.length - 22, min = Math.max(0, data.length - 65557); i >= min; i -= 1) {
      if (new DataView(data.buffer, data.byteOffset + i, 4).getUint32(0, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("Package central directory is missing.");
    const end = new DataView(data.buffer, data.byteOffset + eocd);
    const count = end.getUint16(10, true);
    const centralSize = end.getUint32(12, true);
    const centralOffset = end.getUint32(16, true);
    if (count !== files.size || centralOffset + centralSize !== eocd) throw new Error("Central directory count or offset is invalid.");
    let at = centralOffset;
    const seen = new Set();
    for (let i = 0; i < count; i += 1) {
      if (at + 46 > eocd || new DataView(data.buffer, data.byteOffset + at, 4).getUint32(0, true) !== 0x02014b50) throw new Error("Central directory is corrupt.");
      const view = new DataView(data.buffer, data.byteOffset + at);
      const flags = view.getUint16(8, true);
      const method = view.getUint16(10, true);
      const crc = view.getUint32(16, true);
      const size = view.getUint32(20, true);
      const nameLength = view.getUint16(28, true);
      const extraLength = view.getUint16(30, true);
      const commentLength = view.getUint16(32, true);
      const localOffset = view.getUint32(42, true);
      const name = new TextDecoder().decode(data.slice(at + 46, at + 46 + nameLength));
      const local = localMeta.get(name);
      if ((flags & ~2048) !== 0 || method !== 0 || !local || local.crc !== crc || local.size !== size || local.offset !== localOffset || seen.has(name)) throw new Error("Central directory does not match local entries.");
      seen.add(name);
      at += 46 + nameLength + extraLength + commentLength;
    }
    if (!files.has("manifest.json") || !files.has("notes.json")) throw new Error("Package must include manifest.json and notes.json.");
    return files;
  }

  async function importPackage(file) {
    try {
      const raw = new Uint8Array(await file.arrayBuffer());
      const isJson = file.type === "application/json" || /\.json$/i.test(file.name || "");
      const files = isJson ? null : unzipStore(raw);
      const notes = JSON.parse(new TextDecoder().decode(isJson ? raw : files.get("notes.json")));
      const validation = validateImport(notes);
      if (!validation.ok) throw new Error(validation.errors.join(" "));
      const payload = validation.value;
      const manifest = isJson ? { schema: payload.schema, version: payload.version, courseId: payload.courseId, lessonId: payload.lessonId } : JSON.parse(new TextDecoder().decode(files.get("manifest.json")));
      if (!manifest || manifest.schema !== PACKAGE_SCHEMA || manifest.version !== PACKAGE_VERSION || manifest.courseId !== payload.courseId || manifest.lessonId !== payload.lessonId) throw new Error("Manifest and note data do not match.");
      const importedAssets = [];
      if (isJson) {
        if (payload.assets.length) throw new Error("JSON imports cannot contain binary image assets. Use a .learnmap package.");
      } else {
        const expected = new Set(["manifest.json", "notes.json"]);
        payload.assets.forEach((asset) => expected.add(`assets/${asset.id}.${asset.mime === "image/png" ? "png" : asset.mime === "image/jpeg" ? "jpg" : "webp"}`));
        if (files.size !== expected.size || Array.from(files.keys()).some((name) => !expected.has(name))) throw new Error("Package contains undeclared or missing entries.");
        for (const asset of payload.assets) {
          const entryName = `assets/${asset.id}.${asset.mime === "image/png" ? "png" : asset.mime === "image/jpeg" ? "jpg" : "webp"}`;
          const data = files.get(entryName);
          if (!data || data.length > MAX_IMAGE_BYTES || data.length !== asset.bytes || imageMime(data) !== asset.mime) throw new Error("Image signature, size, or reference is invalid.");
          const decoded = await decodeImage(new Blob([data], { type: asset.mime }));
          const width = decoded.width || decoded.naturalWidth;
          const height = decoded.height || decoded.naturalHeight;
          if (!width || !height || width * height > MAX_IMAGE_PIXELS || width !== asset.width || height !== asset.height) {
            decoded.close?.();
            throw new Error("Image dimensions are invalid.");
          }
          decoded.close?.();
          importedAssets.push({ ...asset, courseId: state.meta.courseId, lessonId: state.meta.lessonId, dataUrl: await readDataUrl(new Blob([data], { type: asset.mime })) });
        }
      }
      const next = {
        annotations: payload.annotations.map((item) => normalizeAnnotation({ ...item, courseId: state.meta.courseId, lessonId: state.meta.lessonId })),
        notes: payload.notes.map((item) => ({ ...item, courseId: state.meta.courseId, lessonId: state.meta.lessonId, surfaceColor: normalizeHex(item.surfaceColor, "#FFFFFF") })),
        assets: importedAssets,
        settings: state.settings
      };
      if (state.db) await putAll(next);
      rememberUndo();
      state.annotations = next.annotations;
      state.notes = next.notes;
      state.assets = next.assets;
      renderAll();
      queueSave();
      status("Package imported.");
      return { ok: true, summary: getSummary() };
    } catch (error) {
      status(`Import failed: ${error.message || error}`, "error");
      throw error;
    }
  }

  function exportMarkdown() {
    const lines = ["# LearnMap Learning Notes", "", `- Course: ${state.meta.topic || ""}`, `- Lesson: ${state.meta.lessonId}`, `- Exported: ${now()}`, ""];
    state.notes.forEach((note, index) => {
      const annotation = state.annotations.find((item) => item.id === note.annotationId);
      lines.push(`## ${index + 1}. ${annotation?.anchor?.exact || "Unbound source"}`, "", noteText(note), "", `- Style: ${annotation ? annotationLabel(annotation) : "-"}`, `- Images: ${noteAssetIds(note).length}`, "");
    });
    download(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }), `${`${state.meta.topic || "learnmap"}`.replace(/[\\/:*?"<>|]+/g, "-")}-notes.md`);
  }

  async function copyNote(note) {
    const text = noteText(note);
    const assets = noteAssetIds(note).map((id) => state.assets.find((asset) => asset.id === id)).filter(Boolean);
    try {
      if (window.isSecureContext && window.ClipboardItem && navigator.clipboard?.write && assets.length) {
        const escapeHtml = (value) => `${value}`.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
        const html = `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>${assets.map((asset) => `<img src="${asset.dataUrl}" alt="${escapeHtml(asset.alt || asset.name || "note image")}">`).join("")}`;
        const firstImage = assets[0];
        const item = new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
          [firstImage.mime]: new Blob([dataUrlBytes(firstImage.dataUrl)], { type: firstImage.mime })
        });
        await navigator.clipboard.write([item]);
        status("Copied note text and images.");
        return;
      }
      await navigator.clipboard.writeText(text);
      status(assets.length ? "Copied text only. Image clipboard writes require ClipboardItem in a secure context." : "Copied note text.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        status(assets.length ? "Copied text only after image clipboard failed." : "Copied note text.");
      } catch {
        status("Clipboard copy failed.", "error");
      }
    }
  }

  async function clearLessonAnnotations() {
    if (confirm("Export a full note backup before clearing?")) exportPackage();
    if (!confirm("Confirm permanent deletion of this lesson's annotations and notes. Learning progress is preserved.")) return false;
    try {
      if (state.db) await putAll({ annotations: [], notes: [], assets: [], settings: state.settings });
    } catch {
      status("Clear failed. Existing notes were preserved.", "error");
      return false;
    }
    rememberUndo();
    state.annotations = [];
    state.notes = [];
    state.assets = [];
    state.activeId = null;
    renderAll();
    closeEditor();
    status("Lesson annotations and notes cleared.");
    return true;
  }

  function getSummary() {
    const updatedAt = state.annotations.concat(state.notes).reduce((latest, item) => {
      const value = `${item.updatedAt || item.createdAt || ""}`;
      return value > latest ? value : latest;
    }, "");
    return {
      underlineCount: state.annotations.filter((item) => item.markType !== "highlight").length,
      highlightCount: state.annotations.filter((item) => item.markType === "highlight").length,
      noteCount: state.notes.length,
      imageCount: state.notes.reduce((sum, note) => sum + noteAssetIds(note).length, 0),
      questionNoteCount: state.notes.filter((note) => note.tag === "question").length,
      orphanedCount: state.annotations.filter((item) => item.orphaned).length,
      updatedAt: updatedAt || null
    };
  }

  function renderAll() {
    renderMarks();
    renderManager();
  }

  function init(meta = {}) {
    if (state.initialized) return window.LearnMapAnnotations;
    state.meta = {
      courseId: "learnmap-course",
      topic: "LearnMap",
      lessonId: location.pathname || "lesson",
      annotationRuntimeVersion: API_VERSION,
      ...meta
    };
    state.root = document.querySelector("[data-lm-annotatable]") || document.querySelector(".main") || document.body;
    if (!state.root) return window.LearnMapAnnotations;
    state.initialized = true;
    buildUi();
    renderAll();
    syncToolbarState();
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("click", (event) => {
      if (state.ui.popover?.dataset.pinned === "true" && !event.target.closest(".lm-note-popover,.lm-note-hit")) closePreview({ restoreFocus: true });
      if (!event.target.closest(".lm-menu-wrap")) closeMenus();
    });
    document.addEventListener("keyup", (event) => {
      if (event.key === "Escape") {
        if (state.ui.imageLightbox && !state.ui.imageLightbox.hidden) {
          closeImageLightbox();
          return;
        }
        closeToolbar();
        closePreview({ restoreFocus: true });
        if (state.ui.editor?.classList.contains("open")) closeEditor();
        else if (state.ui.manager?.classList.contains("open")) closeManager();
      }
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !/textarea|input/i.test(document.activeElement?.tagName || "")) {
        const previous = state.undo.pop();
        if (previous) {
          event.preventDefault();
          state.annotations = previous.annotations;
          state.notes = previous.notes;
          state.assets = previous.assets || state.assets;
          renderAll();
          queueSave();
          toast("Undo complete.");
        }
      }
    });
    window.addEventListener("resize", () => {
      renderAll();
      repositionOpenPanel();
    });
    window.addEventListener("scroll", () => {
      if (!(window.CSS && CSS.highlights)) renderMarks();
      repositionOpenPanel();
    }, { passive: true });
    window.addEventListener("beforeunload", (event) => {
      if (state.ui.editor?.classList.contains("open") && state.editorSnapshot !== editorDraft()) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    restore();
    return window.LearnMapAnnotations;
  }

  window.LearnMapAnnotations = {
    version: API_VERSION,
    init,
    getSummary,
    clearLessonAnnotations,
    exportPackage,
    importPackage,
    exportMarkdown,
    __test: { crc32, buildAnchor, resolveAnchor, mergeAnnotations, validateImport }
  };

  const shouldInit = () => !window.LESSON_META || window.LESSON_META.annotationEnabled !== false;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (shouldInit()) init(window.LESSON_META || {});
    }, { once: true });
  } else if (shouldInit()) {
    init(window.LESSON_META || {});
  }
})();
