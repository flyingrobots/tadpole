import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

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

const assertCleanBrowser = (label, consoleErrors, pageErrors) => {
  assert(pageErrors.length === 0, `${label} page errors: ${pageErrors.join("\n")}`);
  assert(consoleErrors.length === 0, `${label} console errors: ${consoleErrors.join("\n")}`);
};

const openExportPanel = async (page) => {
  const panel = page.locator(".export-block");
  if (await panel.isVisible()) {
    return;
  }
  await page.getByRole("button", { name: "Open export panel" }).click();
  await panel.waitFor({ state: "visible" });
};

const runRunnableExportSmoke = async (browser) => {
  const editor = await createPage(browser);
  await editor.page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await editor.page.waitForSelector(".preview-svg-host svg");
  await openExportPanel(editor.page);

  const runnableHtml = await editor.page.locator("[data-tadpole-runnable-output]").textContent();
  assert(runnableHtml?.includes("tadpole-runnable-html-1"), "runnable export version missing");
  assert(runnableHtml.includes("data-tadpole-stage"), "runnable export stage missing");
  assert(runnableHtml.includes("track-ui-x"), "runnable export track payload missing");
  assert(!runnableHtml.includes("tadpole-project-1"), "runnable export leaked project JSON version");

  await editor.page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__tadpoleCopiedRunnableHtml = value;
        },
      },
    });
  });
  await editor.page.getByRole("button", { name: "Copy Runnable HTML" }).click();
  await editor.page.waitForFunction(() => window.__tadpoleCopiedRunnableHtml?.includes("tadpole-runnable-html-1"));
  assert(
    (await editor.page.getByText("Runnable HTML copied").count()) === 1,
    "copy runnable HTML status did not update",
  );

  const downloadPromise = editor.page.waitForEvent("download");
  await editor.page.getByRole("button", { name: "Download Runnable HTML" }).click();
  const download = await downloadPromise;
  assert(download.suggestedFilename() === "sample-logo.html", `unexpected runnable filename: ${download.suggestedFilename()}`);
  const downloadPath = await download.path();
  assert(downloadPath, "runnable download path missing");
  const downloadedHtml = await readFile(downloadPath, "utf8");
  assert(downloadedHtml.includes("tadpole-runnable-html-1"), "downloaded runnable HTML version missing");
  assert(downloadedHtml.includes("track-ui-x"), "downloaded runnable HTML track payload missing");
  assert(
    (await editor.page.getByText("Downloaded sample-logo.html").count()) === 1,
    "download runnable HTML status did not update",
  );

  const artifact = await createPage(browser);
  await artifact.page.setContent(runnableHtml, { waitUntil: "domcontentloaded" });
  await artifact.page.waitForSelector("[data-tadpole-stage] svg #ui");
  await artifact.page.waitForFunction(
    () => document.documentElement.dataset.tadpoleRuntimeVersion === "tadpole-runnable-html-1",
  );

  const observedTransform = await artifact.page
    .locator("[data-tadpole-stage] svg #ui")
    .evaluate((element) => element.style.transform);
  assert(observedTransform.includes("translate("), `unexpected exported transform: ${observedTransform}`);

  await artifact.page.waitForFunction((previousTransform) => {
    const ui = document.querySelector("[data-tadpole-stage] svg #ui");
    return ui instanceof SVGElement && ui.style.transform !== previousTransform;
  }, observedTransform);

  const animatedTransform = await artifact.page
    .locator("[data-tadpole-stage] svg #ui")
    .evaluate((element) => element.style.transform);
  assert(animatedTransform !== observedTransform, "runnable artifact did not animate #ui transform");

  const qOpacity = await artifact.page
    .locator("[data-tadpole-stage] svg #q")
    .evaluate((element) => Number(element.style.opacity));
  assert(Number.isFinite(qOpacity) && qOpacity > 0, `runnable artifact did not animate #q opacity: ${qOpacity}`);

  assertCleanBrowser("editor", editor.consoleErrors, editor.pageErrors);
  assertCleanBrowser("artifact", artifact.consoleErrors, artifact.pageErrors);
  await artifact.page.close();
  await editor.page.close();
};

const runRunnableExportTrustBoundarySmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");

  const unsafePaintValue = "url(https://example.com/paint.svg#p)";
  const coFillTrack = page.locator(".track-card", { hasText: "CO Text • fill" }).first();
  const firstKeyframe = coFillTrack.locator("li", { hasText: "track-co-fill-1" });
  await firstKeyframe.locator(".inline-label", { hasText: "value" }).locator("input").fill(unsafePaintValue);
  await page.waitForTimeout(50);
  await openExportPanel(page);

  const runnableHtml = await page.locator("[data-tadpole-runnable-output]").textContent();
  assert(runnableHtml && !runnableHtml.includes(unsafePaintValue), "unsafe CSS URL leaked into runnable export");

  assertCleanBrowser("trust-boundary", consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runRunnableExportSmoke(browser);
  await runRunnableExportTrustBoundarySmoke(browser);
  console.log("runnable export browser smoke passed");
} finally {
  await browser.close();
}
