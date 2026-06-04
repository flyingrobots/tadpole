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

const noTargetSvg = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-label="No Editable Targets">
  <rect x="10" y="10" width="60" height="60" fill="#64748b" />
</svg>`;

const soloTargetSvg = `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" aria-label="Solo Target">
  <rect id="solo" data-tadpole-name="Solo Target" x="16" y="18" width="68" height="42" fill="#0f766e" />
</svg>`;

const titledTargetSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Titled Target">
  <rect id="shape-01" x="20" y="18" width="80" height="44" fill="#2563eb">
    <title>Primary Badge</title>
  </rect>
</svg>`;

const createPage = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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

const assertCleanBrowser = (consoleErrors, pageErrors) => {
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join("\n")}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join("\n")}`);
};

const openPanel = async (page, menu, command, selector) => {
  const panel = page.locator(selector);
  if (await panel.isVisible()) {
    return;
  }
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).click();
  await page.locator(`[data-tadpole-menu="${menu}"]`).waitFor({ state: "visible" });
  await page.locator(`[data-tadpole-command="${command}"]`).click();
  await panel.waitFor({ state: "visible" });
};

const openSourcePanel = async (page) => openPanel(page, "view", "view.showSource", ".panel-svg-source");
const openTargetsPanel = async (page) => openPanel(page, "view", "view.showTargets", ".panel-target-library");

const importRawSvg = async (page, svg) => {
  await openSourcePanel(page);
  await page.getByLabel("Raw SVG").fill(svg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector(".preview-svg-host svg");
};

const runEmptyStateSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");

  await openSourcePanel(page);
  await page.getByLabel("Raw SVG").fill("");
  assert(
    (await textOf(page.locator(".panel-svg-source"))).includes(
      "Raw SVG is empty. Paste SVG markup or upload an SVG file before importing.",
    ),
    "missing-SVG empty state did not explain the next action",
  );

  await importRawSvg(page, noTargetSvg);
  await openTargetsPanel(page);
  const targetLibraryText = await textOf(page.locator(".panel-target-library"));
  assert(
    targetLibraryText.includes("No editable SVG targets found. Add id attributes to SVG elements before animating them."),
    "missing-target empty state did not explain the next action",
  );
  assert(
    (await textOf(page.locator(".track-list"))).includes("Import an SVG with editable targets before creating timeline tracks."),
    "track list did not show the missing-target empty state",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runSelectedTargetQuickActionSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");

  await importRawSvg(page, soloTargetSvg);
  await page.waitForSelector(".preview-svg-host #solo");
  await page.locator(".preview-svg-host #solo").click({ force: true });

  const previewText = await textOf(page.locator(".panel-preview"));
  assert(previewText.includes("Selected target: Solo Target #solo"), "preview selected-target chip was missing");

  const inspectorText = await textOf(page.locator(".inspector-panel"));
  assert(
    inspectorText.includes("Solo Target has no tracks yet. Create a track to animate this selected target."),
    "selected-target no-track empty state was missing",
  );

  await page.getByRole("button", { name: "Create Opacity track for Solo Target" }).click();
  assert(
    (await page.locator(".track-card", { hasText: "Solo Target" }).locator("text=Opacity").count()) > 0,
    "quick action did not create an opacity track for the selected target",
  );

  await page.getByRole("button", { name: "Clear Tracks" }).click();
  assert((await page.locator(".track-card").count()) === 0, "clear tracks did not remove the selected-target track");
  assert(
    (await textOf(page.locator(".track-list"))).includes("No timeline tracks yet. Select a target, then create a track to start animating."),
    "clear tracks did not restore the timeline empty state",
  );
  assert(
    (await textOf(page.locator(".inspector-panel"))).includes(
      "Solo Target has no tracks yet. Create a track to animate this selected target.",
    ),
    "clear tracks did not restore the selected-target no-track state",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runTargetLabelSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");

  await importRawSvg(page, titledTargetSvg);
  await page.waitForSelector(".preview-svg-host #shape-01");
  await openTargetsPanel(page);
  assert(
    (await page.locator(".target-chip", { hasText: "Primary Badge" }).count()) === 1,
    "target label did not use SVG title metadata",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runEmptyStateSmoke(browser);
  await runSelectedTargetQuickActionSmoke(browser);
  await runTargetLabelSmoke(browser);
  console.log("rough UX hardening browser smoke passed");
} finally {
  await browser.close();
}
