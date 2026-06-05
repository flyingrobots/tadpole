import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const staticSvg = `<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg" aria-label="Static Starter Fixture">
  <g id="heroLogo" data-tadpole-name="Hero Logo">
    <rect id="badgePanel" data-tadpole-name="Badge Panel" x="20" y="28" width="90" height="52" rx="10" fill="#2563eb" />
    <circle id="accentDot" data-tadpole-name="Accent Dot" cx="142" cy="54" r="14" fill="#f97316" />
    <path id="arrowAccent" data-tadpole-name="Arrow Accent" d="M158 56 L190 56 L180 46 M190 56 L180 66" fill="none" stroke="#111827" stroke-width="5" />
    <text id="headline" x="24" y="104" font-size="16" fill="#111827">Tadpole</text>
  </g>
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

const runCommand = async (page, menu, command) => {
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).click();
  await page.locator(`[data-tadpole-menu="${menu}"]`).waitFor({ state: "visible" });
  await page.locator(`[data-tadpole-command="${command}"]`).click();
};

const projectPayload = async (page) => {
  await runCommand(page, "view", "view.showExport");
  const payloadText = await page.locator("[data-tadpole-panel-host] .export-block pre").first().textContent();
  assert(payloadText !== null, "project export payload is missing");
  return JSON.parse(payloadText);
};

const runStaticStarterTimelineSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await runCommand(page, "view", "view.showSource");
  await page.getByLabel("Raw SVG").fill(staticSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #heroLogo");

  const suggestions = page.locator("[data-tadpole-starter-timeline-suggestions]");
  await suggestions.waitFor({ state: "visible" });
  assert((await suggestions.getAttribute("data-tadpole-starter-origin")) === "heuristic", "starter suggestions are not marked heuristic");
  assert((await suggestions.getAttribute("data-tadpole-starter-suggestion-count")) === "4", "starter suggestion count mismatch");
  assert(
    (await suggestions.getAttribute("data-tadpole-selected-starter-suggestion-count")) === "4",
    "starter selected suggestion count mismatch",
  );

  const logoSuggestion = page.locator('[data-tadpole-starter-suggestion-id][data-tadpole-starter-target-id="heroLogo"]');
  assert((await logoSuggestion.getAttribute("data-tadpole-starter-property")) === "opacity", "hero logo suggestion is not opacity");
  const logoReason = await logoSuggestion.getAttribute("data-tadpole-starter-reason");
  assert(logoReason !== null && logoReason.includes("label match"), "hero logo suggestion reason is not inspectable");

  await page
    .locator('[data-tadpole-starter-suggestion-id][data-tadpole-starter-target-id="headline"]')
    .locator("[data-tadpole-starter-suggestion-toggle]")
    .uncheck();
  assert(
    (await suggestions.getAttribute("data-tadpole-selected-starter-suggestion-count")) === "3",
    "starter deselect did not update selected count",
  );

  await logoSuggestion.locator('[data-tadpole-starter-keyframe-value="0"]').fill("0.25");
  await page.locator("[data-tadpole-apply-starter-timeline]").click();
  await page.waitForSelector("[data-tadpole-bottom-timeline] .track-card");
  assert((await page.locator("[data-tadpole-starter-timeline-suggestions]").count()) === 0, "starter suggestions still visible after apply");

  const payload = await projectPayload(page);
  const tracks = payload.timeline.tracks;
  assert(Array.isArray(tracks), "project export tracks are not an array");
  assert(tracks.length === 3, `expected 3 applied starter tracks, got ${tracks.length}`);
  assert(!tracks.some((track) => track.targetId === "headline"), "dismissed headline suggestion was applied");

  const logoTrack = tracks.find((track) => track.targetId === "heroLogo" && track.property === "opacity");
  assert(Boolean(logoTrack), "hero logo opacity starter track missing");
  assert(
    logoTrack.keyframes.some((keyframe) => keyframe.time === 0 && keyframe.value === "0.25"),
    "edited starter keyframe value did not persist into project export",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runStaticStarterTimelineSmoke(browser);
  console.log("static starter timeline browser smoke passed");
} finally {
  await browser.close();
}
