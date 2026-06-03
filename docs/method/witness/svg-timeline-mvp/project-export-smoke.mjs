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

const runProjectExportSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");

  const payloadText = await page.locator(".export-block pre code").textContent();
  const payload = JSON.parse(payloadText);
  assert(payload.version === "tadpole-project-1", `unexpected project version: ${payload.version}`);
  assert(payload.svg.label === "Sample Logo", `unexpected SVG label: ${payload.svg.label}`);
  assert(payload.svg.source.includes("<svg"), "project export is missing SVG source");
  assert(Array.isArray(payload.svg.targets), "project export target metadata is missing");
  assert(payload.svg.targets.some((target) => target.id === "ui" && target.name === "UI Text"), "UI target metadata missing");
  assert(payload.svg.targets.some((target) => target.id === "q" && target.kind === "group"), "Q target metadata missing");
  assert(payload.timeline.duration === 1200, `unexpected timeline duration: ${payload.timeline.duration}`);
  assert(payload.timeline.currentTime === 0, `unexpected current time: ${payload.timeline.currentTime}`);
  assert(payload.timeline.frameRate === 60, `unexpected frame rate: ${payload.timeline.frameRate}`);
  assert(payload.timeline.tracks.length === 3, `expected sample tracks, got ${payload.timeline.tracks.length}`);

  await page.getByLabel("Project JSON").fill("{ nope");
  await page.getByRole("button", { name: "Validate Project JSON" }).click();
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project import failed: enter valid JSON."),
    "invalid project JSON did not surface a validation error",
  );

  await page.getByRole("button", { name: "Use Current Export" }).click();
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project JSON validated: Sample Logo with 6 targets and 3 tracks."),
    "current export did not validate as an importable project",
  );

  await page.getByLabel("Upload Project").setInputFiles({
    name: "sample.tadpole.json",
    mimeType: "application/json",
    buffer: Buffer.from(payloadText),
  });
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project JSON validated: Sample Logo with 6 targets and 3 tracks."),
    "uploaded project JSON did not validate",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runProjectExportSmoke(browser);
  console.log("project export browser smoke passed");
} finally {
  await browser.close();
}
