import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const textOf = async (locator) => ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim();

const fixtureSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Goal 10 Fixture">
  <rect id="badge" data-tadpole-name="Badge Rect" x="12" y="18" width="72" height="36" fill="#2563eb" />
  <circle id="dot" data-tadpole-name="Signal Dot" cx="96" cy="36" r="12" fill="#f97316" />
</svg>`;

const warningSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Goal 10 Warning Fixture">
  <rect id="warning-badge" data-tadpole-name="Warning Badge" x="12" y="18" width="72" height="36" fill="#2563eb">
    <animateMotion dur="900ms" path="M0 0 L10 10" />
  </rect>
</svg>`;

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

const boundingBoxFor = async (page, selector) => {
  const box = await page.locator(selector).boundingBox();
  assert(box !== null, `${selector} bounding box missing`);
  return box;
};

const assertPlaybackControlsReachable = async (page, label) => {
  const visibleControlCount = await page.locator("[data-tadpole-playback-controls]").evaluateAll((nodes) =>
    nodes.filter((node) => {
      const text = node.textContent ?? "";
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return (
        text.includes("Play") &&
        text.includes("Stop") &&
        text.includes("Loop") &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }).length,
  );
  assert(visibleControlCount > 0, `${label}: playback controls are not visibly reachable`);
};

const assertShellLayout = async (browser, label, viewport) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser, viewport);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  const shell = page.locator("[data-tadpole-editor-shell]");
  const menubar = page.locator("[data-tadpole-menubar]");
  const stage = page.locator("[data-tadpole-canvas-stage]");
  const status = page.locator("[data-tadpole-document-status]");
  const panelHost = page.locator("[data-tadpole-panel-host]");
  const timeline = page.locator("[data-tadpole-bottom-timeline]");

  assert((await shell.count()) === 1, `${label}: editor shell landmark missing`);
  assert((await menubar.count()) === 1, `${label}: menubar landmark missing`);
  assert((await stage.count()) === 1, `${label}: canvas stage landmark missing`);
  assert((await status.count()) === 1, `${label}: document status landmark missing`);
  assert((await panelHost.count()) === 1, `${label}: panel host landmark missing`);
  assert((await timeline.count()) === 1, `${label}: bottom timeline landmark missing`);

  const stageBox = await boundingBoxFor(page, "[data-tadpole-canvas-stage]");
  const timelineBox = await boundingBoxFor(page, "[data-tadpole-bottom-timeline]");
  const panelHostBox = await boundingBoxFor(page, "[data-tadpole-panel-host]");
  const statusText = await textOf(status);

  assert(stageBox.width >= viewport.width * 0.48, `${label}: canvas stage is not visually dominant`);
  assert(stageBox.height >= viewport.height * 0.32, `${label}: canvas stage is too short`);
  assert(
    timelineBox.y > stageBox.y + stageBox.height * 0.75,
    `${label}: timeline is not positioned below the stage`,
  );
  assert(
    timelineBox.y + timelineBox.height > viewport.height * 0.72,
    `${label}: timeline is not bottom-pinned in the first viewport`,
  );
  assert(panelHostBox.width <= Math.max(72, viewport.width * 0.22), `${label}: panel host crowds the canvas`);
  assert(statusText.includes("Document") && statusText.includes("Tracks"), `${label}: document status lacks badges`);
  assert(statusText.includes("Import: Sample Logo"), `${label}: import status badge missing`);
  assert(statusText.includes("Dirty: no"), `${label}: clean dirty-state badge missing`);
  assert((await page.locator(".panel-svg-source textarea").isVisible()) === false, `${label}: SVG source is visible by default`);
  assert((await page.locator(".export-block pre").first().isVisible()) === false, `${label}: export payload is visible by default`);
  await assertPlaybackControlsReachable(page, label);

  assertCleanBrowser(label, consoleErrors, pageErrors);
  await page.close();
};

const assertWorkflowReachable = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser, { width: 1440, height: 1000 });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await page.getByRole("button", { name: "Open SVG source panel" }).click();
  await page.getByLabel("Raw SVG").fill(fixtureSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #badge");
  let statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Import: Pasted SVG"), "import status did not update after paste import");
  assert(statusText.includes("Dirty: yes"), "dirty status did not update after paste import");

  await page.locator("[data-tadpole-canvas-stage] #badge").click({ force: true });
  await page.getByRole("button", { name: "Create Opacity track for Badge Rect" }).click();
  assert(
    (await page.locator("[data-tadpole-bottom-timeline] .track-card", { hasText: "Badge Rect" }).count()) > 0,
    "imported SVG edit workflow did not create a target-bound track",
  );

  await page.getByRole("button", { name: "Open export panel" }).click();
  assert((await page.locator("[data-tadpole-panel-host] .export-block pre").first().isVisible()) === true, "export panel did not open");

  await page.getByRole("button", { name: "Open SVG source panel" }).click();
  await page.getByLabel("Raw SVG").fill(warningSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #warning-badge");
  statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Import: Pasted SVG"), "import status did not persist for warning import");
  assert(statusText.includes("Warnings: 1"), "warning status did not expose unsupported animation count");

  assertCleanBrowser("workflow", consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await assertShellLayout(browser, "wide", { width: 1440, height: 1000 });
  await assertShellLayout(browser, "narrow", { width: 390, height: 900 });
  await assertWorkflowReachable(browser);
  console.log("editor shell browser smoke passed");
} finally {
  await browser.close();
}
