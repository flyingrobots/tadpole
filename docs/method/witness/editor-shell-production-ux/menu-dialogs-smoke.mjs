import { Buffer } from "node:buffer";
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

const activeMenuButton = async (page) =>
  page.evaluate(() => document.activeElement?.getAttribute("data-tadpole-menu-button") ?? "");

const fileSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Goal 11 File SVG">
  <rect id="file-badge" data-tadpole-name="File Badge" x="16" y="18" width="72" height="36" fill="#2563eb" />
</svg>`;

const pastedSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Goal 11 Pasted SVG">
  <circle id="paste-dot" data-tadpole-name="Paste Dot" cx="54" cy="40" r="24" fill="#f97316" />
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

const openMenu = async (page, menu) => {
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).click();
  await page.locator(`[data-tadpole-menu="${menu}"]`).waitFor({ state: "visible" });
};

const runCommand = async (page, menu, command) => {
  await openMenu(page, menu);
  await page.locator(`[data-tadpole-command="${command}"]`).click();
};

const assertCommandInMenu = async (page, menu, command) => {
  await openMenu(page, menu);
  const commandCount = await page.locator(`[data-tadpole-menu="${menu}"] [data-tadpole-command="${command}"]`).count();
  assert(commandCount === 1, `${command} command missing from ${menu} menu`);
  await page.keyboard.press("Escape");
};

const assertCommandSurface = async (page) => {
  const expectedCommands = [
    ["file", "file.openSvg"],
    ["file", "file.pasteSvg"],
    ["file", "file.saveSvg"],
    ["file", "file.saveSvgAs"],
    ["file", "file.revertSvg"],
    ["view", "view.showSource"],
    ["view", "view.showWarnings"],
    ["view", "view.showLayers"],
    ["view", "view.showInspector"],
    ["view", "view.showExport"],
    ["view", "view.showDebug"],
    ["timeline", "timeline.playPause"],
    ["export", "export.runnableHtml"],
  ];

  for (const [menu, command] of expectedCommands) {
    await assertCommandInMenu(page, menu, command);
  }
};

const assertKeyboardFileDialog = async (page) => {
  await page.evaluate(() => {
    window.__tadpoleMenuKeyReachedWindow = false;
    window.addEventListener(
      "keydown",
      (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("[data-tadpole-menubar]") && event.key === "ArrowRight") {
          window.__tadpoleMenuKeyReachedWindow = true;
        }
      },
      { once: true },
    );
  });
  await page.locator('[data-tadpole-menu-button="file"]').focus();
  await page.keyboard.press("ArrowRight");
  assert((await page.evaluate(() => window.__tadpoleMenuKeyReachedWindow)) === false, "menu ArrowRight key bubbled to window");
  await page.locator('[data-tadpole-menu-button="file"]').focus();
  await page.keyboard.press(" ");
  await page.locator('[data-tadpole-menu="file"]').waitFor({ state: "visible" });
  let statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Playhead: Idle"), "menu Space key leaked to global playback shortcut");
  await page.keyboard.press("Enter");
  const dialog = page.locator('[data-tadpole-dialog="open-svg"]');
  await dialog.waitFor({ state: "visible" });
  assert((await page.getByRole("dialog", { name: "Open SVG" }).count()) === 1, "keyboard path did not open Open SVG dialog");
  assert((await page.locator("[data-tadpole-canvas-stage] svg").count()) === 1, "stage disappeared behind Open SVG dialog");
  assert((await page.locator("[data-tadpole-bottom-timeline]").count()) === 1, "timeline disappeared behind Open SVG dialog");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert((await activeMenuButton(page)) === "file", "closing File > Open SVG did not restore focus to File menu");
};

const assertOpenSvgDialog = async (page) => {
  await runCommand(page, "file", "file.openSvg");
  const dialog = page.locator('[data-tadpole-dialog="open-svg"]');
  await dialog.waitFor({ state: "visible" });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "goal-11-file.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(fileSvg),
  });
  await page.waitForSelector("[data-tadpole-canvas-stage] #file-badge");
  await dialog.waitFor({ state: "hidden" });
  assert((await activeMenuButton(page)) === "file", "successful File > Open SVG import did not restore focus to File menu");
  const statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Document: goal-11-file.svg"), "file dialog did not update document label");
  assert(statusText.includes("Dirty: yes"), "file dialog import did not mark document dirty");
};

const assertPasteSvgDialog = async (page) => {
  await page.locator('[data-tadpole-menu-button="file"]').focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const dialog = page.locator('[data-tadpole-dialog="paste-svg"]');
  await dialog.waitFor({ state: "visible" });
  await dialog.locator("textarea").fill(pastedSvg);
  await dialog.getByRole("button", { name: "Import Pasted SVG" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #paste-dot");
  await dialog.waitFor({ state: "hidden" });
  const statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Document: Pasted SVG"), "paste dialog did not update document label");
};

const assertViewCommands = async (page) => {
  await runCommand(page, "view", "view.showSource");
  await page.locator(".panel-svg-source").waitFor({ state: "visible" });
  assert(
    (await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="source"]').count()) === 1,
    "View > Source did not expose source active-panel state",
  );

  await runCommand(page, "view", "view.showWarnings");
  await page.locator("[data-tadpole-warnings-panel]").waitFor({ state: "visible" });
  assert(
    (await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="warnings"]').count()) === 1,
    "View > Warnings did not expose warnings active-panel state",
  );

  await runCommand(page, "view", "view.showLayers");
  await page.locator("[data-tadpole-layers-panel]").waitFor({ state: "visible" });
  assert(
    (await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="layers"]').count()) === 1,
    "View > Layers did not expose layers active-panel state",
  );

  await runCommand(page, "view", "view.showInspector");
  await page.locator("[data-tadpole-inspector-panel]").waitFor({ state: "visible" });
  assert(
    (await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="inspector"]').count()) === 1,
    "View > Inspector did not expose inspector active-panel state",
  );
};

const assertExportDialog = async (page) => {
  await runCommand(page, "export", "export.runnableHtml");
  const dialog = page.locator('[data-tadpole-dialog="export-runnable"]');
  await dialog.waitFor({ state: "visible" });
  const dialogText = await textOf(dialog);
  assert(dialogText.includes("Export Runnable HTML"), "runnable export dialog title missing");
  assert(dialogText.includes("tadpole-runnable-html-1"), "runnable export dialog does not expose payload version");
  assert((await dialog.locator("[data-tadpole-runnable-dialog-output]").count()) === 1, "runnable export output missing");
  await dialog.focus();
  await page.keyboard.press(" ");
  const statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Playhead: Idle"), "dialog Space key leaked to global playback shortcut");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
};

const browser = await chromium.launch({ headless: true });
try {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await assertCommandSurface(page);
  await assertKeyboardFileDialog(page);
  await assertOpenSvgDialog(page);
  await assertPasteSvgDialog(page);
  await assertViewCommands(page);
  await assertExportDialog(page);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
  console.log("menu dialog browser smoke passed");
} finally {
  await browser.close();
}
