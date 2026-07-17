# Learning Session Artifact Templates

Use these templates when the user wants an ongoing learning workspace.

Language-specific naming is mandatory:

- Chinese mode: generated learning artifacts use Chinese folder and file names.
- English mode: generated learning artifacts use English folder and file names.
- Repository/skill functional files keep required names: `SKILL.md`, `README*.md`, `LICENSE`, `agents/openai.yaml`, and `references/*.md`.
- Technical terms such as MDP, Q-Learning, PPO, DQN, and Bellman equation stay in English in both modes.
- Optional mentor lens artifacts are created only when requested: Chinese mode uses `思维镜片.md`; English mode uses `mentor-lens.md`.
- Courseware output mode is stored as `outputMode: fast | slow`.
- Courseware HTML scope is stored as `htmlPlan: single-overview | compact-series | standard-series | deep-series | custom`.
- Per-page courseware specification is stored as `coursewareTier: compact | standard | high-quality | custom`.
- Courseware delivery cadence is stored as `deliveryMode: batch | interactive | custom`.
- `single-overview` creates one overview courseware page. `compact-series` plans 2-3 HTML files, `standard-series` plans 4-6 HTML files, and `deep-series` plans 7-10 HTML files.
- Missing language/background/goal/output-scope/courseware-tier/delivery choices are collected only with the agent surface's native clickable choice popup, not prose questions or local HTML.

---

## Workspace Directory Structure

### Chinese Mode

```text
学习/<主题>/
├── 元数据/
│   ├── 学习档案.md          # 学习背景、目标、语言选择
│   ├── 学习进度.md          # 当前课程、测验结果、薄弱点
│   ├── 错题记录.md          # 误区与纠正
│   └── 生成状态.json        # 可恢复的逐课生成检查点
├── 第01课-全局地图/
│   └── 课件.html            # 全局地图 + 嵌入式掌握检查
├── 第02课-MDP详解/
│   └── 课件.html            # 交互式课件 + 嵌入式测验
├── 第03课-价值函数/
│   └── 课件.html
├── 快速总览/
│   └── 课件.html            # fast mode only: one condensed overview courseware page
├── 视频讲解.html              # optional, only when accepted
├── 思维镜片.md                # optional, only when requested
└── ...
```

### English Mode

```text
learning/<topic-slug>/
├── _meta/
│   ├── profile.md          # Learner background, goal, language choice
│   ├── progress.md         # Current module, quiz results, weak spots
│   ├── mistakes.md         # Misconceptions and corrections
│   └── generation-state.json # Resumable per-lesson generation checkpoint
├── lesson-01-<slug>/
│   └── index.html          # Global map + embedded mastery check
├── lesson-02-<slug>/
│   └── index.html          # Interactive lesson + embedded quiz
├── lesson-03-<slug>/
│   └── index.html
├── fast-overview/
│   └── index.html          # fast mode only: one condensed overview courseware page
├── video-explainer.html       # optional, only when accepted
├── mentor-lens.md             # optional, only when requested
└── ...
```

The trees above illustrate final naming only. Create each lesson directory just in time when that lesson enters `rendering`; never pre-create future lesson directories.

**Naming examples by language:**

| Mode | Workspace | Lesson folder | Lesson HTML | Mastery Check |
|------|-----------|--------------|-------------|---------------|
| Chinese | `学习/强化学习/` | `第01课-全局地图/` | `课件.html` | embedded |
| Chinese | `学习/强化学习/` | `第02课-MDP详解/` | `课件.html` | embedded |
| Chinese | `学习/强化学习/` | `快速总览/` | `课件.html` | embedded |
| Chinese | `学习/强化学习/` | root workspace | `视频讲解.html` | optional |
| Chinese | `学习/强化学习/` | root workspace | `思维镜片.md` | optional |
| English | `learning/reinforcement-learning/` | `lesson-01-global-map/` | `index.html` | embedded |
| English | `learning/reinforcement-learning/` | `lesson-02-mdp/` | `index.html` | embedded |
| English | `learning/reinforcement-learning/` | `fast-overview/` | `index.html` | embedded |
| English | `learning/reinforcement-learning/` | root workspace | `video-explainer.html` | optional |
| English | `learning/reinforcement-learning/` | root workspace | `mentor-lens.md` | optional |

---

## Profile File

Chinese mode path: `元数据/学习档案.md`
English mode path: `_meta/profile.md`

```markdown
# Learner Profile / 学习者档案

- **Language / 语言**: [Chinese / English]
- **Domain / 目标领域**: [topic]
- **Background / 背景**: [what they already know]
- **Goal / 目标**: [project / interview / interest / exam / paper]
- **Deadline / 时间规划**: [if any]
- **Preferred Style / 讲解风格**: [detailed / concise, interactive HTML]
- **Output Mode / 课件输出模式**: [fast / slow]
- **HTML Plan / HTML 数量方案**: [single-overview / compact-series / standard-series / deep-series / custom]
- **HTML Plan Instructions / 自定义 HTML 范围**: [learner text / null]
- **Courseware Tier / 课件规格**: [compact / standard / high-quality / custom]
- **Courseware Tier Instructions / 自定义课件规格**: [learner text / null]
- **Delivery Mode / 生成节奏**: [batch / interactive / custom]
- **Delivery Instructions / 自定义生成节奏**: [learner text / null]
- **Success Criteria / 成功标准**: [what "done" looks like]
- **Video Explainer / 视频讲解**: [offered / accepted / declined]
- **Video Instructions / 自定义视频说明**: [learner text / null]
- **Mentor Lens / 思维镜片**: [none / lens name]
```

