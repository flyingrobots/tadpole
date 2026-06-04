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

const activeElementFact = async (page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return "";
    }
    const menuButton = active.getAttribute("data-tadpole-menu-button");
    if (menuButton !== null) {
      return menuButton;
    }
    if (active.hasAttribute("data-tadpole-warning-badge")) {
      return "warning-badge";
    }
    if (active.hasAttribute("data-tadpole-dirty-badge")) {
      return "dirty-badge";
    }
    if (active.hasAttribute("data-tadpole-panel-close")) {
      return "panel-close";
    }
    return active.tagName.toLowerCase();
  });

const warningSvg = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-label="Goal 12 Warning Fixture">
  <rect id="warning-badge" data-tadpole-name="Warning Badge" x="12" y="18" width="72" height="36" fill="#2563eb">
    <animateMotion dur="900ms" path="M0 0 L10 10" />
  </rect>
</svg>`;

const createPage = async (browser, viewport) => {
  const page = await browser.newPage({ viewport });
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

const assertCleanBrowser = (label, consoleErrors, pageErrors) => {
  assert(pageErrors.length === 0, `${label} page errors: ${pageErrors.join("\n")}`);
  assert(consoleErrors.length === 0, `${label} console errors: ${consoleErrors.join("\n")}`);
};

const runCommand = async (page, menu, command) => {
  await page.locator(`[data-tadpole-menu-button="${menu}"]`).click();
  await page.locator(`[data-tadpole-menu="${menu}"]`).waitFor({ state: "visible" });
  await page.locator(`[data-tadpole-command="${command}"]`).click();
};

const assertPanelLedger = async (page, panelId, open) => {
  const expected = open ? "true" : "false";
  const ledger = page.locator(
    `[data-tadpole-panel-state-ledger] [data-tadpole-panel-id="${panelId}"][data-tadpole-panel-open="${expected}"]`,
  );
  assert((await ledger.count()) === 1, `${panelId} ledger state is not ${expected}`);
};

const assertDefaultHiddenPanels = async (page, label) => {
  const host = page.locator("[data-tadpole-panel-host]");
  const statusText = await textOf(page.locator("[data-tadpole-document-status]"));

  assert((await host.getAttribute("data-tadpole-active-panel")) === "none", `${label}: default active panel is not none`);
  assert((await host.getAttribute("data-tadpole-panel-open")) === "false", `${label}: panel host is open by default`);
  assert((await host.getAttribute("data-tadpole-open-panel-ids")) === "", `${label}: open panel id ledger is not empty`);
  assert((await page.locator("[data-tadpole-panel-close]").count()) === 0, `${label}: closed panel close button is focusable`);
  assert((await page.locator(".panel-svg-source textarea").isVisible()) === false, `${label}: Source panel is visible by default`);
  assert((await page.locator(".export-block pre").first().isVisible()) === false, `${label}: Export panel is visible by default`);
  assert((await page.locator("[data-tadpole-warnings-panel]").count()) === 0, `${label}: Warnings panel is mounted by default`);
  assert(statusText.includes("Warnings: 0"), `${label}: warning badge count missing`);
  assert(statusText.includes("Dirty: no"), `${label}: dirty badge missing`);
  await assertPanelLedger(page, "source", false);
  await assertPanelLedger(page, "warnings", false);
  await assertPanelLedger(page, "export", false);
};

const importWarningSvgThroughSourcePanel = async (page) => {
  await runCommand(page, "view", "view.showSource");
  await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="source"]').waitFor({ state: "visible" });
  assert((await activeElementFact(page)) === "panel-close", "Source panel close control did not receive focus");
  await assertPanelLedger(page, "source", true);
  await page.getByLabel("Raw SVG").fill(warningSvg);
  await page.getByRole("button", { name: "Import Paste" }).click();
  await page.waitForSelector("[data-tadpole-canvas-stage] #warning-badge");
  const warningBadge = page.locator("[data-tadpole-warning-badge]");
  assert((await warningBadge.getAttribute("data-tadpole-warning-count")) === "1", "warning badge count did not update");
  const statusText = await textOf(page.locator("[data-tadpole-document-status]"));
  assert(statusText.includes("Dirty: yes"), "dirty badge did not update after import");
};

const assertPanelCloseReturnsFocus = async (page, expectedFocusFact, message) => {
  await page.locator("[data-tadpole-panel-close]").click();
  await page.waitForFunction(() => document.querySelector("[data-tadpole-panel-host]")?.getAttribute("data-tadpole-panel-open") === "false");
  assert((await activeElementFact(page)) === expectedFocusFact, message);
};

const assertBadgeDrivenPanels = async (page) => {
  await assertPanelCloseReturnsFocus(page, "view", "closing Source panel did not return focus to View menu root");

  await page.locator("[data-tadpole-warning-badge]").click();
  await page.locator("[data-tadpole-warnings-panel]").waitFor({ state: "visible" });
  assert((await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="warnings"]').count()) === 1, "warning badge did not open warnings panel");
  await assertPanelLedger(page, "warnings", true);
  await assertPanelCloseReturnsFocus(page, "warning-badge", "closing Warnings panel did not return focus to warning badge");

  await page.locator("[data-tadpole-dirty-badge]").click();
  await page.locator('section[data-tadpole-panel-id="export"][data-tadpole-panel-open="true"]').waitFor({ state: "visible" });
  assert((await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="export"]').count()) === 1, "dirty badge did not open export panel");
  await assertPanelLedger(page, "export", true);
  await assertPanelCloseReturnsFocus(page, "dirty-badge", "closing Export panel did not return focus to dirty badge");
};

const assertWidePanelHost = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser, { width: 1440, height: 1000 });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await assertDefaultHiddenPanels(page, "wide");
  await importWarningSvgThroughSourcePanel(page);
  await assertBadgeDrivenPanels(page);

  assertCleanBrowser("wide", consoleErrors, pageErrors);
  await page.close();
};

const assertNarrowPanelSheet = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser, { width: 390, height: 900 });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-canvas-stage] svg");

  await assertDefaultHiddenPanels(page, "narrow");
  await runCommand(page, "view", "view.showSource");
  await page.locator('[data-tadpole-panel-host][data-tadpole-active-panel="source"]').waitFor({ state: "visible" });
  const position = await page.locator("[data-tadpole-panel-host]").evaluate((node) => window.getComputedStyle(node).position);
  assert(position === "fixed", `narrow: panel host is ${position}, not a sheet`);
  await assertPanelCloseReturnsFocus(page, "view", "narrow: closing Source sheet did not return focus to View menu root");

  assertCleanBrowser("narrow", consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await assertWidePanelHost(browser);
  await assertNarrowPanelSheet(browser);
  console.log("panel host browser smoke passed");
} finally {
  await browser.close();
}
