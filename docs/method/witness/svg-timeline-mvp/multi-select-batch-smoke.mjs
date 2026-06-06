import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const batchSvg = `<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg" aria-label="Batch Editing Fixture">
  <g id="batch-root" data-tadpole-name="Batch Root">
    <rect id="batch-alpha" data-tadpole-name="Alpha Panel" x="20" y="24" width="44" height="44" fill="#2563eb" />
    <circle id="batch-beta" data-tadpole-name="Beta Dot" cx="108" cy="46" r="22" fill="#14b8a6" />
    <path id="batch-gamma" data-tadpole-name="Gamma Arrow" d="M150 46h34m-12-12 12 12-12 12" stroke="#f97316" stroke-width="6" fill="none" />
    <text id="batch-caption" x="24" y="96">Batch</text>
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

const openPanel = async (page, menu, command, selector) => {
  const panel = page.locator(selector);
  if (await panel.isVisible()) {
    return;
  }
  await runCommand(page, menu, command);
  await panel.waitFor({ state: "visible" });
};

const importSvgByPaste = async (page, source) => {
  await runCommand(page, "file", "file.pasteSvg");
  const dialog = page.locator("[data-tadpole-active-dialog]");
  await dialog.waitFor({ state: "visible" });
  await dialog.locator("textarea").fill(source);
  await dialog.getByRole("button", { name: "Import Pasted SVG" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.locator("[data-tadpole-canvas-stage] #batch-alpha").waitFor({ state: "attached" });
};

const layerRow = (page, targetId) => page.locator(`[data-tadpole-layer-row="${targetId}"]`);

const batchToggle = (page, targetId) => page.locator(`[data-tadpole-layer-batch-toggle="${targetId}"]`);

const historyFacts = async (page) => {
  const history = page.locator("[data-tadpole-command-history]");
  return {
    undoCount: await history.getAttribute("data-tadpole-undo-count"),
    redoCount: await history.getAttribute("data-tadpole-redo-count"),
    lastCommand: await history.getAttribute("data-tadpole-last-command"),
  };
};

const assertHistory = async (page, undoCount, redoCount, lastCommand) => {
  const facts = await historyFacts(page);
  assert(facts.undoCount === String(undoCount), `undo count mismatch: ${facts.undoCount}`);
  assert(facts.redoCount === String(redoCount), `redo count mismatch: ${facts.redoCount}`);
  assert(facts.lastCommand === lastCommand, `last command mismatch: ${facts.lastCommand}`);
};

const projectPayload = async (page) => {
  await openPanel(page, "view", "view.showExport", ".export-block");
  const payloadText = await page.locator("[data-tadpole-panel-host] .export-block pre").first().textContent();
  assert(payloadText !== null, "project export payload is missing");
  return JSON.parse(payloadText);
};

const batchOpacityTracks = (payload) =>
  payload.timeline.tracks.filter(
    (track) =>
      track.property === "opacity" &&
      ["batch-alpha", "batch-beta", "batch-gamma"].includes(track.targetId),
  );

const assertBatchTrackTargets = (payload, expectedTargetIds) => {
  const actual = batchOpacityTracks(payload)
    .map((track) => track.targetId)
    .sort();
  const expected = [...expectedTargetIds].sort();
  assert(
    actual.join(",") === expected.join(","),
    `batch opacity track targets mismatch: expected ${expected.join(",")} got ${actual.join(",")}`,
  );
};

const run = async () => {
  const browser = await chromium.launch();
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  try {
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await importSvgByPaste(page, batchSvg);
    await openPanel(page, "view", "view.showLayers", "[data-tadpole-layers-panel]");

    const panel = page.locator("[data-tadpole-layers-panel]");
    await batchToggle(page, "batch-alpha").check();
    await batchToggle(page, "batch-beta").check();
    await batchToggle(page, "batch-gamma").check();

    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-layers-panel]");
      return (
        panelNode?.getAttribute("data-tadpole-multi-select-count") === "3" &&
        panelNode?.getAttribute("data-tadpole-multi-selected-target-ids") ===
          "batch-alpha,batch-beta,batch-gamma"
      );
    });

    assert(
      (await layerRow(page, "batch-alpha").getAttribute("data-tadpole-layer-multi-selected")) === "true",
      "batch-alpha row is not marked multi-selected",
    );
    assert(
      (await layerRow(page, "batch-caption").getAttribute("data-tadpole-layer-multi-selected")) === "false",
      "batch-caption row should not be marked multi-selected",
    );

    await layerRow(page, "batch-caption").click();
    await page.waitForFunction(() => {
      const caption = document.querySelector('[data-tadpole-layer-row="batch-caption"]');
      const panelNode = document.querySelector("[data-tadpole-layers-panel]");
      return (
        caption?.getAttribute("data-tadpole-layer-selected") === "true" &&
        panelNode?.getAttribute("data-tadpole-multi-select-count") === "3"
      );
    });

    await panel.locator("[data-tadpole-batch-track-property]").selectOption("opacity");
    await panel.locator("[data-tadpole-batch-create-tracks]").click();
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-layers-panel]");
      const historyNode = document.querySelector("[data-tadpole-command-history]");
      return (
        panelNode?.getAttribute("data-tadpole-batch-created-count") === "3" &&
        historyNode?.getAttribute("data-tadpole-last-command") === "track.addMany"
      );
    });
    await assertHistory(page, 1, 0, "track.addMany");

    let payload = await projectPayload(page);
    assertBatchTrackTargets(payload, ["batch-alpha", "batch-beta", "batch-gamma"]);
    assert(
      !payload.timeline.tracks.some((track) => track.targetId === "batch-caption" && track.property === "opacity"),
      "single-selected caption target received an unintended batch track",
    );

    await runCommand(page, "edit", "edit.undo");
    await assertHistory(page, 0, 1, "track.addMany");
    payload = await projectPayload(page);
    assertBatchTrackTargets(payload, []);

    await runCommand(page, "edit", "edit.redo");
    await assertHistory(page, 1, 0, "track.addMany");
    payload = await projectPayload(page);
    assertBatchTrackTargets(payload, ["batch-alpha", "batch-beta", "batch-gamma"]);

    await assertCleanBrowser(consoleErrors, pageErrors);
  } finally {
    await browser.close();
  }
};

run()
  .then(() => {
    console.log("multi-select batch browser smoke passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