---

## Progress File

Chinese mode path: `元数据/学习进度.md`
English mode path: `_meta/progress.md`

```markdown
# Progress / 进度追踪

- Current / 当前进度: **Lesson X — [name]**
- Output mode / 课件输出模式: [fast / slow]
- HTML plan / HTML 数量方案: [single-overview / compact-series / standard-series / deep-series / custom]
- HTML plan instructions / 自定义 HTML 范围: [learner text / null]
- Courseware tier / 课件规格: [compact / standard / high-quality / custom]
- Courseware tier instructions / 自定义课件规格: [learner text / null]
- Delivery mode / 生成节奏: [batch / interactive / custom]
- Delivery instructions / 自定义生成节奏: [learner text / null]
- Generation state / 生成状态: [planned / rendering / paused / complete / failed]
- Generated through / 已生成至: [highest continuous validated lesson / 0]
- Mastered through / 已掌握至: [highest lesson supported by learning records / 0]
- Last verified artifact / 最近验证课件: [relative path / null]
- Resume command / 续生成命令: [exact command or request / null]
- Completed learning / 已完成学习（由学习记录证明，不等于已生成）:
  - Lesson 1 done
  - ...
- Weak spots / 薄弱点: [concepts to revisit]
- Next / 下一步: [specific action + command to type]
- Video explainer / 视频讲解: [offered / accepted / declined, output path if accepted]
- Video instructions / 自定义视频说明: [learner text / null]
- Mentor lens / 思维镜片: [none / lens name, output path if requested]
```

---

## Generation State

Chinese mode path: `元数据/生成状态.json`
English mode path: `_meta/generation-state.json`

For every plan, including `single-overview`, maintain the machine-readable checkpoint defined in [resilient-generation.md](resilient-generation.md). Generate one page into a `.partial` file, run the validator from the loaded LearnMap Skill root, rename it inside staging, atomically commit the staging directory, then checkpoint before updating progress or starting another page. Empty directories, partial/staging files, and stale progress claims never count as generated lessons.

Keep `generatedThrough` and `masteredThrough` separate. Reconcile the progress file and generation state against validated final HTML files from Lesson 1 forward whenever generation starts or resumes.

---

## Native Calibration Popup Result

Collect calibration only through the current agent surface's native clickable choice popup (for example, its structured user-input tool). Never create `校准选择.html` or `calibration.html`, never open a browser for calibration, and never ask the same fields as prose or a numbered list.

Use short staged popups with at most three groups per popup and 2-3 explicit options per question. The native client supplies the free-text `Other`; do not add a duplicate explicit `Other` when the client injects it.

1. Language.
2. Missing learner context: topic scope, background, and goal (at most three groups total).
3. Courseware scope: first ask `1`, `2-3`, or `4-10`; only when `4-10` is selected, ask `4-6` or `7-10`.
4. Per-page courseware tier: `compact`, `standard`, or `high-quality`.
5. Delivery mode only after a multi-HTML scope is known.
6. Optional video.

The native client must expose free-text `Other` for every group. Keep the normalized result in profile/progress rather than creating a calibration artifact. Minimal internal state:

```json
{
  "language": "zh-CN",
  "topicScope": "repo/codebase",
  "background": "heard-of",
  "goal": "project",
  "outputMode": "slow",
  "htmlPlan": "standard-series",
  "htmlPlanInstructions": null,
  "coursewareTier": "standard",
  "coursewareTierInstructions": null,
  "deliveryMode": "interactive",
  "deliveryInstructions": null,
  "videoExplainer": "declined",
  "videoInstructions": null
}
```

For `htmlPlan: single-overview`, set `deliveryMode: batch` without asking. For a multi-HTML plan, pass only `batch` and `interactive` as explicit native options; map the client-injected `Other` to `custom`. Default to `interactive` only when the learner does not answer.

### Courseware State Normalization

Normalize invalid or legacy combinations before generating or resuming:

| Input condition | Normalized state |
|---|---|
| `outputMode: fast` or `htmlPlan: single-overview` | `fast` + `single-overview` + `batch` |
| `compact-series`, `standard-series`, or `deep-series` | `slow` + stored/selected `batch`, `interactive`, or `custom` |
| `htmlPlan: custom` describing one HTML | `fast` + `single-overview` + `batch` |
| `htmlPlan: custom` describing multiple HTML files | `slow` + `custom` + stored/selected delivery mode |

Normalize missing legacy `coursewareTier` to `standard`. Preserve learner-entered `htmlPlanInstructions`, `coursewareTierInstructions`, and `deliveryInstructions` through normalization so injected `Other` text is never lost. A tier change affects future pages only unless the learner explicitly requests regeneration.

