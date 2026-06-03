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

const rocketSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Rocket Test">
  <g id="rocket" data-tadpole-name="Rocket Body">
    <path id="flame" data-tadpole-name="Flame" d="M14 36 L2 28 L2 44 Z" fill="#ff8a00" />
    <rect id="body" data-tadpole-name="Body Shell" x="16" y="24" width="66" height="24" rx="12" fill="#3b82f6" />
    <circle id="window" data-tadpole-name="Window" cx="62" cy="36" r="7" fill="#f8fafc" />
  </g>
</svg>`;

const badgeSvg = `<svg viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg" aria-label="Badge Test">
  <rect id="badge" data-tadpole-name="Badge Rect" x="12" y="14" width="136" height="52" rx="10" fill="#0f766e" />
  <text id="label" x="52" y="49" font-size="24" fill="#ffffff">Go</text>
</svg>`;

const emptyTargetSvg = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-label="No IDs">
  <rect x="10" y="10" width="60" height="60" fill="#64748b" />
</svg>`;

const slowSvg = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <rect id="slow" data-tadpole-name="Slow File" x="8" y="8" width="64" height="64" />
</svg>`;

const fastSvg = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle id="fast" data-tadpole-name="Fast Paste" cx="40" cy="40" r="28" />
</svg>`;

const smilSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <a id="link" href="#safe" data-tadpole-name="Link Target">
    <rect id="safe" data-tadpole-name="Safe Rect" x="12" y="12" width="60" height="40" fill="#0f766e" />
  </a>
  <set href="#link" attributeName="href" to="javascript:alert(1)" begin="0s" />
  <animate href="#safe" attributeName="x" values="12;48;12" dur="1s" repeatCount="indefinite" />
  <animateTransform href="#safe" attributeName="transform" type="rotate" from="0" to="360" dur="1s" />
  <animateMotion href="#safe" path="M 0 0 L 10 10" dur="1s" />
  <mpath href="javascript:alert(2)" />
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

const runImportWorkflowSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");

  assert((await page.locator(".target-chip", { hasText: "UI Text" }).count()) === 1, "sample target UI Text is missing");
  assert((await page.locator(".target-chip", { hasText: "Tadpole Q" }).count()) === 1, "sample target Tadpole Q is missing");

  await page.getByLabel("Raw SVG").fill(rocketSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector(".preview-svg-host #flame");
  assert((await page.locator(".target-chip", { hasText: "Flame" }).count()) === 1, "pasted SVG target Flame is missing");
  assert((await page.locator(".target-chip", { hasText: "Window" }).count()) === 1, "pasted SVG target Window is missing");
  assert((await textOf(page.locator(".panel-svg-source"))).includes("0 tracks kept, 3 removed"), "paste import did not reconcile sample tracks");
  assert((await page.getByText("No timeline tracks match the current SVG target set.").count()) === 1, "empty track state missing after incompatible SVG import");

  await page.locator(".preview-svg-host #flame").click({ force: true });
  const flameIsSelected = await page.locator(".preview-svg-host #flame").evaluate((element) => element.classList.contains("tadpole-selected-target"));
  assert(flameIsSelected, "preview click did not select imported #flame target");
  const selectedTargetId = await page.locator(".selected-target-summary input").nth(1).inputValue();
  assert(selectedTargetId === "flame", `selected target inspector expected flame, got ${selectedTargetId}`);
  await page.getByRole("button", { name: "Create Track" }).click();
  assert((await page.locator(".track-card", { hasText: "Flame" }).locator("text=fill").count()) > 0, "new track was not created for imported Flame target");

  await page.getByLabel("Upload").setInputFiles({
    name: "badge.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(badgeSvg),
  });
  await page.waitForSelector(".preview-svg-host #badge");
  assert((await page.locator(".target-chip", { hasText: "Badge Rect" }).count()) === 1, "uploaded SVG target Badge Rect is missing");
  assert((await page.locator(".target-chip", { hasText: "Go Text" }).count()) === 1, "uploaded SVG text target label is missing");
  assert((await textOf(page.locator(".panel-svg-source"))).includes("0 tracks kept, 1 removed"), "file upload did not reconcile the imported Flame track");

  await page.getByLabel("Raw SVG").fill(emptyTargetSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector(".preview-svg-host svg");
  assert((await page.getByText("No ID-bearing SVG targets detected.").count()) === 1, "zero-target SVG did not show target empty state");
  assert(await page.getByRole("button", { name: "Create Track" }).isDisabled(), "create track should be disabled with zero targets");

  await page.getByLabel("Raw SVG").fill("<svg><g></svg>");
  await page.getByRole("button", { name: "Import Paste" }).click();
  assert((await page.getByText("Import failed: enter valid SVG markup.").count()) === 1, "invalid SVG paste did not surface an import error");
  assert((await page.getByText("No ID-bearing SVG targets detected.").count()) === 1, "invalid paste should not replace the last valid SVG");

  await page.getByRole("button", { name: "Reset Sample" }).click();
  await page.waitForSelector(".preview-svg-host #ui");
  assert((await page.locator(".target-chip", { hasText: "UI Text" }).count()) === 1, "reset sample did not restore UI Text target");
  assert((await page.locator(".track-card").count()) === 3, "reset sample did not restore sample tracks");
  assert((await textOf(page.locator(".panel-svg-source"))).includes("Restored 3 sample tracks"), "reset sample status did not report restored tracks");

  await page.locator(".timeline-controls .inline-label", { hasText: "Current" }).locator("input").fill("520");
  await page.waitForTimeout(50);
  const uiTransform = await page.locator(".preview-svg-host #ui").evaluate((element) => element.style.transform);
  assert(uiTransform.includes("translate(8px"), `sample timeline transform did not apply after reset: ${uiTransform}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runAsyncImportRaceSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.addInitScript(() => {
    const originalText = File.prototype.text;
    File.prototype.text = function patchedText() {
      if (this.name === "slow.svg") {
        return new Promise((resolve, reject) => {
          window.__releaseSlowFileRead = async () => {
            try {
              resolve(await originalText.call(this));
            } catch (error) {
              reject(error);
            }
          };
        });
      }
      return originalText.call(this);
    };
  });

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await page.getByLabel("Upload").setInputFiles({
    name: "slow.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(slowSvg),
  });
  await page.waitForFunction(() => typeof window.__releaseSlowFileRead === "function");
  await page.getByLabel("Raw SVG").fill(fastSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector(".preview-svg-host #fast");
  await page.evaluate(() => window.__releaseSlowFileRead());
  await page.waitForTimeout(150);

  const fastStillLoaded = await page.locator(".preview-svg-host #fast").count();
  const staleSlowLoaded = await page.locator(".preview-svg-host #slow").count();
  assert(fastStillLoaded === 1 && staleSlowLoaded === 0, `expected later paste to remain active, got fast=${fastStillLoaded} slow=${staleSlowLoaded}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runSmilSanitizerSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await page.getByLabel("Raw SVG").fill(smilSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector(".preview-svg-host #safe");

  const smilCount = await page
    .locator(
      [
        ".preview-svg-host set",
        ".preview-svg-host animate",
        ".preview-svg-host animateColor",
        ".preview-svg-host animateMotion",
        ".preview-svg-host animateTransform",
        ".preview-svg-host discard",
        ".preview-svg-host mpath",
      ].join(", "),
    )
    .count();
  assert(smilCount === 0, `expected SVG animation nodes to be stripped, found ${smilCount}`);

  const linkHref = await page.locator(".preview-svg-host #link").evaluate((element) => element.getAttribute("href"));
  assert(linkHref === "#safe", `expected local href to remain safe, got ${linkHref}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runResetNormalizationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await page.locator(".timeline-controls .inline-label", { hasText: "Duration" }).locator("input").fill("250");
  await page.getByRole("button", { name: "Reset Sample" }).click();
  const payloadText = await page.locator(".export-block pre code").textContent();
  const payload = JSON.parse(payloadText);
  const invalid = payload.tracks.flatMap((track) =>
    track.keyframes
      .filter((keyframe) => keyframe.time > payload.duration)
      .map((keyframe) => `${track.id}:${keyframe.id}:${keyframe.time}`),
  );
  assert(invalid.length === 0, `found out-of-range keyframes after reset: ${invalid.join(", ")}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runImportWorkflowSmoke(browser);
  await runAsyncImportRaceSmoke(browser);
  await runSmilSanitizerSmoke(browser);
  await runResetNormalizationSmoke(browser);
  console.log("import gate browser smoke passed");
} finally {
  await browser.close();
}
