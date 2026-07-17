import fs from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const demoCenterPath = "/docs/demos.html";
const coursePath = "/docs/demos/ai-agent-frameworks.html";
const promoPath = "/docs/promo-video.html";

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.getAttribute("data-testid"),
          id: element.id,
          className: `${element.className || ""}`.slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth
        };
      });
    return {
      clientWidth: viewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders
    };
  });

  expect(overflow.documentScrollWidth, JSON.stringify(overflow, null, 2)).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(overflow.bodyScrollWidth, JSON.stringify(overflow, null, 2)).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(overflow.offenders, JSON.stringify(overflow, null, 2)).toEqual([]);
}

async function gotoDemoCenter(page, hash = "") {
  await page.goto(`${demoCenterPath}${hash}`);
  await expect(page.getByTestId("demo-nav")).toBeVisible();
}

function watchUnexpectedRequests(page, allowedOrigin = "http://127.0.0.1:4173") {
  const unexpected = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^(about:blank|blob:|data:)/.test(url)) return;
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      unexpected.push(url);
      return;
    }
    if (origin !== allowedOrigin) unexpected.push(url);
  });
  return unexpected;
}

async function contentFrame(page) {
  const handle = await page.getByTestId("courseware-frame").elementHandle();
  const frame = await handle.contentFrame();
  expect(frame).not.toBeNull();
  await expect.poll(() => frame.evaluate(() => window.LearnMapAnnotations?.version)).toBe("2");
  return frame;
}

async function selectCourseText(page, selector = "#s1 p", start = 0, end = 12) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  return page.evaluate(({ selector: target, start: rangeStart, end: rangeEnd }) => {
    const element = document.querySelector(target);
    if (!element) throw new Error(`Missing selector: ${target}`);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const node = walker.nextNode();
    if (!node) throw new Error(`Missing text node: ${target}`);
    const range = document.createRange();
    range.setStart(node, rangeStart);
    range.setEnd(node, Math.min(rangeEnd, node.textContent.length));
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const rect = range.getBoundingClientRect();
    element.dispatchEvent(new MouseEvent("mouseup", {
      bubbles: true,
      clientX: Math.round(rect.left + Math.min(24, Math.max(1, rect.width / 2))),
      clientY: Math.round(rect.top + Math.min(10, Math.max(1, rect.height / 2)))
    }));
    document.dispatchEvent(new Event("selectionchange", { bubbles: true }));
    return range.toString();
  }, { selector, start, end });
}