---

## Fast Mode Courseware

Chinese mode path: `快速总览/课件.html`
English mode path: `fast-overview/index.html`

Fast mode is one complete compressed interactive HTML courseware page. It is for quickly understanding the whole picture before deciding whether to go deep.

It MUST include:

- a core question and one-sentence field definition
- a global map with 5-9 modules and visible relationships
- essential vocabulary and "ignore for now" guidance
- a core workflow or mental model
- 3-5 concrete examples that connect back to the map
- common traps and false friends
- embedded mini mastery checks
- an end-card checklist with same-page review links
- a next-step plan for expanding into slow mode
- a learning record export with `"outputMode": "fast"`, `"htmlPlan": "single-overview"`, `"deliveryMode": "batch"`, and the selected `"coursewareTier"`

It MUST NOT create `第01课-*` / `lesson-01-*` and later lesson folders unless the learner explicitly asks to switch to slow mode or expand a module.

---

## Mistake Log

Chinese mode path: `元数据/错题记录.md`
English mode path: `_meta/mistakes.md`

```markdown
# Mistake Log / 错题记录

| Date | Concept | Mistake / 错误理解 | Corrected / 正确理解 | Retest? |
|------|---------|-------------------|---------------------|---------|
| ... | ... | ... | ... | ... |
```

---

## Lesson 1 Global Map HTML

Chinese mode path: `第01课-全局地图/课件.html`
English mode path: `lesson-01-global-map/index.html`

Lesson 1 is not a Markdown note. It is the first interactive HTML lesson and MUST include:

- a one-sentence field definition
- a comparison table against adjacent paradigms or fields
- 5-9 module cards that form the domain map
- a visible learning path/dependency diagram
- a glossary/term quick-reference section
- beginner traps and what to ignore at first
- embedded mastery check questions in the same page
- end-of-lesson self-check checklist with review links and next-step command

---

## Interactive HTML Lesson Scaffold

For every lesson, including Lesson 1, generate an interactive HTML page. Below is the **minimum required scaffold**. Every HTML lesson must include all marked [REQUIRED] elements.

### Required CSS Variables (Dark Theme)

```css
:root {
  --bg: #0f172a;
  --card: #1e293b;
  --border: #334155;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #38bdf8;
  --accent2: #a78bfa;
  --correct: #4ade80;
  --warn: #fbbf24;
  --danger: #f87171;
}
```

### Required HTML Structure

