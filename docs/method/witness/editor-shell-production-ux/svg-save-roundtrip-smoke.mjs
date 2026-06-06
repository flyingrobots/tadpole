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

const saveRoundtripSvg = `<svg viewBox="0 0 180 100" xmlns="http://www.w3.org/2000/svg" aria-label="SVG Native Save Fixture">
  <rect id="save-box" data-tadpole-name="Save Box" x="16" y="20" width="48" height="28" fill="#0f766e" stroke="#111827" stroke-width="1">
    <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" dur="1000ms" repeatCount="indefinite" />
    <animate attributeName="fill" values="#0f766e;#2563eb;#0f766e" keyTimes="0;0.5;1" dur="1000ms" />
    <animate attributeName="stroke-width" values="1;4;1" keyTimes="0;0.5;1" dur="1000ms" />
  </rect>
  <g id="mover" data-tadpole-name="Mover">
    <circle cx="82" cy="34" r="12" fill="#f97316" />
    <animateTransform attributeName="transform" type="translate" values="0 0;24 12;0 0" keyTimes="0;0.5;1" dur="1000ms" />
  </g>
  <g id="spinner" data-tadpole-name="Spinner">
    <line x1="124" y1="70" x2="154" y2="30" stroke="#111827" stroke-width="4" />
    <animateTransform attributeName="transform" type="scale" values="1;1.5;1" keyTimes="0;0.5;1" dur="1000ms" />
    <animateTransform attributeName="transform" type="rotate" values="0;90;0" keyTimes="0;0.5;1" dur="1000ms" />
  </g>
</svg>`;

const staggeredSaveSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Staggered SVG Native Save Fixture">
  <path id="tadpoleQ" data-tadpole-name="Tadpole Q" d="M20 40 C20 18 54 18 54 40 C54 62 20 62 20 40" fill="none" stroke="#111827" stroke-width="4" stroke-dasharray="120" stroke-dashoffset="120">
    <animate attributeName="stroke-dashoffset" values="120;0" dur="1000ms" begin="250ms" repeatCount="indefinite" />
  </path>
  <circle id="coC" data-tadpole-name="CO C" cx="86" cy="40" r="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="500ms" begin="1s" repeatCount="indefinite" />
  </circle>
</svg>`;

const baseTransformCompanionSaveSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Base Transform Companion Save Fixture">
  <rect id="scaleSave" data-tadpole-name="Scale Save" x="8" y="8" width="28" height="18" fill="#2563eb" transform="translate(40 10) scale(1.25) rotate(15)">
    <animateTransform attributeName="transform" type="scale" values="1.5;2" dur="500ms" begin="1s" />
  </rect>
</svg>`;

// Fixture: intentionally inconsistent to test legacy/corrupted metadata duration
// preservation. Real Tadpole looping exports use begin="0ms"; this fixture keeps
// begin="250ms" with the authored marker to prove duration recovery still wins.
const savedPartialDurationSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Saved Partial Duration Fixture">
  <metadata data-tadpole-native-save-metadata="true">{"version":"tadpole-svg-native-save-1","durationMs":1500,"serializedTrackCount":1}</metadata>
  <path id="partialQ" data-tadpole-name="Partial Q" d="M20 40 C20 18 54 18 54 40 C54 62 20 62 20 40" fill="none" stroke="#111827" stroke-width="4" stroke-dasharray="120" stroke-dashoffset="120">
    <animate attributeName="stroke-dashoffset" values="120;0" keyTimes="0;1" dur="1000ms" begin="250ms" repeatCount="indefinite" data-tadpole-authored="true" data-tadpole-track-id="track-partial" data-tadpole-property="strokeDashoffset" />
  </path>
