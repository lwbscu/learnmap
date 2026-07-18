import fs from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const demoCenterPath = "/docs/demos.html";
const coursePath = "/docs/demos/ai-agent-frameworks.html";
const promoPath = "/docs/promo-video.html";
const homePath = "/docs/index.html";
const posterCarouselSelector = "video[data-learnmap-poster-carousel]";
const homeHeroCarousel = ".hero-card video[data-learnmap-poster-carousel]";
const demoHeroCarousel = ".hero-media video[data-learnmap-poster-carousel]";
const walkthroughCarousel = "video.demo-video[data-learnmap-poster-carousel]";
const promoCarousel = "video.primary-video[data-learnmap-poster-carousel]";

const posterCarouselPages = [
  { path: homePath, selector: homeHeroCarousel, declaredCount: 4, englishCount: 4, chineseCount: 0 },
  { path: homePath, selector: walkthroughCarousel, declaredCount: 4, englishCount: 4, chineseCount: 0 },
  { path: promoPath, selector: promoCarousel, declaredCount: 4, englishCount: 4, chineseCount: 0 },
  { path: demoCenterPath, selector: demoHeroCarousel, declaredCount: 8, englishCount: 4, chineseCount: 4 },
  { path: demoCenterPath, selector: walkthroughCarousel, declaredCount: 8, englishCount: 4, chineseCount: 4 },
  { path: `${demoCenterPath}?lang=zh`, selector: demoHeroCarousel, declaredCount: 8, englishCount: 4, chineseCount: 4 },
  { path: `${demoCenterPath}?lang=en`, selector: demoHeroCarousel, declaredCount: 8, englishCount: 4, chineseCount: 4 }
];

const posterRotationPages = [
  { path: homePath, selector: homeHeroCarousel, intervalCount: 2, rotationCount: 4, language: "en" },
  { path: promoPath, selector: promoCarousel, intervalCount: 1, rotationCount: 4, language: "en" },
  { path: demoCenterPath, selector: demoHeroCarousel, intervalCount: 2, rotationCount: 8, language: "both" },
  { path: `${demoCenterPath}?lang=zh`, selector: demoHeroCarousel, intervalCount: 2, rotationCount: 4, language: "cn" },
  { path: `${demoCenterPath}?lang=en`, selector: demoHeroCarousel, intervalCount: 2, rotationCount: 4, language: "en" }
];

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

async function installManualIntervalClock(page) {
  await page.addInitScript(() => {
    const intervals = new Map();
    let nextIntervalId = 100_000;

    window.setInterval = (callback, delay, ...args) => {
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, { callback, delay, args });
      return id;
    };
    window.clearInterval = (id) => {
      intervals.delete(id);
    };
    window.__learnmapAdvanceIntervals = () => {
      let invoked = 0;
      for (const [id, interval] of Array.from(intervals.entries())) {
        if (!intervals.has(id)) continue;
        interval.callback.apply(window, interval.args);
        invoked += 1;
      }
      return invoked;
    };
    window.__learnmapActiveIntervalCount = () => intervals.size;
  });
}

async function declaredPosterUrls(page, selector = posterCarouselSelector) {
  const video = page.locator(selector);
  await expect(video).toHaveCount(1);
  const raw = await video.getAttribute("data-learnmap-poster-carousel");
  expect(raw).not.toBeNull();
  return raw.split(",").map((url) => url.trim()).filter(Boolean);
}