```html
<!DOCTYPE html>
<html lang="zh-CN">  <!-- or "en" -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lesson N: [Title] — [Domain]</title>
  <style>/* CSS here */</style>
</head>
<body>

  <!-- [REQUIRED] Sticky top bar -->
  <div class="topbar">
    <div class="breadcrumb">[Domain] / <span>Lesson N</span></div>
    <h1>[Lesson Title]</h1>
    <span class="record-pill" id="recordPill">[0% complete]</span>
    <button onclick="resetLearningProgress()">[Reset Learning Text]</button>
  </div>

  <!-- [REQUIRED] Sidebar TOC (hidden on screens < 1300px) -->
  <nav class="toc" id="toc">
    <a href="#s0">0. [Core Question]</a>
    <a href="#s1">1. [Section]</a>
    <!-- ... -->
  </nav>

  <div class="main" data-lm-annotatable>

    <!-- [REQUIRED] Section 0: Core question this lesson answers -->
    <div class="section" id="s0" data-lm-scope="s0">
      <h2>[Icon] Core Question / 本课核心问题</h2>
      <p class="subtitle">[One-line summary]</p>
      <div class="def-box">
        <strong>Core Question:</strong> [The one question this lesson answers]
      </div>
    </div>

    <!-- Content sections with .section cards -->
    <div class="section" id="s1">
      <h2>[Icon] [Section Title]</h2>
      <p class="subtitle">[Subtitle]</p>
      <!-- content -->
    </div>

    <!-- ... more sections ... -->

    <!-- [REQUIRED] Final section: Mastery check -->
    <div class="section" id="sN" style="border-color: var(--accent2);">
      <h2>[Check Icon] Lesson N [Mastery Check / 掌握检查]</h2>
      <p class="subtitle">[N questions, pass to proceed]</p>
      <!--
        [REQUIRED] Each .mini-quiz must include diagnostic metadata:
        data-question: exact question text
        data-concept: tested concept or skill
        data-correct: correct answer text or key
        data-retry: what to review if wrong
        data-review-target: section id or hash to revisit if wrong, such as "#s2"
        Wrong-answer feedback must include a visible 复习 / Review jump back to this target.
      -->
      <div class="mini-quiz" id="mq1" data-question="[Question text]" data-concept="[Concept]" data-correct="[Correct answer]" data-retry="[Review suggestion]" data-review-target="#s1">
        <p>[Question text]</p>
        <button class="opt" onclick="checkMQ('mq1', 0, false)">[Wrong option]</button>
        <button class="opt" onclick="checkMQ('mq1', 1, true)">[Correct option]</button>
        <div class="explain" id="mq1-explain" data-default="[Explanation text]">
          [Explanation text]
          <button class="review-link" onclick="event.stopPropagation(); scrollToDetail('s1');">复习 →</button>
        </div>
      </div>
    </div>

    <!-- [REQUIRED] End-of-lesson card -->
    <div class="section end-card" id="endCard">
      <h3>[Completion Heading]</h3>
      <p>[Summary message]</p>

      <!-- [REQUIRED] Self-check checklist -->
      <div class="checklist">
        <span class="check-item" onclick="toggleCheck(this)">
          <span class="check-status">☐</span>
          <span class="check-text">[Check item 1]</span>
          <a class="review-link" href="#s1" onclick="event.stopPropagation();" title="[Review section 1]">复习 →</a>
        </span>
        <span class="check-item" onclick="toggleCheck(this)">
          <span class="check-status">☐</span>
          <span class="check-text">[Check item 2]</span>
          <a class="review-link" href="#s2" onclick="event.stopPropagation();" title="[Review section 2]">复习 →</a>
        </span>
        <!-- ... -->
      </div>

      <!-- [REQUIRED] Learning record panel for AI handoff -->
      <div class="record-panel">
        <h4>[Learning Record / 学习记录]</h4>
        <p id="recordSummary">[Progress summary]</p>
        <button onclick="copyLearningRecord()">[Copy for AI / 复制学习记录给AI]</button>
        <button onclick="downloadLearningRecord()">[Download JSON / 下载学习记录.json]</button>
        <small>[Place the downloaded JSON beside this lesson if you want the AI to read it later.]</small>
      </div>

      <!-- [REQUIRED] Next-step command -->
      <div class="next-step">
        <p>[Prompt text]</p>
        <span class="next-cmd">[Command to type in Claude Code]</span>
        <p class="preview">[Next lesson preview]</p>
      </div>
    </div>

  </div><!-- /main -->

  <!-- [REQUIRED] Floating bottom bar -->
  <div class="bottom-bar" id="bottomBar">
    <span class="msg">[Completion message]</span>
    <span>[Next step]: <code>[command]</code></span>
    <button onclick="document.getElementById('endCard').scrollIntoView({behavior:'smooth'})">[View Card]</button>
  </div>

  <script>
  // [REQUIRED] All functions below must be present

  var LESSON_RECORD_KEY = "ai10x:[topic-slug]:lesson-N";
  var LESSON_META = {
    topic: "[Domain]",
    courseId: "[stable-course-id]",
    lessonId: "lesson-N",
    lessonTitle: "[Lesson Title]",
    language: "zh-CN", // or "en"
    outputMode: "slow", // "fast" for 快速总览 / fast-overview
    htmlPlan: "standard-series", // single-overview / compact-series / standard-series / deep-series / custom
    htmlPlanInstructions: null, // learner-entered courseware-scope Other text
    coursewareTier: "standard", // compact / standard / high-quality / custom
    coursewareTierInstructions: null, // learner-entered tier Other text
    deliveryMode: "interactive", // batch / interactive / custom
    deliveryInstructions: null, // learner-entered delivery Other text
    videoInstructions: null, // learner text for a custom accepted video request
    mentorLens: "none", // or requested lens name
    annotationEnabled: true,
    annotationRuntimeVersion: "2",
    contentFingerprint: "[normalized-annotatable-text-sha256]",
    nextCommand: "[Command to type in Claude Code]",
    recordFileName: "学习记录.json" // English mode: "learning-record.json"
  };

  // Scroll to detail element with sticky header offset
  function scrollToDetail(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - 85;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  // Toggle accordion open/close
  function toggleAccordion(id) {
    document.getElementById(id).classList.toggle("open");
  }

  // Switch perspective tab (query panels from parent SECTION, not tabs container)
  function switchTab(name) {
    var section = document.getElementById("sN"); // section containing the tabs
    section.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
    section.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
    var btnMap = { user: 0, biz: 1, eng: 2 };
    section.querySelectorAll(".tab-btn")[btnMap[name]].classList.add("active");
    document.getElementById("tab-" + name).classList.add("active");
  }

  // Mini-quiz answer handler (guards against double-click)
  var _mqAnswered = {};
  var _mqState = {};
  function checkMQ(mqId, optIdx, isCorrect) {
    if (_mqAnswered[mqId]) return;
    _mqAnswered[mqId] = true;
    _mqState[mqId] = { choiceIndex: optIdx, correct: isCorrect };
    var mq = document.getElementById(mqId);
    var explain = document.getElementById(mqId + "-explain");
    var opts = mq.querySelectorAll(".opt");
    var reviewTarget = mq.getAttribute("data-review-target") || "";
    var reviewId = reviewTarget.replace("#", "");
    var reviewLabel = LESSON_META.language === "zh-CN" ? "复习 →" : "Review →";
    var baseExplain = explain.getAttribute("data-default") || explain.textContent.trim();
    var reviewButton = reviewId ? ' <button class="review-link" onclick="event.stopPropagation(); scrollToDetail(\'' + reviewId + '\');">' + reviewLabel + '</button>' : "";
    opts.forEach(function(o) { o.classList.remove("chosen-correct", "chosen-wrong"); });
    if (isCorrect) {
      opts[optIdx].classList.add("chosen-correct");
      explain.className = "explain show ok";
      explain.innerHTML = "[Correct icon] <strong>[Correct!]</strong> " + baseExplain + reviewButton;
    } else {
      opts[optIdx].classList.add("chosen-wrong");
      explain.className = "explain show no";
      explain.innerHTML = "[Wrong explanation text] " + baseExplain + reviewButton;
    }
    saveRecord();
    updateRecordUI();
  }

  // Self-check checklist toggle
  function toggleCheck(el) {
    var status = el.querySelector(".check-status");
    if (el.classList.contains("done")) {
      el.classList.remove("done");
      if (status) status.textContent = "☐";
    } else {
      el.classList.add("done");
      if (status) status.textContent = "☑";
    }
    saveRecord();
    updateRecordUI();
  }

  // Build a portable record that AI can read after copy/download.
  function buildLearningRecord() {
    var outputMode = LESSON_META.outputMode || "slow";
    var htmlPlan = LESSON_META.htmlPlan || "standard-series";
    var htmlPlanInstructions = LESSON_META.htmlPlanInstructions || null;
    var coursewareTier = LESSON_META.coursewareTier || "standard";
    var coursewareTierInstructions = LESSON_META.coursewareTierInstructions || null;
    var deliveryMode = LESSON_META.deliveryMode || "interactive";
    var deliveryInstructions = LESSON_META.deliveryInstructions || null;
    var validHtmlPlans = ["single-overview", "compact-series", "standard-series", "deep-series", "custom"];
    if (validHtmlPlans.indexOf(htmlPlan) === -1) htmlPlan = "standard-series";
    if (["compact", "standard", "high-quality", "custom"].indexOf(coursewareTier) === -1) coursewareTier = "standard";
    if (outputMode === "fast" || htmlPlan === "single-overview") {
      outputMode = "fast";
      htmlPlan = "single-overview";
      deliveryMode = "batch";
    } else {
      outputMode = "slow";
      if (["batch", "interactive", "custom"].indexOf(deliveryMode) === -1) deliveryMode = "interactive";
    }
    var quizItems = [];
    document.querySelectorAll(".mini-quiz").forEach(function(q) {
      var id = q.id || "";
      var chosen = q.querySelector(".chosen-correct, .chosen-wrong");
      var state = _mqState[id] || null;
      var explain = document.getElementById(id + "-explain");
      quizItems.push({
        id: id,
        question: q.getAttribute("data-question") || "",
        concept: q.getAttribute("data-concept") || "",
        answered: !!chosen || !!state,
        correct: state ? !!state.correct : !!(chosen && chosen.classList.contains("chosen-correct")),
        choiceIndex: state ? state.choiceIndex : null,
        choiceText: chosen ? chosen.textContent.trim() : "",
        correctAnswer: q.getAttribute("data-correct") || "",
        feedback: explain ? explain.textContent.trim() : "",
        retrySuggestion: q.getAttribute("data-retry") || "",
        reviewTarget: q.getAttribute("data-review-target") || ""
      });
    });
    var checklist = [];
    document.querySelectorAll(".check-item").forEach(function(c) {
      var textEl = c.querySelector(".check-text");
      var reviewEl = c.querySelector(".review-link");
      checklist.push({
        text: textEl ? textEl.textContent.trim() : c.textContent.replace("☑", "").replace("☐", "").trim(),
        checked: c.classList.contains("done"),
        reviewTarget: reviewEl ? reviewEl.getAttribute("href") : ""
      });
    });
    var answered = quizItems.filter(function(q) { return q.answered; }).length;
    var correct = quizItems.filter(function(q) { return q.correct; }).length;
    var checked = checklist.filter(function(c) { return c.checked; }).length;
    var totalTasks = quizItems.length + checklist.length;
    var doneTasks = answered + checked;
    var completion = totalTasks ? Math.round(doneTasks * 100 / totalTasks) : 0;
    var weakSpots = quizItems.filter(function(q) { return q.answered && !q.correct; }).map(function(q) { return q.id; });
    var annotationSummary = window.LearnMapAnnotations && window.LearnMapAnnotations.getSummary
      ? window.LearnMapAnnotations.getSummary()
      : { underlineCount: 0, highlightCount: 0, noteCount: 0, imageCount: 0, questionNoteCount: 0, orphanedCount: 0, updatedAt: null };
    return {
      schema: "ai-10x-learning-record/v1",
      topic: LESSON_META.topic,
      lessonId: LESSON_META.lessonId,
      lessonTitle: LESSON_META.lessonTitle,
      language: LESSON_META.language,
      outputMode: outputMode,
      htmlPlan: htmlPlan,
      htmlPlanInstructions: htmlPlanInstructions,
      coursewareTier: coursewareTier,
      coursewareTierInstructions: coursewareTierInstructions,
      deliveryMode: deliveryMode,
      deliveryInstructions: deliveryInstructions,
      videoInstructions: LESSON_META.videoInstructions || null,
      mentorLens: LESSON_META.mentorLens || "none",
      updatedAt: new Date().toISOString(),
      completion: {
        percent: completion,
        quizAnswered: answered,
        quizCorrect: correct,
        checklistChecked: checked,
        checklistTotal: checklist.length
      },
      quiz: quizItems,
      checklist: checklist,
      weakSpots: weakSpots,
      annotationSummary: annotationSummary,
      nextCommand: LESSON_META.nextCommand
    };
  }

  function saveRecord() {
    try {
      localStorage.setItem(LESSON_RECORD_KEY, JSON.stringify(buildLearningRecord()));
    } catch (e) {}
  }

  function loadRecord() {
    try {
      var raw = localStorage.getItem(LESSON_RECORD_KEY);
      if (!raw) return;
      var record = JSON.parse(raw);
      if (!record || !record.checklist) return;
      if (record.quiz) {
        record.quiz.forEach(function(item) {
          if (!item.answered || item.choiceIndex === null || item.choiceIndex === undefined) return;
          var mq = document.getElementById(item.id);
          if (!mq) return;
          var opts = mq.querySelectorAll(".opt");
          if (!opts[item.choiceIndex]) return;
          _mqAnswered[item.id] = true;
          _mqState[item.id] = { choiceIndex: item.choiceIndex, correct: !!item.correct };
          opts[item.choiceIndex].classList.add(item.correct ? "chosen-correct" : "chosen-wrong");
          var explain = document.getElementById(item.id + "-explain");
          if (explain) explain.className = item.correct ? "explain show ok" : "explain show no";
        });
      }
      document.querySelectorAll(".check-item").forEach(function(c, idx) {
        if (record.checklist[idx] && record.checklist[idx].checked && !c.classList.contains("done")) {
          var status = c.querySelector(".check-status");
          c.classList.add("done");
          if (status) status.textContent = "☑";
        }
      });
    } catch (e) {}
  }

  function updateRecordUI() {
    var record = buildLearningRecord();
    var pill = document.getElementById("recordPill");
    var summary = document.getElementById("recordSummary");
    if (pill) pill.textContent = record.completion.percent + "% complete";
    if (summary) {
      summary.textContent = "[Progress] " + record.completion.percent + "% | [Quiz] " +
        record.completion.quizCorrect + "/" + record.quiz.length + " | [Checklist] " +
        record.completion.checklistChecked + "/" + record.completion.checklistTotal;
    }
  }

  function buildLearningReport() {
    var record = buildLearningRecord();
    var lines = [];
    var isZh = record.language.indexOf("zh") === 0;
    lines.push((isZh ? "# 学习记录" : "# Learning Record") + " — " + record.topic + " / " + record.lessonTitle);
    lines.push("");
    lines.push((isZh ? "- 完成度: " : "- Completion: ") + record.completion.percent + "%");
    lines.push((isZh ? "- 测验: " : "- Quiz: ") + record.completion.quizCorrect + "/" + record.quiz.length);
    lines.push((isZh ? "- 自检: " : "- Checklist: ") + record.completion.checklistChecked + "/" + record.completion.checklistTotal);
    lines.push((isZh ? "- 输出模式: " : "- Output mode: ") + (record.outputMode || "slow"));
    lines.push((isZh ? "- HTML 数量方案: " : "- HTML plan: ") + (record.htmlPlan || "standard-series"));
    if (record.htmlPlanInstructions) lines.push((isZh ? "- 自定义 HTML 范围: " : "- HTML plan instructions: ") + record.htmlPlanInstructions);
    lines.push((isZh ? "- 课件规格: " : "- Courseware tier: ") + (record.coursewareTier || "standard"));
    if (record.coursewareTierInstructions) lines.push((isZh ? "- 自定义课件规格: " : "- Courseware tier instructions: ") + record.coursewareTierInstructions);
    lines.push((isZh ? "- 生成节奏: " : "- Delivery mode: ") + (record.deliveryMode || "interactive"));
    if (record.deliveryInstructions) lines.push((isZh ? "- 自定义生成节奏: " : "- Delivery instructions: ") + record.deliveryInstructions);
    if (record.videoInstructions) lines.push((isZh ? "- 自定义视频说明: " : "- Video instructions: ") + record.videoInstructions);
    lines.push((isZh ? "- 思维镜片: " : "- Mentor lens: ") + (record.mentorLens || "none"));
    lines.push((isZh ? "- 更新时间: " : "- Updated: ") + record.updatedAt);
    lines.push("");
    lines.push(isZh ? "## 答题明细" : "## Quiz Details");
    record.quiz.forEach(function(q, idx) {
      lines.push("");
      lines.push((idx + 1) + ". [" + q.id + "] " + (q.question || (isZh ? "未填写题干" : "Question text missing")));
      lines.push("   - " + (isZh ? "考察概念: " : "Concept: ") + (q.concept || "-"));
      lines.push("   - " + (isZh ? "状态: " : "Status: ") + (q.answered ? (q.correct ? (isZh ? "正确" : "Correct") : (isZh ? "错误" : "Wrong")) : (isZh ? "未作答" : "Unanswered")));
      lines.push("   - " + (isZh ? "我的选择: " : "Selected answer: ") + (q.choiceText || "-"));
      lines.push("   - " + (isZh ? "正确答案: " : "Correct answer: ") + (q.correctAnswer || "-"));
      lines.push("   - " + (isZh ? "反馈/建议: " : "Feedback / suggestion: ") + (q.feedback || q.retrySuggestion || "-"));
    });
    lines.push("");
    lines.push(isZh ? "## 自检清单" : "## Self-Check Checklist");
    record.checklist.forEach(function(c) {
      lines.push("- [" + (c.checked ? "x" : " ") + "] " + c.text + (c.reviewTarget ? " (" + (isZh ? "复习: " : "review: ") + c.reviewTarget + ")" : ""));
    });
    lines.push("");
    lines.push(isZh ? "## 薄弱点" : "## Weak Spots");
    var weak = record.quiz.filter(function(q) { return q.answered && !q.correct; });
    if (weak.length === 0) {
      lines.push(isZh ? "- 暂无已发现薄弱点。" : "- No weak spots detected yet.");
    } else {
      weak.forEach(function(q) {
        lines.push("- " + q.id + ": " + (q.concept || q.question || "-") + " — " + (q.retrySuggestion || q.feedback || (isZh ? "建议复习相关概念。" : "Review this concept.")));
      });
    }
    lines.push("");
    lines.push(isZh ? "## 下一步" : "## Next Step");
    lines.push("`" + record.nextCommand + "`");
    return lines.join("\n");
  }

  function copyLearningRecord() {
    var text = buildLearningReport();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function downloadLearningRecord() {
    var text = JSON.stringify(buildLearningRecord(), null, 2);
    var blob = new Blob([text], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = LESSON_META.recordFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // Reset learning progress only. Learner annotations and notes are independent high-value data.
  function resetLearningProgress() {
    _mqAnswered = {};
    _mqState = {};
    document.querySelectorAll(".accordion").forEach(function(a) {
      if (a.id !== "accWhy") a.classList.remove("open");
    });
    document.querySelectorAll(".mini-quiz .explain").forEach(function(e) {
      e.classList.remove("show", "ok", "no");
    });
    document.querySelectorAll(".mini-quiz .opt").forEach(function(o) {
      o.classList.remove("chosen-correct", "chosen-wrong");
    });
    document.querySelectorAll(".check-item").forEach(function(c) {
      var status = c.querySelector(".check-status");
      c.classList.remove("done");
      if (status) status.textContent = "☐";
    });
    try { localStorage.removeItem(LESSON_RECORD_KEY); } catch (e) {}
    // Reset tabs to first
    var section = document.getElementById("sN");
    if (section) {
      section.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
      section.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
      if (section.querySelectorAll(".tab-btn")[0]) section.querySelectorAll(".tab-btn")[0].classList.add("active");
      if (section.querySelectorAll(".tab-panel")[0]) section.querySelectorAll(".tab-panel")[0].classList.add("active");
    }
    updateRecordUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Compatibility alias; it MUST preserve annotations and notes.
  function resetAll() { resetLearningProgress(); }

  // Restore saved checklist/progress state and initialize record UI.
  loadRecord();
  updateRecordUI();

  // [REQUIRED] IntersectionObserver for floating bottom bar
  (function() {
    var bottomBar = document.getElementById("bottomBar");
    var endCard = document.getElementById("endCard");
    var shown = false;
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !shown) {
        bottomBar.classList.add("visible");
      }
    }, { threshold: 0.3 });
    observer.observe(endCard);
    bottomBar.addEventListener("click", function(e) {
      if (e.target.tagName === "BUTTON") return;
      bottomBar.classList.remove("visible");
      shown = true;
    });
  })();
  </script>
</body>
</html>
```

