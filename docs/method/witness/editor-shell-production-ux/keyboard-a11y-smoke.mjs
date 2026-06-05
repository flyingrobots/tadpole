/* global process, document, HTMLElement, console */
import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";
const keyboardBoxOpacityLaneSelector =
  '[data-tadpole-track-lane][data-tadpole-target-id="keyboard-box"][data-tadpole-property="opacity"]';
const keyboardBoxOpacityKeyframeSelector =
  '[data-tadpole-keyframe-track-id][data-keyframe-id][data-tadpole-target-id="keyboard-box"][data-tadpole-property="opacity"]';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const keyboardFixtureSvg = `<svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg" aria-label="Keyboard Fixture">
  <rect id="keyboard-box" data-tadpole-name="Keyboard Box" x="28" y="26" width="62" height="42" fill="#2563eb">
    <animate attributeName="opacity" values="0.25;1" dur="1000ms" />
  </rect>
  <circle id="keyboard-dot" data-tadpole-name="Keyboard Dot" cx="122" cy="48" r="19" fill="#14b8a6">
    <animate attributeName="opacity" values="0.1;0.9" dur="1000ms" />
  </circle>
  <ellipse id="keyboard-warning" data-tadpole-name="Keyboard Warning" cx="122" cy="88" rx="20" ry="10" fill="#f59e0b">
    <animate attributeName="opacity" values="0.1;0.9" dur="1000ms" calcMode="discrete" />
  </ellipse>
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

const runMenuCommandByKeyboard = async (page, menu, command) => {
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).focus();
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).press("Enter");
  await page.locator(`[data-tadpole-menu="${menu}"]`).waitFor({ state: "visible" });
  await page.waitForFunction(
    (menuId) => document.activeElement instanceof HTMLElement && document.activeElement.closest(`[data-tadpole-menu="${menuId}"]`) !== null,
    menu,
  );
  await page.locator(`[data-tadpole-command="${command}"]`).focus();
  await page.locator(`[data-tadpole-command="${command}"]`).press("Enter");
};

const importSvgByKeyboard = async (page, source) => {
  await runMenuCommandByKeyboard(page, "file", "file.pasteSvg");
  const dialog = page.locator("[data-tadpole-active-dialog]");
  await dialog.waitFor({ state: "visible" });
  await waitForFocusedSelector(page, "[data-tadpole-active-dialog] .dialog-close");
  await page.keyboard.press("Tab");
  await waitForFocusedSelector(page, "[data-tadpole-active-dialog] textarea");
  await dialog.locator("textarea").fill(source);
  const importButton = dialog.getByRole("button", { name: "Import Pasted SVG" });
  await page.keyboard.press("Tab");
  await waitForFocusedSelector(page, "[data-tadpole-active-dialog] button:not(.dialog-close)");
  await importButton.press("Enter");
  await dialog.waitFor({ state: "hidden" });
  await page.locator("[data-tadpole-canvas-stage] #keyboard-box").waitFor({ state: "attached" });
};

const openLayersByKeyboard = async (page) => {
  await runMenuCommandByKeyboard(page, "view", "view.showLayers");
  await page.locator("[data-tadpole-layers-panel]").waitFor({ state: "visible" });
  await waitForFocusedSelector(page, "[data-tadpole-panel-close]");
  await page.keyboard.press("Tab");
  await waitForFocusedSelector(page, "[data-tadpole-layer-search]");
};

const waitForFocusedSelector = async (page, selector) => {
  await page.waitForFunction(
    (expectedSelector) => document.activeElement instanceof HTMLElement && document.activeElement.matches(expectedSelector),
    selector,
  );
};

const blurActiveElement = async (page) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
};

const installKeyframeBubbleProbe = async (page, laneSelector) => {
  await page.evaluate((selector) => {
    const lane = document.querySelector(selector);
    if (!(lane instanceof HTMLElement)) {
      throw new Error("track lane missing for keyframe bubble probe");
    }
    lane.removeAttribute("data-tadpole-test-bubbled-keyframe-key");
    const handler = (event) => {
      if (event.target !== lane && (event.key === "Enter" || event.key === " ")) {
        lane.setAttribute("data-tadpole-test-bubbled-keyframe-key", event.key === " " ? "Space" : event.key);
      }
      lane.removeEventListener("keydown", handler);
    };
    lane.addEventListener("keydown", handler);
  }, laneSelector);
};

const assertKeyframeActivationStayedLocal = async (page, expectedCount, keyName, laneSelector, keyframeSelector) => {
  await page.waitForTimeout(100);
  const markerCount = await page.locator(keyframeSelector).count();
  const bubbledKey = await page.locator(laneSelector).getAttribute("data-tadpole-test-bubbled-keyframe-key");
  assert(markerCount === expectedCount, `${keyName} on a focused keyframe created an extra keyframe`);
  assert(bubbledKey === null, `${keyName} on a focused keyframe bubbled into the parent lane`);
};

const deleteFocusedKeyframeAndAssertFocus = async (page, laneSelector, keyframeSelector) => {
  const beforeCount = await page.locator(keyframeSelector).count();
  assert(beforeCount > 0, "no focused keyframe remains to delete");
  await page.keyboard.press("Delete");
  await page.waitForFunction(
    ({ selector, count }) => document.querySelectorAll(selector).length === count - 1,
    { selector: keyframeSelector, count: beforeCount },
  );
  await page.waitForFunction(({ lane, keyframe }) => {
    if (!(document.activeElement instanceof HTMLElement)) {
      return false;
    }
    const remainingCount = document.querySelectorAll(keyframe).length;
    if (remainingCount === 0) {
      return document.activeElement.matches(lane);
    }
    return document.activeElement.matches(keyframe);
  }, { lane: laneSelector, keyframe: keyframeSelector });
};

const run = async () => {
  const browser = await chromium.launch();
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  try {
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await importSvgByKeyboard(page, keyboardFixtureSvg);
    await openLayersByKeyboard(page);

    const targetLayer = page.locator('[data-tadpole-layer-row="keyboard-box"]');
    await targetLayer.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-tadpole-layer-row="keyboard-box"]');
      const selectedCanvasTarget = document.querySelector("[data-tadpole-canvas-stage] #keyboard-box.tadpole-selected-target");
      return row?.getAttribute("data-tadpole-layer-selected") === "true" && selectedCanvasTarget !== null;
    });

    const trackLane = page.locator(keyboardBoxOpacityLaneSelector);
    await trackLane.waitFor({ state: "visible" });
    const trackLaneName = await trackLane.getAttribute("aria-label");
    assert(trackLaneName?.includes("Keyboard Box opacity"), `timeline lane accessible name mismatch: ${trackLaneName ?? ""}`);

    const initialKeyframeCount = await page.locator(keyboardBoxOpacityKeyframeSelector).count();
    await trackLane.focus();
    await page.keyboard.press("Tab");
    await waitForFocusedSelector(page, keyboardBoxOpacityKeyframeSelector);
    await trackLane.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("k");
    await page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length > count,
      { selector: keyboardBoxOpacityKeyframeSelector, count: initialKeyframeCount },
    );

    const selectedMarker = page.locator(`${keyboardBoxOpacityKeyframeSelector}.is-selected`).first();
    await selectedMarker.waitFor({ state: "visible" });
    const selectedKeyframeId = await selectedMarker.getAttribute("data-keyframe-id");
    const selectedMarkerLabel = await selectedMarker.getAttribute("aria-label");
    assert(selectedKeyframeId !== null && selectedKeyframeId !== "", "selected keyframe marker is missing an id");
    assert(selectedMarkerLabel?.includes("Keyboard Box opacity keyframe"), `keyframe accessible name mismatch: ${selectedMarkerLabel ?? ""}`);

    const originalTimeText = await selectedMarker.getAttribute("data-tadpole-keyframe-time");
    const originalTime = Number(originalTimeText);
    assert(Number.isFinite(originalTime), `selected keyframe time is not inspectable: ${originalTimeText ?? ""}`);
    await selectedMarker.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(
      ({ keyframeId, time }) => {
        const marker = document.querySelector(`[data-keyframe-id="${keyframeId}"]`);
        const movedTime = Number(marker?.getAttribute("data-tadpole-keyframe-time"));
        return Number.isFinite(movedTime) && movedTime > time;
      },
      { keyframeId: selectedKeyframeId, time: originalTime },
    );

    const countBeforeFocusedActivation = await page.locator(keyboardBoxOpacityKeyframeSelector).count();
    await installKeyframeBubbleProbe(page, keyboardBoxOpacityLaneSelector);
    await selectedMarker.press("Enter");
    await assertKeyframeActivationStayedLocal(
      page,
      countBeforeFocusedActivation,
      "Enter",
      keyboardBoxOpacityLaneSelector,
      keyboardBoxOpacityKeyframeSelector,
    );
    await installKeyframeBubbleProbe(page, keyboardBoxOpacityLaneSelector);
    await selectedMarker.press("Space");
    await assertKeyframeActivationStayedLocal(
      page,
      countBeforeFocusedActivation,
      "Space",
      keyboardBoxOpacityLaneSelector,
      keyboardBoxOpacityKeyframeSelector,
    );

    await page.keyboard.press("Delete");
    await page.waitForFunction(
      (keyframeId) => document.querySelector(`[data-keyframe-id="${keyframeId}"]`) === null,
      selectedKeyframeId,
    );
    await page.waitForFunction(
      ({ keyframe, lane }) =>
        document.activeElement instanceof HTMLElement &&
        (document.activeElement.matches(keyframe) || document.activeElement.matches(lane)),
      { keyframe: keyboardBoxOpacityKeyframeSelector, lane: keyboardBoxOpacityLaneSelector },
    );
    await page.locator(keyboardBoxOpacityKeyframeSelector).first().focus();
    await deleteFocusedKeyframeAndAssertFocus(page, keyboardBoxOpacityLaneSelector, keyboardBoxOpacityKeyframeSelector);
    await page.locator(keyboardBoxOpacityKeyframeSelector).first().focus();
    await deleteFocusedKeyframeAndAssertFocus(page, keyboardBoxOpacityLaneSelector, keyboardBoxOpacityKeyframeSelector);

    await blurActiveElement(page);
    await runMenuCommandByKeyboard(page, "timeline", "timeline.playPause");
    await page.locator("[data-tadpole-playback-controls]").getByRole("button", { name: "Pause" }).waitFor({ state: "visible" });
    await runMenuCommandByKeyboard(page, "timeline", "timeline.playPause");
    await page.locator("[data-tadpole-playback-controls]").getByRole("button", { name: "Play" }).waitFor({ state: "visible" });

    const warningBadge = page.locator("[data-tadpole-warning-badge]");
    await warningBadge.waitFor({ state: "visible" });
    assert((await warningBadge.getAttribute("data-tadpole-warning-count")) === "1", "warning badge count mismatch");
    assert((await warningBadge.getAttribute("aria-label")) === "Warnings: 1. Open warnings panel.", "warning badge accessible label mismatch");
    await warningBadge.focus();
    await warningBadge.press("Enter");
    await page.locator("[data-tadpole-warnings-panel]").waitFor({ state: "visible" });
    await waitForFocusedSelector(page, "[data-tadpole-panel-close]");
    await page.locator("[data-tadpole-warnings-panel]").getByRole("button", { name: /Unsupported calcMode/ }).waitFor({
      state: "visible",
    });
    await page.locator("[data-tadpole-panel-close]").press("Enter");
    await page.waitForFunction(() => document.querySelector("[data-tadpole-panel-host]")?.getAttribute("data-tadpole-panel-open") === "false");
    await waitForFocusedSelector(page, "[data-tadpole-warning-badge]");

    await assertCleanBrowser(consoleErrors, pageErrors);
  } finally {
    await browser.close();
  }
};

run()
  .then(() => {
    console.log("keyboard accessibility browser smoke passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
