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

const stackedAnimationSvg = `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" aria-label="Timeline Stack Fixture">
  <rect id="stack-box" data-tadpole-name="Stack Box" x="16" y="20" width="48" height="28" fill="#0f766e">
    <animate attributeName="opacity" values="0;1;0.25" keyTimes="0;0.5;1" dur="900ms" />
    <animate attributeName="fill" values="#0f766e;#2563eb" dur="900ms" />
    <animateTransform attributeName="transform" type="translate" values="0 0;24 12" dur="900ms" />
  </rect>
  <g id="stack-needle" data-tadpole-name="Stack Needle">
    <line x1="94" y1="58" x2="130" y2="28" stroke="#111827" stroke-width="4" />
    <animateTransform attributeName="transform" type="rotate" values="0;30" dur="900ms" />
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

const importSvgMarkup = async (page, markup) => {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");
  await runCommand(page, "view", "view.showSource");
  await page.getByLabel("Raw SVG").fill(markup);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #stack-box");
};

const projectPayload = async (page) => {
  await runCommand(page, "view", "view.showExport");
  const payloadText = await page.locator("[data-tadpole-panel-host] .export-block pre").first().textContent();
  assert(payloadText !== null, "project export payload is missing");
  return JSON.parse(payloadText);
};

const runTimelineStackSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, stackedAnimationSvg);

  const stackBoxRow = page.locator('[data-tadpole-target-row="stack-box"]');
  const needleRow = page.locator('[data-tadpole-target-row="stack-needle"]');
  assert((await stackBoxRow.count()) === 1, "stack-box target row missing");
  assert((await needleRow.count()) === 1, "stack-needle target row missing");
  assert((await stackBoxRow.getAttribute("data-tadpole-target-row-expanded")) === "true", "stack-box row is not expanded by default");
  assert((await stackBoxRow.getAttribute("data-tadpole-target-row-track-count")) === "4", "stack-box track count mismatch");
  assert((await stackBoxRow.getAttribute("data-tadpole-target-row-key-count")) === "9", "stack-box keyframe count mismatch");

  const expectedProperties = ["opacity", "fill", "x", "y"];
  for (const property of expectedProperties) {
    const row = page.locator(
      `[data-tadpole-property-row][data-tadpole-target-id="stack-box"][data-tadpole-property="${property}"]`,
    );
    assert((await row.count()) === 1, `${property} property row missing`);
    const rowText = await textOf(row);
    assert(rowText.includes(`Stack Box • ${property}`), `${property} row does not expose target and property label`);
    assert((await row.locator(".keyframe-marker").count()) >= 2, `${property} row lacks keyframe markers`);
    assert((await row.locator("[data-tadpole-animation-span]").count()) >= 1, `${property} row lacks animation spans`);
  }

  const opacityRow = page.locator(
    '[data-tadpole-property-row][data-tadpole-target-id="stack-box"][data-tadpole-property="opacity"]',
  );
  assert((await opacityRow.getAttribute("data-tadpole-key-count")) === "3", "opacity row keyframe fact mismatch");
  assert((await opacityRow.locator("[data-tadpole-animation-span]").count()) === 2, "opacity row span count mismatch");

  const toggle = stackBoxRow.locator('[data-tadpole-target-stack-toggle="stack-box"]');
  await toggle.click();
  assert((await stackBoxRow.getAttribute("data-tadpole-target-row-expanded")) === "false", "stack-box row did not collapse");
  assert(
    (await page.locator('[data-tadpole-property-row][data-tadpole-target-id="stack-box"]').count()) === 0,
    "collapsed stack-box row still renders property rows",
  );
  assert(
    (await stackBoxRow.locator("[data-tadpole-summary-keyframe]").count()) === 9,
    "collapsed stack-box row does not expose summary key dots",
  );

  await page.getByRole("button", { name: "Show timeline tracks" }).click();
  assert((await stackBoxRow.getAttribute("data-tadpole-target-row-expanded")) === "true", "show timeline tracks did not expand");
  assert(
    (await page.locator('[data-tadpole-property-row][data-tadpole-target-id="stack-box"]').count()) === 4,
    "expanded stack-box row does not render property rows",
  );

  await page.locator(".timeline-controls .inline-label", { hasText: "Current" }).locator("input").fill("450");
  const expandedOpacityRow = page
    .locator('[data-tadpole-property-row][data-tadpole-target-id="stack-box"][data-tadpole-property="opacity"]')
    .first();
  await expandedOpacityRow.locator(".track-keys li").nth(1).locator("input").nth(1).fill("0.4");

  const payload = await projectPayload(page);
  const exportedOpacityTrack = payload.timeline.tracks.find(
    (track) => track.targetId === "stack-box" && track.property === "opacity",
  );
  assert(exportedOpacityTrack, "edited opacity track missing from project export");
  assert(
    exportedOpacityTrack.keyframes.some((keyframe) => keyframe.time === 450 && keyframe.value === "0.4"),
    "edited opacity keyframe did not persist after stack rendering",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runTimelineStackSmoke(browser);
  console.log("timeline stacks browser smoke passed");
} finally {
  await browser.close();
}