### Required CSS Classes Summary

| Class | Purpose |
|-------|---------|
| `.topbar` | Sticky header with breadcrumb, title, reset button |
| `.record-pill` | Small progress indicator in the top bar |
| `.toc` | Fixed sidebar TOC (hidden < 1300px); this is lesson navigation, not a note drawer |
| `.section` | Content card with rounded corners, margin-bottom |
| `.def-box` | Left-bordered definition block (blue accent) |
| `.example-box` | Left-bordered example block (green accent) |
| `.tag-def`, `.tag-eg`, `.tag-warn` | Inline label badges |
| `.accordion`, `.accordion-header`, `.accordion-body` | Collapsible FAQ |
| `.mdp-tuple`, `.mdp-item` | Clickable concept cards |
| `.tabs`, `.tab-btn`, `.tab-panel` | Perspective switcher |
| `.mini-quiz`, `.opt`, `.explain` | Embedded quiz with feedback |
| `.formula` | Centered equation display |
| `.loop-diagram`, `.loop-node`, `.loop-arrow` | Agent-Environment flow |
| `.end-card` | Dashed-border completion card |
| `.checklist`, `.check-item`, `.check-item.done` | Self-assessment checklist |
| `.check-status`, `.check-text`, `.review-link` | Checklist status, clean export text, and same-page review link |
| `.record-panel`, `#recordSummary` | Learning record summary and AI handoff buttons |
| `.next-cmd` | Monospace code block for next command |
| `.bottom-bar` | Floating slide-up bar on scroll-to-end |
| `.term-hint`, `.term-hint .tooltip` | Neutral system-authored term hints; legacy `.annotate` remains validator-compatible only |
| `.lm-toolbar` | Runtime v2 compact mark toolbar with underline/highlight, line style, default color, and custom `#RRGGBB` color controls |
| `.lm-note-icon`, `.lm-note-popover` | Anchored note affordance and click expand/collapse popover |
| `.lm-floating-editor` | Anchored note editor for writing, pasting, copying text/images, note surfaces, and save/delete flows |
| `.lm-notes-manager` | Floating notes manager for search, import/export, orphan rebind, bulk review, and source jumps; never a side drawer |
| `[data-lm-annotatable]`, `[data-lm-scope]`, `[data-lm-ignore]` | Canonical learner-annotation boundaries; runtime UI uses `.lm-*` classes |

