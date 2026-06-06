import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createPage = async (browser, viewport) => {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { page, consoleErrors, pageErrors };
};

const assertCleanBrowser = (label, consoleErrors, pageErrors) => {
  assert(pageErrors.length === 0, `${label} page errors: ${pageErrors.join("\n")}`);
  assert(consoleErrors.length === 0, `${label} console errors: ${consoleErrors.join("\n")}`);
};

const runCommand = async (page, menu, command) => {
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).click();
  await page.locator(`[data-tadpole-menu="${menu}"]`).waitFor({ state: "visible" });
  await page.locator(`[data-tadpole-command="${command}"]`).click();
};

const boundingBoxFor = async (page, selector) => {
  const box = await page.locator(selector).boundingBox();
  assert(box !== null, `${selector} bounding box missing`);
  return box;
};

const assertDockFacts = async (page, expectedRegion, expectedTimelineState) => {
  const layout = page.locator("[data-tadpole-dock-layout]");
  const host = page.locator("[data-tadpole-panel-host]");
  const timeline = page.locator("[data-tadpole-bottom-timeline]");
  assert((await layout.count()) === 1, "dock layout fact missing");
  assert((await layout.getAttribute("data-tadpole-center-pane")) === "canvas", "center dock pane is not canvas");
  assert((await layout.getAttribute("data-tadpole-bottom-dock")) === "timeline", "bottom dock pane is not timeline");
  assert((await layout.getAttribute("data-tadpole-active-dock-region")) === expectedRegion, "active dock region mismatch");
  assert((await host.getAttribute("data-tadpole-dock-region")) === expectedRegion, "panel host dock region mismatch");
  assert(
    (await timeline.getAttribute("data-tadpole-timeline-tracks-visible")) === expectedTimelineState,
    "timeline track visibility fact mismatch",
  );
};

const assertWideDockingShell = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser, { width: 1440, height: 1000 });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await assertDockFacts(page, "left", "true");
  assert((await page.locator("[data-tadpole-dock-panel-left]").count()) === 0, "closed panel exposes dock controls");

  await runCommand(page, "view", "view.showLayers");
  await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="layers"]').waitFor({ state: "visible" });
  await assertDockFacts(page, "left", "true");
  assert(
    (await page.locator("[data-tadpole-dock-layout]").getAttribute("data-tadpole-left-dock-open")) === "true",
    "left dock open fact missing",
  );

  const leftHostBox = await boundingBoxFor(page, "[data-tadpole-panel-host]");
  const leftStageBox = await boundingBoxFor(page, "[data-tadpole-canvas-stage]");
  assert(leftHostBox.x < leftStageBox.x, "left dock panel is not left of the canvas");

  await page.locator("[data-tadpole-dock-panel-right]").click();
  await assertDockFacts(page, "right", "true");
  assert(
    (await page.locator("[data-tadpole-dock-layout]").getAttribute("data-tadpole-right-dock-open")) === "true",
    "right dock open fact missing",
  );
  const rightHostBox = await boundingBoxFor(page, "[data-tadpole-panel-host]");
  const rightStageBox = await boundingBoxFor(page, "[data-tadpole-canvas-stage]");
  assert(rightHostBox.x > rightStageBox.x, "right dock panel is not right of the canvas");

  await page.locator(".layout-resizer").focus();
  await page.keyboard.press("ArrowLeft");
  const widerRightHostBox = await boundingBoxFor(page, "[data-tadpole-panel-host]");
  assert(widerRightHostBox.width > rightHostBox.width, "right dock resize did not grow when nudged left");
  await page.keyboard.press("ArrowRight");
  const restoredRightHostBox = await boundingBoxFor(page, "[data-tadpole-panel-host]");
  assert(restoredRightHostBox.width < widerRightHostBox.width, "right dock resize did not shrink when nudged right");

  const trackScroll = page.locator("[data-tadpole-bottom-timeline] .track-scroll");
  assert((await trackScroll.isVisible()) === true, "timeline tracks are not visible by default");
  await page.locator("[data-tadpole-timeline-track-visibility]").click();
  await assertDockFacts(page, "right", "false");
  assert((await trackScroll.isVisible()) === false, "timeline track stack did not collapse");
  await page.locator("[data-tadpole-timeline-track-visibility]").click();
  await assertDockFacts(page, "right", "true");
  assert((await trackScroll.isVisible()) === true, "timeline track stack did not expand");

  assertCleanBrowser("wide docking shell", consoleErrors, pageErrors);
  await page.close();
};

const assertNarrowDockingSheet = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser, { width: 390, height: 900 });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");
  await assertDockFacts(page, "left", "true");
  assert((await page.locator("[data-tadpole-dock-layout]").getAttribute("data-tadpole-dock-mode")) === "docked", "closed narrow shell is not docked");

  await runCommand(page, "view", "view.showInspector");
  await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="inspector"]').waitFor({ state: "visible" });
  await assertDockFacts(page, "left", "true");
  assert((await page.locator("[data-tadpole-dock-layout]").getAttribute("data-tadpole-dock-mode")) === "sheet", "narrow open panel is not a sheet");
  await page.locator("[data-tadpole-dock-panel-right]").click();
  await assertDockFacts(page, "right", "true");

  assertCleanBrowser("narrow docking sheet", consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await assertWideDockingShell(browser);
  await assertNarrowDockingSheet(browser);
  console.log("docking shell browser smoke passed");
} finally {
  await browser.close();
}