async function advancePosterCarousel(page, selector = posterCarouselSelector) {
  const invoked = await page.evaluate(() => window.__learnmapAdvanceIntervals());
  const poster = await page.locator(selector).evaluate((video) => video.poster);
  return { invoked, poster };
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
  test("README variants publish the matching language poster set and route", async () => {
    const variants = [
      { file: "README.md", language: "en" },
      { file: "README.en.md", language: "en" },
      { file: "README.cn.md", language: "zh" }
    ];

    for (const variant of variants) {
      const source = await fs.readFile(variant.file, "utf8");
      const assetLanguage = variant.language === "zh" ? "cn" : "en";
      const expectedPoster = `docs/assets/learnmap-poster-${assetLanguage}-carousel.webp`;
      const declaredPosters = source.match(/docs\/assets\/learnmap-poster-(?:en|cn)-carousel\.webp/g) || [];
      expect(source, variant.file).not.toContain("learnmap-cover.png");
      expect(declaredPosters, variant.file).toEqual([expectedPoster]);
      expect(source).toContain(`https://lwbscu.github.io/learnmap/demos.html?lang=${variant.language}`);
      expect(source.match(/\[2026\/07\]/g)).toHaveLength(1);
    }
  });

  test("homepage publishes exactly one July update on desktop and mobile", async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(homePath);
      expect(response?.ok()).toBe(true);

      const homePoster = page.locator(".hero-card video[data-learnmap-poster-carousel]");
      await expect(homePoster).toBeVisible();
      await expect(homePoster).not.toHaveAttribute("poster", /learnmap-cover\.png/);
      await expect(homePoster).toHaveAttribute("data-learnmap-poster-carousel", /learnmap-poster-en-courseware\.png/);

      const newLink = page.getByRole("link", { name: "What's New", exact: true });
      await expect(newLink).toBeVisible();
      await newLink.click();
      await expect(page).toHaveURL(/#new$/);

      const section = page.locator("#new");
      await expect(section.getByRole("heading", { name: "What's New", level: 2 })).toBeVisible();
      const julyDates = section.locator(".news-item > time").filter({ hasText: /^\[2026\/07\]$/ });
      await expect(julyDates).toHaveCount(1);
      const julyItem = julyDates.locator("xpath=..");
      await expect(julyItem).toContainText("LearnMap runtime v2");
      await expect(julyItem).toContainText("Demo Center");
      await expect(julyItem).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    }
  });

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
          contentType: /\.mp4$/i.test(anchor.href)
            ? /^(video\/mp4|application\/octet-stream)\b/
            : /\.webp$/i.test(anchor.href) ? /^image\/webp\b/ : /^image\/png\b/,
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

  test("poster carousel lists are local fixture PNG resources with the expected language coverage", async ({ page, request }) => {
    const fixtureOrigin = new URL(homePath, "http://127.0.0.1:4173").origin;
    const resourceUrls = new Set();

    for (const carouselPage of posterCarouselPages) {
      const response = await page.goto(carouselPage.path);
      expect(response?.ok(), carouselPage.path).toBe(true);

      const declaredUrls = await declaredPosterUrls(page, carouselPage.selector);
      expect(declaredUrls, carouselPage.path).toHaveLength(carouselPage.declaredCount);
      expect(new Set(declaredUrls).size, carouselPage.path).toBe(carouselPage.declaredCount);
      expect(declaredUrls.filter((url) => url.includes("-en-")), carouselPage.path).toHaveLength(carouselPage.englishCount);
      expect(declaredUrls.filter((url) => url.includes("-cn-")), carouselPage.path).toHaveLength(carouselPage.chineseCount);

      for (const declaredUrl of declaredUrls) {
        expect(declaredUrl, carouselPage.path).not.toMatch(/^(?:file:|[a-z]:[\\/]|\\\\)/i);
        expect(declaredUrl, carouselPage.path).not.toContain("learnmap-cover.png");
        const resolvedUrl = new URL(declaredUrl, page.url());
        expect(resolvedUrl.protocol, declaredUrl).toBe("http:");
        expect(resolvedUrl.origin, declaredUrl).toBe(fixtureOrigin);
        expect(resolvedUrl.pathname, declaredUrl).toMatch(/^\/docs\/assets\/learnmap-poster-(?:en|cn)-.+\.png$/);
        resourceUrls.add(resolvedUrl.href);
      }
    }

    expect(resourceUrls.size).toBe(8);
    for (const resourceUrl of resourceUrls) {
      const response = await request.get(resourceUrl);
      expect(response.status(), resourceUrl).toBe(200);
      expect(response.headers()["content-type"], resourceUrl).toMatch(/^image\/png\b/);
    }
  });

  test("Demo Center hero uses the poster carousel instead of the legacy cover", async ({ page }) => {
    await gotoDemoCenter(page);

    const heroVideo = page.locator(".hero-media video[data-learnmap-poster-carousel]");
    await expect(heroVideo).toBeVisible();
    const heroPoster = await heroVideo.evaluate((video) => {
      return {
        poster: video.getAttribute("poster") || "",
        resolvedPoster: video.poster,
        carousel: video.getAttribute("data-learnmap-poster-carousel") || ""
      };
    });

    expect(heroPoster.poster).not.toContain("learnmap-cover.png");
    expect(heroPoster.resolvedPoster).not.toContain("learnmap-cover.png");
    expect(heroPoster.carousel).toMatch(/learnmap-poster-(?:en|cn)-.+\.png/);
    expect(heroPoster.carousel).not.toContain("learnmap-cover.png");
    await expect(page.locator(".hero-media")).not.toContainText("learnmap-cover.png");
  });

  test("poster carousels rotate through the configured language set before playback", async ({ page }) => {
    await installManualIntervalClock(page);

    for (const carouselPage of posterRotationPages) {
      await page.goto(carouselPage.path);
      const declaredUrls = (await declaredPosterUrls(page, carouselPage.selector)).map((url) => new URL(url, page.url()).href);
      await expect.poll(() => page.evaluate(() => window.__learnmapActiveIntervalCount())).toBe(carouselPage.intervalCount);
      const initialPoster = await page.locator(carouselPage.selector).evaluate((video) => video.poster);

      const observedPosters = [];
      for (let index = 0; index <= carouselPage.rotationCount; index += 1) {
        const { invoked, poster } = await advancePosterCarousel(page, carouselPage.selector);
        expect(invoked, carouselPage.path).toBe(carouselPage.intervalCount);
        observedPosters.push(poster);
      }

      const firstCycle = observedPosters.slice(0, carouselPage.rotationCount);
      expect(observedPosters[0], carouselPage.path).not.toBe(initialPoster);
      expect(new Set(firstCycle).size, carouselPage.path).toBe(carouselPage.rotationCount);
      expect(observedPosters.at(-1), carouselPage.path).toBe(observedPosters[0]);
      expect(firstCycle.every((url) => declaredUrls.includes(url)), carouselPage.path).toBe(true);

      const englishPosters = firstCycle.filter((url) => url.includes("-en-"));
      const chinesePosters = firstCycle.filter((url) => url.includes("-cn-"));
      if (carouselPage.language === "en") {
        expect(englishPosters, carouselPage.path).toHaveLength(carouselPage.rotationCount);
        expect(chinesePosters, carouselPage.path).toHaveLength(0);
      } else if (carouselPage.language === "cn") {
        expect(chinesePosters, carouselPage.path).toHaveLength(carouselPage.rotationCount);
        expect(englishPosters, carouselPage.path).toHaveLength(0);
      } else {
        expect(englishPosters, carouselPage.path).toHaveLength(4);
        expect(chinesePosters, carouselPage.path).toHaveLength(4);
      }
    }
  });

  test("poster carousel stops on play", async ({ page }) => {
    await installManualIntervalClock(page);
    await page.goto(demoCenterPath);
    await declaredPosterUrls(page, walkthroughCarousel);
    await expect.poll(() => page.evaluate(() => window.__learnmapActiveIntervalCount())).toBe(2);

    const firstAdvance = await advancePosterCarousel(page, walkthroughCarousel);
    expect(firstAdvance.invoked).toBe(2);
    await page.locator(walkthroughCarousel).dispatchEvent("play");
    await expect.poll(() => page.evaluate(() => window.__learnmapActiveIntervalCount())).toBe(1);

    const afterPlay = await advancePosterCarousel(page, walkthroughCarousel);
    expect(afterPlay.invoked).toBe(1);
    expect(afterPlay.poster).toBe(firstAdvance.poster);
  });

  test("poster carousel does not auto-rotate with reduced motion", async ({ page }) => {
    await installManualIntervalClock(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(demoCenterPath);
    await declaredPosterUrls(page, demoHeroCarousel);

    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__learnmapActiveIntervalCount())).toBe(0);
    const initialPoster = await page.locator(demoHeroCarousel).evaluate((video) => video.poster);
    const afterAdvance = await advancePosterCarousel(page, demoHeroCarousel);
    expect(afterAdvance.invoked).toBe(0);
    expect(afterAdvance.poster).toBe(initialPoster);
  });

  test("poster controls support manual navigation and persistent pause", async ({ page }) => {
    await installManualIntervalClock(page);
    await page.goto(`${demoCenterPath}?lang=en`);

    const video = page.locator(demoHeroCarousel);
    const host = video.locator("xpath=..");
    const previous = host.getByTestId("poster-previous");
    const pause = host.getByTestId("poster-pause");
    const next = host.getByTestId("poster-next");
    await expect(previous).toBeVisible();
    await expect(pause).toBeVisible();
    await expect(next).toBeVisible();

    const firstPoster = await video.evaluate((element) => element.poster);
    await next.click();
    const secondPoster = await video.evaluate((element) => element.poster);
    expect(secondPoster).not.toBe(firstPoster);
    await expect(pause).toHaveAttribute("aria-label", "Resume poster rotation");
    await expect.poll(() => page.evaluate(() => window.__learnmapActiveIntervalCount())).toBe(1);

    await previous.click();
    await expect.poll(() => video.evaluate((element) => element.poster)).toBe(firstPoster);
  });

  test("README poster sets are decodable animated WebP assets", async ({ page }) => {
    await page.goto(homePath);
    await page.setContent(`
      <main style="display:grid;grid-template-columns:1fr 1fr;width:640px">
        <img data-testid="poster-webp-en" src="/docs/assets/learnmap-poster-en-carousel.webp" width="320" height="180" alt="">
        <img data-testid="poster-webp-cn" src="/docs/assets/learnmap-poster-cn-carousel.webp" width="320" height="180" alt="">
      </main>
    `);

    const posters = [page.getByTestId("poster-webp-en"), page.getByTestId("poster-webp-cn")];
    for (const poster of posters) {
      await expect.poll(() => poster.evaluate((image) => ({
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight
      }))).toEqual({ complete: true, width: 1280, height: 720 });
    }

    const before = await Promise.all(posters.map((poster) => poster.screenshot()));
    await page.waitForTimeout(4300);
    const after = await Promise.all(posters.map((poster) => poster.screenshot()));
    expect(after[0].equals(before[0])).toBe(false);
    expect(after[1].equals(before[1])).toBe(false);
  });

  test("product walkthrough decodes and advances in the browser", async ({ page }) => {
    await gotoDemoCenter(page, "#walkthrough");
    const playback = await page.getByTestId("demo-video").evaluate(async (video) => {
      video.muted = true;
      video.currentTime = 0;
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise((resolve, reject) => {
          video.addEventListener("loadedmetadata", resolve, { once: true });
          video.addEventListener("error", () => reject(video.error), { once: true });
        });
      }
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 750));
      video.pause();
      return {
        currentTime: video.currentTime,
        duration: video.duration,
        readyState: video.readyState
      };
    });

    expect(playback.duration).toBeGreaterThan(74.9);
    expect(playback.duration).toBeLessThan(75.1);
    expect(playback.readyState).toBeGreaterThanOrEqual(2);
    expect(playback.currentTime).toBeGreaterThan(0.2);
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
    await expect(page).toHaveTitle(/Product Walkthrough/);
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
