import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const fixtureSvg = `<svg viewBox="0 0 180 100" xmlns="http://www.w3.org/2000/svg" aria-label="Inspector Fixture">
  <rect id="inspect-box" data-tadpole-name="Inspect Box" x="18" y="18" width="54" height="36" fill="#2563eb">
    <animate attributeName="opacity" values="0.25;1" dur="1000ms" />
  </rect>
  <circle id="inspect-dot" data-tadpole-name="Inspect Dot" cx="122" cy="48" r="18" fill="#14b8a6">
    <animate attributeName="opacity" values="0.2;1" dur="1000ms" calcMode="discrete" />
  </circle>
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
  await page.locator('[data-tadpole-canvas-stage] #inspect-box').waitFor({ state: "attached" });
};

const inspector = (page) => page.locator("[data-tadpole-inspector-panel]");

const run = async () => {
  const browser = await chromium.launch();
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  try {
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await importSvgByPaste(page, fixtureSvg);
    await runCommand(page, "view", "view.showInspector");

    const panel = inspector(page);
    await panel.waitFor({ state: "visible" });
    assert((await panel.getAttribute("data-tadpole-inspector-mode")) === "track", "initial inspector mode was not track");
    assert((await panel.getAttribute("data-tadpole-inspector-target-id")) === "inspect-box", "initial inspector target mismatch");

    await page.locator('[data-tadpole-canvas-stage] #inspect-dot').click();
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-inspector-panel]");
      return (
        panelNode?.getAttribute("data-tadpole-inspector-mode") === "target" &&
        panelNode.getAttribute("data-tadpole-inspector-target-id") === "inspect-dot"
      );
    });

    await page.locator('[data-tadpole-property-row] [data-keyframe-id]').first().click();
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-inspector-panel]");
      return panelNode?.getAttribute("data-tadpole-inspector-mode") === "keyframe";
    });

    const keyframeValue = panel.locator("[data-tadpole-inspector-keyframe-value]");
    await keyframeValue.fill("0.5");
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-inspector-panel]");
      const valueInput = document.querySelector("[data-tadpole-inspector-keyframe-value]");
      const selectedKey = panelNode?.getAttribute("data-tadpole-inspector-keyframe-id");
      const marker = selectedKey ? document.querySelector(`[data-keyframe-id="${selectedKey}"]`) : null;
      return valueInput?.value === "0.5" && marker?.getAttribute("title")?.includes("0.5");
    });

    await keyframeValue.fill("1.5");
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-inspector-panel]");
      return (
        panelNode?.getAttribute("data-tadpole-inspector-validation") === "invalid" &&
        document.querySelector("[data-tadpole-inspector-error]")?.textContent?.includes("Invalid")
      );
    });

    await page.locator("[data-tadpole-panel-close]").click();
    await page.locator("[data-tadpole-inspector-panel]").waitFor({ state: "hidden" });
    await page.locator('[data-tadpole-property-row] [data-keyframe-id]').first().click();
    await page.waitForFunction(() => {
      const selectedMarker = document.querySelector('[data-keyframe-id].is-selected');
      return selectedMarker !== null;
    });

    await runCommand(page, "view", "view.showWarnings");
    const warningsPanel = page.locator("[data-tadpole-warnings-panel]");
    await warningsPanel.waitFor({ state: "visible" });
    await warningsPanel.locator("[data-tadpole-warning-row]").first().click();
    await runCommand(page, "view", "view.showInspector");
    await page.waitForFunction(() => {
      const panelNode = document.querySelector("[data-tadpole-inspector-panel]");
      return panelNode?.getAttribute("data-tadpole-inspector-mode") === "warning";
    });

    await assertCleanBrowser(consoleErrors, pageErrors);
  } finally {
    await browser.close();
  }
};

run()
  .then(() => {
    console.log("inspector browser smoke passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