test.describe("Demo Center HTTP surface", () => {
  test("desktop navigation anchors resolve and the page has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoDemoCenter(page);

    const nav = page.getByTestId("demo-nav").locator(".nav-links");
    await expect(nav.locator('a[href="#overview"]')).toBeVisible();
    await expect(nav.locator('a[href="#walkthrough"]')).toBeVisible();
    await expect(nav.locator('a[href="#courseware"]')).toBeVisible();

    for (const hash of ["#overview", "#walkthrough", "#courseware"]) {
      await nav.locator(`a[href="${hash}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${hash}$`));
      await expect(page.locator(hash)).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
    const desktopWrapBox = await page.locator("#courseware-frame-wrap").boundingBox();
    const desktopInnerHeight = await page.evaluate(() => innerHeight);
    expect(desktopWrapBox).not.toBeNull();
    expect(Math.round(desktopWrapBox.height)).toBeGreaterThanOrEqual(560);
    expect(Math.round(desktopWrapBox.height)).toBeLessThanOrEqual(780);
    expect(Math.abs(desktopWrapBox.height - desktopInnerHeight * 0.76)).toBeLessThanOrEqual(18);
  });

  test("mobile layout at 390x844 keeps the same anchors and no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDemoCenter(page);
    const navLinks = page.getByTestId("demo-nav").locator(".nav-links");
    await expect(navLinks.locator('a[href="#overview"], a[href="#walkthrough"], a[href="#courseware"]')).toHaveCount(3);
    await navLinks.locator('a[href="#courseware"]').click();
    await expect(page).toHaveURL(/#courseware$/);
    await expectNoHorizontalOverflow(page);

    const wrapBox = await page.locator("#courseware-frame-wrap").boundingBox();
    const frameBox = await page.getByTestId("courseware-frame").boundingBox();
    expect(wrapBox).not.toBeNull();
    expect(frameBox).not.toBeNull();
    expect(Math.round(wrapBox.height)).toBe(844);
    expect(wrapBox.x).toBeGreaterThanOrEqual(0);
    expect(wrapBox.x + wrapBox.width).toBeLessThanOrEqual(390);
    expect(frameBox.width).toBeLessThanOrEqual(wrapBox.width);
    expect(frameBox.width).toBeGreaterThanOrEqual(wrapBox.width - 4);
    expect(frameBox.height).toBeLessThanOrEqual(wrapBox.height);
    expect(frameBox.height).toBeGreaterThanOrEqual(wrapBox.height - 4);
  });

  test("existing video and poster resources respond over the fixture server", async ({ page, request }) => {
    await gotoDemoCenter(page, "#walkthrough");
    const resources = await page.evaluate(() => {
      const video = document.querySelector("[data-testid='demo-video']");
      return [
        { url: video?.poster, contentType: /^image\/png\b/, minBytes: 1000 },
        ...Array.from(video?.querySelectorAll("source") || []).map((source) => ({
          url: source.src,
          contentType: /^(video\/mp4|application\/octet-stream)\b/,
          minBytes: 1000
        })),
        ...Array.from(document.querySelectorAll(".side-panel a[href]")).map((anchor) => ({
          url: anchor.href,
          contentType: /\.mp4$/i.test(anchor.href) ? /^(video\/mp4|application\/octet-stream)\b/ : /^image\/png\b/,
          minBytes: 1000
        }))
      ].filter((item, index, all) => item.url && all.findIndex((candidate) => candidate.url === item.url) === index);
    });

    expect(resources.length).toBeGreaterThanOrEqual(4);
    for (const resource of resources) {
      const response = await request.get(resource.url);
      expect(response.status(), resource.url).toBe(200);
      expect(response.headers()["content-type"], resource.url).toMatch(resource.contentType);
      expect((await response.body()).length, resource.url).toBeGreaterThan(resource.minBytes);
    }
  });

  test("same-origin iframe exposes runtime v2 and public lesson metadata", async ({ page }) => {
    await gotoDemoCenter(page, "#courseware");
    const iframeAttributes = await page.getByTestId("courseware-frame").evaluate((iframe) => ({
      sandbox: iframe.getAttribute("sandbox"),
      allow: iframe.getAttribute("allow") || "",
      allowFullscreen: iframe.hasAttribute("allowfullscreen")
    }));
    expect(iframeAttributes.sandbox).toBeNull();
    expect(iframeAttributes.allow).toContain("clipboard-write");
    expect(iframeAttributes.allow).toContain("fullscreen");
    expect(iframeAttributes.allowFullscreen).toBe(true);

    const frame = await contentFrame(page);
    const runtime = await frame.evaluate(() => ({
      sameOrigin: location.origin === parent.location.origin,
      runtimeVersion: window.LearnMapAnnotations?.version,
      meta: {
        courseId: window.LESSON_META?.courseId,
        lessonId: window.LESSON_META?.lessonId,
        annotationEnabled: window.LESSON_META?.annotationEnabled,
        annotationRuntimeVersion: window.LESSON_META?.annotationRuntimeVersion,
        contentFingerprint: window.LESSON_META?.contentFingerprint
      }
    }));

    expect(runtime).toMatchObject({
      sameOrigin: true,
      runtimeVersion: "2",
      meta: {
        courseId: "ai-agent-frameworks-comparison",
        lessonId: "overview",
        annotationEnabled: true,
        annotationRuntimeVersion: "2"
      }
    });
    expect(runtime.meta.contentFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  test("Demo Center shell has no serious or critical axe violations", async ({ page }) => {
    await gotoDemoCenter(page, "#courseware");
    await contentFrame(page);
    const results = await new AxeBuilder({ page }).exclude('[data-testid="courseware-frame"]').analyze();
    const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
  });

  test("standalone course route and legacy promo route remain available", async ({ page }) => {
    await page.goto(coursePath);
    await expect.poll(() => page.evaluate(() => window.LearnMapAnnotations?.version)).toBe("2");
    await expect(page.locator("[data-lm-annotatable]")).toBeVisible();

    await page.goto(promoPath);
    await expect(page).toHaveTitle(/Usage Walkthrough Video/);
    await expect(page.locator("video").first()).toBeVisible();
    await expect(page.locator('a[href="./index.html"]').first()).toBeVisible();
  });

  test("course annotations can highlight text and expand-collapse a note badge", async ({ page }) => {
    await page.goto(coursePath);
    await expect.poll(() => page.evaluate(() => window.LearnMapAnnotations?.version)).toBe("2");

    await selectCourseText(page, "#s1 p", 0, 12);
    await expect(page.getByTestId("lm-toolbar")).toBeVisible();
    await page.getByTestId("lm-mark-highlight").click();
    await expect.poll(() => page.evaluate(() => window.LearnMapAnnotations.getSummary())).toMatchObject({ highlightCount: 1 });

    await selectCourseText(page, "#s1 p", 13, 26);
    await page.getByTestId("lm-add-note").click();
    await expect(page.getByTestId("lm-note-editor-popover")).toBeVisible();
    await page.getByTestId("lm-note-editor").fill("Demo Center note badge smoke");
    await page.getByTestId("lm-note-save").click();
    await expect.poll(() => page.evaluate(() => window.LearnMapAnnotations.getSummary())).toMatchObject({ noteCount: 1 });

    const hit = page.getByTestId("lm-note-hit").first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(hit).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("lm-note-popover")).toBeVisible();
    await hit.click();
    await expect(hit).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("lm-note-popover")).toBeHidden();
  });

  test("course quiz completion and learning record download smoke", async ({ page }) => {
    await page.goto(coursePath);
    await expect.poll(() => page.evaluate(() => !!window.buildLearningRecord)).toBe(true);

    const correctAnswers = [
      ["#mq1", 1],
      ["#mq2", 1],
      ["#mq3", 2],
      ["#mq4", 1]
    ];
    for (const [quizId, answerIndex] of correctAnswers) {
      await page.locator(`${quizId} .opt`).nth(answerIndex).click();
    }

    const record = await page.evaluate(() => window.buildLearningRecord());
    expect(record.schema).toBe("ai-10x-learning-record/v1");
    expect(record.completion.quizAnswered).toBe(4);
    expect(record.completion.quizCorrect).toBe(4);
    expect(record.weakSpots).toEqual([]);
    await expect(page.locator("#recordSummary")).toContainText(/4\/4/);

    await page.locator("#endCard").scrollIntoViewIfNeeded();
    const downloadEvent = page.waitForEvent("download");
    await page.locator(".record-panel button").nth(1).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
    const downloaded = JSON.parse(await fs.readFile(await download.path(), "utf8"));
    expect(downloaded).toMatchObject({
      schema: "ai-10x-learning-record/v1",
      lessonId: "overview",
      completion: { quizAnswered: 4, quizCorrect: 4 }
    });
  });

  test("demo interactions do not auto-request outside the current localhost origin", async ({ page }) => {
    const unexpectedRequests = watchUnexpectedRequests(page);
    await gotoDemoCenter(page);
    await page.getByTestId("demo-nav").locator(".nav-links a[href='#walkthrough']").click();
    await page.getByTestId("demo-nav").locator(".nav-links a[href='#courseware']").click();
    await contentFrame(page);
    await page.waitForTimeout(500);
    expect(unexpectedRequests).toEqual([]);
  });

  test("fullscreen action uses a deterministic requestFullscreen stub", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Element.prototype, "requestFullscreen", {
        configurable: true,
        value() {
          window.__demoFullscreenRequests = (window.__demoFullscreenRequests || 0) + 1;
          return Promise.resolve();
        }
      });
    });

    await gotoDemoCenter(page, "#courseware");
    await page.getByTestId("courseware-fullscreen").click();
    await expect.poll(() => page.evaluate(() => window.__demoFullscreenRequests || 0)).toBe(1);
    await expect(page.locator("#courseware-status")).toContainText(/Fullscreen enabled|已进入全屏/);
  });
});
