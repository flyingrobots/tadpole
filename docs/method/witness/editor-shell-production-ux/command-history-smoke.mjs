import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";
const shortcutModifier = process.platform === "darwin" ? "Meta" : "Control";
const undoShortcut = `${shortcutModifier}+Z`;
const redoShortcut = `${shortcutModifier}+Shift+Z`;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const commandHistorySvg = `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" aria-label="Command History Fixture">
  <rect id="command-box" data-tadpole-name="Command Box" x="24" y="22" width="64" height="38" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="992ms" />
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

const blurActiveElement = async (page) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
};

const importSvgMarkup = async (page, markup) => {
  await openPanel(page, "view", "view.showSource", ".panel-svg-source");
  await page.getByLabel("Raw SVG").fill(markup);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #command-box");
};

const projectPayload = async (page) => {
  await openPanel(page, "view", "view.showExport", ".export-block");
  const payloadText = await page.locator("[data-tadpole-panel-host] .export-block pre").first().textContent();
  assert(payloadText !== null, "project export payload is missing");
  return JSON.parse(payloadText);
};

const opacityTracks = (payload) =>
  payload.timeline.tracks.filter((track) => track.targetId === "command-box" && track.property === "opacity");

const opacityTrack = (payload) => {
  const tracks = opacityTracks(payload);
  assert(tracks.length >= 1, "opacity track missing");
  return tracks[0];
};

const historyFacts = async (page) => {
  const history = page.locator("[data-tadpole-command-history]");
  return {
    canUndo: await history.getAttribute("data-tadpole-can-undo"),
    canRedo: await history.getAttribute("data-tadpole-can-redo"),
    undoCount: await history.getAttribute("data-tadpole-undo-count"),
    redoCount: await history.getAttribute("data-tadpole-redo-count"),
    lastCommand: await history.getAttribute("data-tadpole-last-command"),
  };
};

const assertHistory = async (page, undoCount, redoCount, canUndo, canRedo, lastCommand) => {
  const facts = await historyFacts(page);
  assert(facts.undoCount === String(undoCount), `undo count mismatch: ${facts.undoCount}`);
  assert(facts.redoCount === String(redoCount), `redo count mismatch: ${facts.redoCount}`);
  assert(facts.canUndo === (canUndo ? "true" : "false"), `canUndo mismatch: ${facts.canUndo}`);
  assert(facts.canRedo === (canRedo ? "true" : "false"), `canRedo mismatch: ${facts.canRedo}`);
  assert(facts.lastCommand === lastCommand, `last command mismatch: ${facts.lastCommand}`);
};

const setCurrentTime = async (page, time) => {
  await page.locator(".timeline-controls .inline-label", { hasText: "Current" }).locator("input").fill(String(time));
};

const runCommandHistorySmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");
  await importSvgMarkup(page, commandHistorySvg);
  await assertHistory(page, 0, 0, false, false, "");

  const opacityRow = page.locator(
    '[data-tadpole-property-row][data-tadpole-target-id="command-box"][data-tadpole-property="opacity"]',
  );
  await opacityRow.waitFor({ state: "visible" });
  await setCurrentTime(page, 496);
  await opacityRow.getByRole("button", { name: "+ Drop keyframe at 496ms" }).click();
  await assertHistory(page, 1, 0, true, false, "keyframe.set");
  let payload = await projectPayload(page);
  assert(opacityTrack(payload).keyframes.some((keyframe) => keyframe.time === 496), "added keyframe missing from export");

  await runCommand(page, "edit", "edit.undo");
  await assertHistory(page, 0, 1, false, true, "keyframe.set");
  payload = await projectPayload(page);
  assert(!opacityTrack(payload).keyframes.some((keyframe) => keyframe.time === 496), "undo left added keyframe in export");

  await blurActiveElement(page);
  await page.keyboard.press(redoShortcut);
  await assertHistory(page, 1, 0, true, false, "keyframe.set");
  payload = await projectPayload(page);
  assert(opacityTrack(payload).keyframes.some((keyframe) => keyframe.time === 496), "redo did not restore added keyframe");

  const addedKeyframeRow = opacityRow.locator(".track-keys li").nth(1);
  await addedKeyframeRow.locator("input").nth(1).fill("0.4");
  await assertHistory(page, 2, 0, true, false, "keyframe.set");
  payload = await projectPayload(page);
  assert(
    opacityTrack(payload).keyframes.some((keyframe) => keyframe.time === 496 && keyframe.value === "0.4"),
    "edited keyframe value missing from export",
  );

  await blurActiveElement(page);
  await page.keyboard.press(undoShortcut);
  await assertHistory(page, 1, 1, true, true, "keyframe.set");
  payload = await projectPayload(page);
  assert(
    !opacityTrack(payload).keyframes.some((keyframe) => keyframe.time === 496 && keyframe.value === "0.4"),
    "keyboard undo left edited value in export",
  );

  await blurActiveElement(page);
  await page.keyboard.press(redoShortcut);
  await assertHistory(page, 2, 0, true, false, "keyframe.set");
  payload = await projectPayload(page);
  assert(
    opacityTrack(payload).keyframes.some((keyframe) => keyframe.time === 496 && keyframe.value === "0.4"),
    "keyboard redo did not restore edited value",
  );

  await opacityRow.locator(".track-meta").getByRole("button", { name: "Duplicate" }).click();
  await assertHistory(page, 3, 0, true, false, "track.add");
  payload = await projectPayload(page);
  assert(opacityTracks(payload).length === 2, `duplicate track did not add an opacity track: ${opacityTracks(payload).length}`);

  await runCommand(page, "edit", "edit.undo");
  await assertHistory(page, 2, 1, true, true, "track.add");
  payload = await projectPayload(page);
  assert(opacityTracks(payload).length === 1, `undo duplicate did not remove opacity track: ${opacityTracks(payload).length}`);

  await opacityRow.locator(".track-meta").getByRole("button", { name: "Delete" }).click();
  await assertHistory(page, 3, 0, true, false, "track.remove");
  payload = await projectPayload(page);
  assert(opacityTracks(payload).length === 0, "delete track left opacity track in export");

  await runCommand(page, "edit", "edit.undo");
  await assertHistory(page, 2, 1, true, true, "track.remove");
  payload = await projectPayload(page);
  assert(opacityTracks(payload).length === 1, "undo delete track did not restore opacity track");

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runCommandHistorySmoke(browser);
  console.log("command history browser smoke passed");
} finally {
  await browser.close();
}
