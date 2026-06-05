import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const nestedSvg = `<svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg" aria-label="Nested Layers Fixture">
  <g id="logo-root" data-tadpole-name="Logo Root">
    <g id="badge-group" data-tadpole-name="Badge Group">
      <rect id="badge-box" data-tadpole-name="Badge Box" x="18" y="18" width="54" height="36" fill="#2563eb" />
      <text id="badge-label" x="28" y="43">Go</text>
    </g>
    <rect id="box" x="84" y="18" width="18" height="18" fill="#0f172a" />
    <rect id="box-shadow" x="90" y="24" width="18" height="18" fill="#64748b">
      <animate attributeName="opacity" values="0.2;0.7" dur="1000ms" calcMode="discrete" />
    </rect>
    <g id="motion-group" aria-label="Motion Group">
      <circle id="motion-dot" cx="120" cy="50" r="16" fill="#14b8a6">
        <animate attributeName="opacity" values="0.3;1" dur="1000ms" />
      </circle>
    </g>
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

const importSvgByPaste = async (page, source) => {
  await runCommand(page, "file", "file.pasteSvg");
  const dialog = page.locator("[data-tadpole-active-dialog]");
  await dialog.waitFor({ state: "visible" });
  await dialog.locator("textarea").fill(source);
  await dialog.getByRole("button", { name: "Import Pasted SVG" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.locator('[data-tadpole-canvas-stage] #badge-box').waitFor({ state: "attached" });
};

const openLayersPanel = async (page) => {
  await runCommand(page, "view", "view.showLayers");
  await page.locator("[data-tadpole-layers-panel]").waitFor({ state: "visible" });
};

const layerRow = (page, targetId) => page.locator(`[data-tadpole-layer-row="${targetId}"]`);

const run = async () => {
  const browser = await chromium.launch();
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  try {
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await importSvgByPaste(page, nestedSvg);
    await openLayersPanel(page);

    const panel = page.locator("[data-tadpole-layers-panel]");
    await panel.locator("[data-tadpole-layer-search]").fill("badge");
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-layers-panel]");
      return panelNode?.getAttribute("data-tadpole-layer-visible-count") === "3";
    });

    const badgeGroup = layerRow(page, "badge-group");
    const badgeBox = layerRow(page, "badge-box");
    const badgeLabel = layerRow(page, "badge-label");
    await badgeGroup.waitFor({ state: "visible" });
    await badgeBox.waitFor({ state: "visible" });
    await badgeLabel.waitFor({ state: "visible" });

    assert((await badgeGroup.getAttribute("data-tadpole-layer-depth")) === "1", "badge group depth mismatch");
    assert((await badgeBox.getAttribute("data-tadpole-layer-parent-id")) === "badge-group", "badge box parent mismatch");
    assert((await badgeBox.getAttribute("data-tadpole-layer-track-count")) === "0", "badge box track count mismatch");

    await panel.locator("[data-tadpole-layer-search]").fill("box");
    await page.waitForFunction(() => {
      const box = document.querySelector('[data-tadpole-layer-row="box"]');
      const shadow = document.querySelector('[data-tadpole-layer-row="box-shadow"]');
      return (
        box?.getAttribute("data-tadpole-layer-visible") === "true" &&
        shadow?.getAttribute("data-tadpole-layer-visible") === "true"
      );
    });

    const box = layerRow(page, "box");
    const boxShadow = layerRow(page, "box-shadow");
    assert((await box.getAttribute("data-tadpole-layer-warning-count")) === "0", "box warning count matched box-shadow warning");
    assert((await boxShadow.getAttribute("data-tadpole-layer-warning-count")) === "1", "box-shadow warning count mismatch");

    await panel.locator("[data-tadpole-layer-search]").fill("motion");
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-tadpole-layer-row="motion-dot"]');
      return row?.getAttribute("data-tadpole-layer-visible") === "true";
    });

    const motionDot = layerRow(page, "motion-dot");
    assert((await motionDot.getAttribute("data-tadpole-layer-kind")) === "shape", "motion dot kind mismatch");
    assert((await motionDot.getAttribute("data-tadpole-layer-track-count")) === "1", "motion dot track count mismatch");

    await motionDot.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const row = document.querySelector('[data-tadpole-layer-row="motion-dot"]');
      const targetRow = document.querySelector('[data-tadpole-target-row="motion-dot"]');
      const selectedCanvasTarget = document.querySelector("[data-tadpole-canvas-stage] #motion-dot.tadpole-selected-target");
      return (
        row?.getAttribute("data-tadpole-layer-selected") === "true" &&
        targetRow !== null &&
        selectedCanvasTarget !== null
      );
    });

    const targetRow = page.locator('[data-tadpole-target-row="motion-dot"]');
    assert((await targetRow.getAttribute("data-tadpole-target-row-expanded")) === "true", "target timeline row did not expand");
    await assertCleanBrowser(consoleErrors, pageErrors);
  } finally {
    await browser.close();
  }
};

run()
  .then(() => {
    console.log("layers panel browser smoke passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
