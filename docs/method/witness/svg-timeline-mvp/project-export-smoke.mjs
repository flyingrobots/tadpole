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

const restoredSvg = `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" aria-label="Restored Project">
  <rect id="box" data-tadpole-name="Restored Box" x="20" y="20" width="40" height="28" fill="#0f766e" />
</svg>`;

const projectFrom = (overrides = {}) => ({
  version: "tadpole-project-1",
  svg: {
    label: "Validation Fixture",
    source: restoredSvg,
    targets: [{ id: "box", name: "Restored Box", kind: "shape" }],
  },
  timeline: {
    duration: 900,
    currentTime: 0,
    frameRate: 60,
    isLooping: false,
    snapToFrames: true,
    snapMs: 16,
    gridDensity: 10,
    tracks: [],
  },
  ...overrides,
});

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
const openExportPanel = async (page) => openPanel(page, "view", "view.showExport", ".export-block");
const projectImportSource = (page) => page.locator(".export-block textarea").last();
const projectImportFile = (page) => page.locator(".export-block input[type=file]");
const projectImportButton = (page, name) => page.locator(".export-block button", { hasText: name });

const runProjectExportSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await openExportPanel(page);

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
  assert(payload.timeline.snapMs === 16, `unexpected snap step: ${payload.timeline.snapMs}`);
  assert(payload.timeline.tracks.length === 3, `expected sample tracks, got ${payload.timeline.tracks.length}`);

  await projectImportSource(page).fill("{ nope");
  await projectImportButton(page, "Validate Project JSON").click();
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project import failed: enter valid JSON."),
    "invalid project JSON did not surface a validation error",
  );

  await projectImportButton(page, "Use Current Export").click();
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project JSON validated: Sample Logo with 6 targets and 3 tracks."),
    "current export did not validate as an importable project",
  );

  await projectImportFile(page).setInputFiles({
    name: "sample.tadpole.json",
    mimeType: "application/json",
    buffer: Buffer.from(payloadText),
  });
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project JSON validated: Sample Logo with 6 targets and 3 tracks."),
    "uploaded project JSON did not validate",
  );

  const restoreProject = {
    version: "tadpole-project-1",
    svg: {
      label: "Restored Project",
      source: restoredSvg,
      targets: [{ id: "box", name: "Restored Box", kind: "shape" }],
    },
    timeline: {
      duration: 900,
      currentTime: 400,
      frameRate: 48,
      isLooping: false,
      snapToFrames: true,
      snapMs: 20,
      gridDensity: 10,
      tracks: [
        {
          id: "track-box-x",
          targetId: "box",
          property: "x",
          muted: false,
          keyframes: [
            { id: "box-x-1", time: 0, value: "0", easing: "linear" },
            { id: "box-x-2", time: 400, value: "30", easing: "linear" },
          ],
        },
        {
          id: "track-ghost-opacity",
          targetId: "ghost",
          property: "opacity",
          muted: false,
          keyframes: [{ id: "ghost-opacity-1", time: 0, value: "1", easing: "linear" }],
        },
      ],
    },
  };

  await projectImportSource(page).fill(JSON.stringify(restoreProject, null, 2));
  await projectImportButton(page, "Restore Project").click();
  await page.waitForSelector(".preview-svg-host #box");

  const restorePanelText = await textOf(page.locator(".export-block"));
  assert(
    restorePanelText.includes("Project restored: Restored Project with 1 targets and 1 tracks."),
    "project restore status did not report restored tracks",
  );
  assert(restorePanelText.includes("Missing target IDs: ghost"), "missing target IDs were not visibly reported");
  await openTargetsPanel(page);
  assert((await page.locator(".target-chip", { hasText: "Restored Box" }).count()) === 1, "restored target chip missing");
  assert((await page.locator(".track-card", { hasText: "Restored Box" }).locator("text=Translate X").count()) > 0, "restored box track missing");

  const boxTransform = await page.locator(".preview-svg-host #box").evaluate((element) => element.style.transform);
  assert(boxTransform.includes("translate(30px"), `restored track did not apply at restored current time: ${boxTransform}`);

  await openExportPanel(page);
  await page.waitForFunction(() => document.querySelector(".export-block pre code")?.textContent?.includes("Restored Project"));
  const restoredPayloadText = await page.locator(".export-block pre code").textContent();
  const restoredPayload = JSON.parse(restoredPayloadText);
  assert(restoredPayload.svg.label === "Restored Project", `restored export label mismatch: ${restoredPayload.svg.label}`);
  assert(restoredPayload.timeline.duration === 900, `restored duration mismatch: ${restoredPayload.timeline.duration}`);
  assert(restoredPayload.timeline.currentTime === 400, `restored current time mismatch: ${restoredPayload.timeline.currentTime}`);
  assert(restoredPayload.timeline.frameRate === 48, `restored frame rate mismatch: ${restoredPayload.timeline.frameRate}`);
  assert(restoredPayload.timeline.snapMs === 20, `restored snap step mismatch: ${restoredPayload.timeline.snapMs}`);
  assert(restoredPayload.timeline.tracks.length === 1, `expected missing-target track to be skipped, got ${restoredPayload.timeline.tracks.length}`);
  assert(restoredPayload.timeline.tracks[0].targetId === "box", `restored track target mismatch: ${restoredPayload.timeline.tracks[0].targetId}`);

  await openSourcePanel(page);
  await page.getByRole("button", { name: "Reset Sample" }).click();
  await openExportPanel(page);
  const resetPanelText = await textOf(page.locator(".export-block"));
  assert(!resetPanelText.includes("Missing target IDs: ghost"), "missing-target warning persisted after sample SVG reset");

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runProjectTrustBoundarySmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await openExportPanel(page);

  const unsafeProject = projectFrom({
    timeline: {
      ...projectFrom().timeline,
      tracks: [
        {
          id: "track-box-fill",
          targetId: "box",
          property: "fill",
          muted: false,
          keyframes: [{ id: "box-fill-1", time: 0, value: "url(https://example.com/paint.svg#p)", easing: "linear" }],
        },
      ],
    },
  });

  await projectImportSource(page).fill(JSON.stringify(unsafeProject, null, 2));
  await projectImportButton(page, "Validate Project JSON").click();
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project import failed: timeline tracks are invalid."),
    "unsafe imported project keyframe value was not rejected",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runProjectTrackIdValidationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await openExportPanel(page);

  const duplicateTrackProject = projectFrom({
    timeline: {
      ...projectFrom().timeline,
      tracks: [
        {
          id: "track-box-motion",
          targetId: "box",
          property: "x",
          muted: false,
          keyframes: [{ id: "box-x-1", time: 0, value: "0", easing: "linear" }],
        },
        {
          id: "track-box-motion",
          targetId: "box",
          property: "y",
          muted: false,
          keyframes: [{ id: "box-y-1", time: 0, value: "0", easing: "linear" }],
        },
      ],
    },
  });

  await projectImportSource(page).fill(JSON.stringify(duplicateTrackProject, null, 2));
  await projectImportButton(page, "Validate Project JSON").click();
  assert(
    (await textOf(page.locator(".export-block"))).includes("Project import failed: timeline tracks are invalid."),
    "duplicate imported project track IDs were not rejected",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runProjectTargetMetadataValidationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await openExportPanel(page);

  const mismatchedTargetProject = projectFrom({
    svg: {
      label: "Mismatched Target Fixture",
      source: restoredSvg,
      targets: [{ id: "ghost", name: "Ghost Target", kind: "shape" }],
    },
  });

  await projectImportSource(page).fill(JSON.stringify(mismatchedTargetProject, null, 2));
  await projectImportButton(page, "Validate Project JSON").click();
  assert(
    (await textOf(page.locator(".export-block"))).includes(
      "Project import failed: target metadata does not match SVG source.",
    ),
    "mismatched project target metadata was not rejected",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runProjectExportSmoke(browser);
  await runProjectTrustBoundarySmoke(browser);
  await runProjectTrackIdValidationSmoke(browser);
  await runProjectTargetMetadataValidationSmoke(browser);
  console.log("project export browser smoke passed");
} finally {
  await browser.close();
}