---

## Learning Record Export

Every lesson must support both local persistence and AI handoff:

- Save state to `localStorage` on every quiz answer and checklist toggle.
- Restore saved quiz/checklist state when the page is opened again.
- Provide a copy button that copies a detailed Markdown report to clipboard. The report must include every quiz question, selected answer, correct/wrong status, correct answer when available, feedback, retry suggestion, all checked/unchecked self-check items, each item's review target, weak spots, and next command.
- Provide a download button for a portable JSON file.
- Checklist export MUST read `.check-text`, not the entire `.check-item`, so labels like `复习 →` / `Review →` do not pollute the learning record.
- JSON export MUST include `outputMode`, `htmlPlan`, `htmlPlanInstructions`, `coursewareTier`, `coursewareTierInstructions`, `deliveryMode`, `deliveryInstructions`, `videoInstructions`, and optional `annotationSummary`. Full notes and images belong only in the separate `.learnmap` package.
- Chinese mode download name: `学习记录.json`.
- English mode download name: `learning-record.json`.

Required JSON shape:

```json
{
  "schema": "ai-10x-learning-record/v1",
  "topic": "强化学习",
  "lessonId": "lesson-01",
  "lessonTitle": "第01课：全局地图",
  "language": "zh-CN",
  "outputMode": "slow",
  "htmlPlan": "standard-series",
  "htmlPlanInstructions": null,
  "coursewareTier": "standard",
  "coursewareTierInstructions": null,
  "deliveryMode": "interactive",
  "deliveryInstructions": null,
  "videoInstructions": null,
  "mentorLens": "none",
  "annotationSummary": {
    "underlineCount": 4,
    "highlightCount": 1,
    "noteCount": 2,
    "imageCount": 1,
    "questionNoteCount": 1,
    "orphanedCount": 0,
    "updatedAt": "2026-07-17T00:00:00.000Z"
  },
  "updatedAt": "2026-05-29T00:00:00.000Z",
  "completion": {
    "percent": 75,
    "quizAnswered": 4,
    "quizCorrect": 3,
    "checklistChecked": 3,
    "checklistTotal": 4
  },
  "quiz": [
    {
      "id": "mq1",
      "question": "强化学习和监督学习最大的区别是什么？",
      "concept": "RL vs supervised learning",
      "answered": true,
      "correct": false,
      "choiceIndex": 1,
      "choiceText": "监督学习也可以试错",
      "correctAnswer": "RL learns from interaction and delayed reward; supervised learning learns from labeled answers.",
      "feedback": "你混淆了标签监督和奖励反馈。",
      "retrySuggestion": "复习数据来源、反馈形式、单步预测 vs 序列决策。",
      "reviewTarget": "#s2"
    }
  ],
  "checklist": [
    {
      "text": "我能解释 RL 和监督学习的区别",
      "checked": true,
      "reviewTarget": "#s2"
    }
  ],
  "weakSpots": ["mq1"],
  "nextCommand": "继续第02课 MDP详解"
}
```

When resuming a learning session, first reconcile `生成状态.json` / `generation-state.json` with validated final lesson files, then read any downloaded records before updating progress and mistakes. Preserve `coursewareTier`; missing legacy values normalize to `standard`. Resume at the first missing/invalid lesson and never infer completion from empty or high-numbered directories.

---

## Embedded Mastery Check

Every lesson page includes its mastery check inside the same HTML file. Do not generate standalone quiz files by default.

Required behavior:

- 2-4 questions per lesson
- auto-grading with instant feedback (correct / partially-correct / wrong)
- hint button per question where useful
- sample answer or explanation after the learner answers
- a visible `复习 →` / `Review →` button in wrong-answer feedback that jumps to the section teaching the tested concept
- `data-review-target` on every `.mini-quiz`, and the exported JSON must preserve it as `reviewTarget`
- completion state that shows the next-step command

Language: all UI text in the learner's chosen language. Technical terms in English.
