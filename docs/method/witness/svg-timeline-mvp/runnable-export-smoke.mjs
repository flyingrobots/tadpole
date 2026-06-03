import { createRequire } from "node:module";

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

const runRunnableExportSmoke = async (browser) => {
  const editor = await createPage(browser);
  await editor.page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await editor.page.waitForSelector(".preview-svg-host svg");

  const runnableHtml = await editor.page.locator("[data-tadpole-runnable-output]").textContent();
  assert(runnableHtml?.includes("tadpole-runnable-html-1"), "runnable export version missing");
  assert(runnableHtml.includes("data-tadpole-stage"), "runnable export stage missing");
  assert(runnableHtml.includes("track-ui-x"), "runnable export track payload missing");
  assert(!runnableHtml.includes("tadpole-project-1"), "runnable export leaked project JSON version");

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

const browser = await chromium.launch({ headless: true });
try {
  await runRunnableExportSmoke(browser);
  console.log("runnable export browser smoke passed");
} finally {
  await browser.close();
}