</svg>`;

const savedEmptyDurationSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Saved Empty Duration Fixture">
  <metadata data-tadpole-native-save-metadata="true">{"version":"tadpole-svg-native-save-1","durationMs":1800,"serializedTrackCount":0}</metadata>
  <rect id="emptyDurationBox" data-tadpole-name="Empty Duration Box" x="12" y="14" width="32" height="20" fill="#2563eb" />
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

const openPanel = async (page, menu, command, selector) => {
  const panel = page.locator(selector);
  if (await panel.isVisible()) {
    return;
  }
  await runCommand(page, menu, command);
  await panel.waitFor({ state: "visible" });
};

const openSourcePanel = async (page) => openPanel(page, "view", "view.showSource", ".panel-svg-source");
const openExportPanel = async (page) => openPanel(page, "view", "view.showExport", ".export-block");

const openSaveDialog = async (page) => {
  await runCommand(page, "file", "file.saveSvg");
  await page.locator('[data-tadpole-dialog="save-svg"]').waitFor({ state: "visible" });
  return page.locator('[data-tadpole-dialog="save-svg"] [data-tadpole-svg-save-state]');
};

const closeActiveDialog = async (page) => {
  await page.locator("[data-tadpole-active-dialog]").getByRole("button", { name: "Close", exact: true }).click();
};

const importViaSourcePanel = async (page, markup, targetSelector) => {
  await openSourcePanel(page);
  await page.locator(".panel-svg-source textarea").fill(markup);
  await page.locator(".panel-svg-source button", { hasText: "Import Paste" }).click();
  await page.waitForSelector(targetSelector);
};

const importViaPasteDialog = async (page, markup, targetSelector) => {
  await runCommand(page, "file", "file.pasteSvg");
  await page.locator('[data-tadpole-dialog="paste-svg"] textarea').fill(markup);
  await page.getByRole("button", { name: "Import Pasted SVG" }).click();
  await page.waitForSelector(targetSelector);
};

const projectPayload = async (page) => {
  await openExportPanel(page);
  const payloadText = await page.locator(".export-block pre code").first().textContent();
  assert(payloadText, "project export payload missing");
  return JSON.parse(payloadText);
};

const findTrack = (payload, targetId, property) => {
  const track = payload.timeline.tracks.find((candidate) => candidate.targetId === targetId && candidate.property === property);
  assert(track, `missing ${targetId}:${property} track`);
  return track;
};

const assertTrack = (payload, targetId, property, expectedValues) => {
  const track = findTrack(payload, targetId, property);
  const signature = track.keyframes.map((keyframe) => `${keyframe.time}:${keyframe.value}`).join("|");
  assert(signature === expectedValues.join("|"), `${targetId}:${property} signature mismatch: ${signature}`);
};

const authoredNodeCount = (svgText) => (svgText.match(/data-tadpole-authored="true"/g) ?? []).length;

const runSvgSaveRoundtripSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  const blockedSave = await openSaveDialog(page);
  assert((await blockedSave.getAttribute("data-tadpole-svg-save-state")) === "blocked", "default sample save should be blocked");
  const blockedWarnings = await textOf(page.locator("[data-tadpole-svg-save-warnings]"));
  assert(blockedWarnings.includes("linear keyframes"), "blocked save did not explain unsupported easing");
  await closeActiveDialog(page);

  await importViaSourcePanel(page, saveRoundtripSvg, "[data-tadpole-canvas-stage] #save-box");
  const readySave = await openSaveDialog(page);
  assert((await readySave.getAttribute("data-tadpole-svg-save-state")) === "ready", "supported SVG save did not become ready");
  assert((await readySave.getAttribute("data-tadpole-svg-save-track-count")) === "7", "serialized track count mismatch");
  assert((await readySave.getAttribute("data-tadpole-svg-save-warning-count")) === "0", "supported SVG save emitted warnings");

  const savedSvg = await page.locator("[data-tadpole-svg-save-output]").textContent();
  assert(savedSvg, "saved SVG output missing");
  assert(savedSvg.trim().startsWith("<svg"), "saved output is not a single SVG root");
  assert(!savedSvg.includes("<script"), "saved SVG reintroduced script content");
  assert(!savedSvg.includes("<html"), "saved SVG emitted an HTML sidecar");
  assert(savedSvg.includes("<animate "), "saved SVG lacks scalar animate nodes");
  assert(savedSvg.includes("<animateTransform "), "saved SVG lacks transform animation nodes");
  assert(savedSvg.includes('data-tadpole-native-save-metadata="true"'), "saved SVG lacks native save metadata");
  assert(authoredNodeCount(savedSvg) === 6, `expected six authored animation nodes, got ${authoredNodeCount(savedSvg)}`);
  await closeActiveDialog(page);

  await importViaPasteDialog(page, savedSvg, "[data-tadpole-canvas-stage] #save-box");
  const payload = await projectPayload(page);
  assert(payload.timeline.duration === 1000, `reopened duration mismatch: ${payload.timeline.duration}`);
  assert(payload.timeline.isLooping === true, "reopened SVG did not preserve indefinite loop state");
  assert(payload.timeline.tracks.length === 7, `reopened track count mismatch: ${payload.timeline.tracks.length}`);
  assertTrack(payload, "save-box", "opacity", ["0:0", "500:1", "1000:0"]);
  assertTrack(payload, "save-box", "fill", ["0:#0f766e", "500:#2563eb", "1000:#0f766e"]);
  assertTrack(payload, "save-box", "strokeWidth", ["0:1", "500:4", "1000:1"]);
  assertTrack(payload, "mover", "x", ["0:0", "500:24", "1000:0"]);
  assertTrack(payload, "mover", "y", ["0:0", "500:12", "1000:0"]);
  assertTrack(payload, "spinner", "scale", ["0:1", "500:1.5", "1000:1"]);
  assertTrack(payload, "spinner", "rotation", ["0:0", "500:90", "1000:0"]);

  const secondReadySave = await openSaveDialog(page);
  assert((await secondReadySave.getAttribute("data-tadpole-svg-save-state")) === "ready", "reopened SVG cannot be saved again");
  const secondSavedSvg = await page.locator("[data-tadpole-svg-save-output]").textContent();
  assert(secondSavedSvg, "second saved SVG output missing");
  assert(authoredNodeCount(secondSavedSvg) === 6, "second save duplicated Tadpole-authored animation nodes");
  await closeActiveDialog(page);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runStaggeredSvgSaveSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await importViaSourcePanel(page, staggeredSaveSvg, "[data-tadpole-canvas-stage] #tadpoleQ");
  const readySave = await openSaveDialog(page);
  assert((await readySave.getAttribute("data-tadpole-svg-save-state")) === "ready", "staggered SVG save should be ready");
  assert((await readySave.getAttribute("data-tadpole-svg-save-track-count")) === "2", "staggered serialized track count mismatch");
  assert((await readySave.getAttribute("data-tadpole-svg-save-warning-count")) === "0", "staggered SVG save emitted warnings");

  const savedSvg = await page.locator("[data-tadpole-svg-save-output]").textContent();
  assert(savedSvg, "staggered saved SVG output missing");
  assert(savedSvg.includes('attributeName="stroke-dashoffset"'), "staggered save lost stroke-dashoffset animation");
  assert(!savedSvg.includes('dur="1000ms"'), "staggered looping save retained a local dashoffset duration");
  assert(!savedSvg.includes('dur="500ms"'), "staggered looping save retained a local opacity duration");
  assert(authoredNodeCount(savedSvg) === 2, `expected two authored staggered animation nodes, got ${authoredNodeCount(savedSvg)}`);
  assert((savedSvg.match(/dur="1500ms"/g) ?? []).length === 2, "staggered looping save did not use the full timeline period");
  await closeActiveDialog(page);

  await importViaPasteDialog(page, savedSvg, "[data-tadpole-canvas-stage] #tadpoleQ");
  const payload = await projectPayload(page);
  assert(payload.timeline.duration === 1500, `staggered reopened duration mismatch: ${payload.timeline.duration}`);
  assertTrack(payload, "tadpoleQ", "strokeDashoffset", ["0:120", "250:120", "1250:0", "1500:0"]);
  assertTrack(payload, "coC", "opacity", ["0:1", "999:1", "1000:0", "1500:1"]);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runNativeMetadataDurationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await importViaPasteDialog(page, savedPartialDurationSvg, "[data-tadpole-canvas-stage] #partialQ");
  const payload = await projectPayload(page);
  assert(payload.timeline.duration === 1500, `native metadata duration was ignored on reopen: ${payload.timeline.duration}`);
  assertTrack(payload, "partialQ", "strokeDashoffset", ["250:120", "1250:0"]);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runBaseTransformCompanionSaveSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await importViaSourcePanel(page, baseTransformCompanionSaveSvg, "[data-tadpole-canvas-stage] #scaleSave");
  const readySave = await openSaveDialog(page);
  assert((await readySave.getAttribute("data-tadpole-svg-save-state")) === "ready", "base transform companion save should be ready");
  assert((await readySave.getAttribute("data-tadpole-svg-save-track-count")) === "4", "base transform companion track count mismatch");
  assert((await readySave.getAttribute("data-tadpole-svg-save-warning-count")) === "0", "base transform companion save emitted warnings");

  const savedSvg = await page.locator("[data-tadpole-svg-save-output]").textContent();
  assert(savedSvg, "base transform companion saved SVG output missing");
  assert(savedSvg.includes('type="translate"'), "base transform companion save lost translate track");
  assert(savedSvg.includes('type="scale"'), "base transform companion save lost scale track");
  assert(savedSvg.includes('type="rotate"'), "base transform companion save lost rotate track");
  await closeActiveDialog(page);

  await importViaPasteDialog(page, savedSvg, "[data-tadpole-canvas-stage] #scaleSave");
  const payload = await projectPayload(page);
  assertTrack(payload, "scaleSave", "x", ["0:40", "1500:40"]);
  assertTrack(payload, "scaleSave", "y", ["0:10", "1500:10"]);
  assertTrack(payload, "scaleSave", "scale", ["0:1.25", "999:1.25", "1000:1.5", "1500:2"]);
  assertTrack(payload, "scaleSave", "rotation", ["0:15", "1500:15"]);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runEmptyNativeMetadataDurationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await importViaPasteDialog(page, savedEmptyDurationSvg, "[data-tadpole-canvas-stage] #emptyDurationBox");
  const payload = await projectPayload(page);
  assert(payload.timeline.duration === 1800, `empty native metadata duration was ignored on reopen: ${payload.timeline.duration}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runSvgSaveRoundtripSmoke(browser);
  await runStaggeredSvgSaveSmoke(browser);
  await runNativeMetadataDurationSmoke(browser);
  await runBaseTransformCompanionSaveSmoke(browser);
  await runEmptyNativeMetadataDurationSmoke(browser);
  console.log("svg save roundtrip browser smoke passed");
} finally {
  await browser.close();
}
