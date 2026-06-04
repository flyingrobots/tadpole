import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);
const { chromium } = requireFromCwd("playwright");

const appUrl = process.env.TADPOLE_APP_URL ?? "http://localhost:5173/";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

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

const setCurrentTime = async (page, time) => {
  const currentInput = page.locator(".timeline-controls .inline-label", { hasText: "Current" }).locator("input");
  await currentInput.fill(String(time));
};

const focusTimeline = async (page) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
};

const timelineNumberFact = async (timeline, name) => {
  const value = await timeline.getAttribute(name);
  assert(value !== null && value !== "", `${name} is missing`);
  return Number(value);
};

const runWorkAreaSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-tadpole-bottom-timeline]");

  const timeline = page.locator("[data-tadpole-bottom-timeline]");
  const workAreaControls = page.locator("[data-tadpole-work-area-controls]");
  assert((await workAreaControls.count()) === 1, "work area controls are missing");
  assert((await timeline.getAttribute("data-tadpole-work-area-active")) === "false", "work area starts active");
  assert((await timeline.getAttribute("data-tadpole-time-display-mode")) === "seconds", "default time display is not seconds");

  await setCurrentTime(page, 400);
  await workAreaControls.locator('[data-tadpole-command="timeline.setInPoint"]').click();
  await setCurrentTime(page, 900);
  await workAreaControls.locator('[data-tadpole-command="timeline.setOutPoint"]').click();

  assert((await timeline.getAttribute("data-tadpole-work-area-active")) === "true", "work area did not activate");
  assert((await timeline.getAttribute("data-tadpole-work-area-in")) === "400", "work area in-point mismatch");
  assert((await timeline.getAttribute("data-tadpole-work-area-out")) === "896", "work area out-point mismatch");
  assert((await page.locator('[data-tadpole-work-area-marker="in"]').count()) === 1, "in marker missing");
  assert((await page.locator('[data-tadpole-work-area-marker="out"]').count()) === 1, "out marker missing");
  assert((await page.locator("[data-tadpole-work-area-range]").count()) === 1, "work area range missing");

  await focusTimeline(page);
  await page.keyboard.press("U");
  assert((await timeline.getAttribute("data-tadpole-time-display-mode")) === "frames", "keyboard unit toggle did not switch to frames");
  const currentTimeDisplay = await timeline.getAttribute("data-tadpole-current-time-display");
  assert(currentTimeDisplay?.endsWith("f"), `frame display did not expose frame units: ${currentTimeDisplay}`);

  await setCurrentTime(page, 200);
  await focusTimeline(page);
  await page.keyboard.press("I");
  await setCurrentTime(page, 700);
  await focusTimeline(page);
  await page.keyboard.press("O");
  assert((await timeline.getAttribute("data-tadpole-work-area-in")) === "208", "keyboard in-point did not snap current time");
  assert((await timeline.getAttribute("data-tadpole-work-area-out")) === "704", "keyboard out-point did not snap current time");

  await focusTimeline(page);
  await page.keyboard.press("L");
  assert((await timeline.getAttribute("data-tadpole-loop-work-area")) === "true", "keyboard work-area loop did not toggle on");

  await page.getByRole("button", { name: "Loop ON" }).first().click();
  await setCurrentTime(page, 1000);
  await page.getByRole("button", { name: "Play" }).first().click();
  await page.waitForTimeout(650);
  const loopedTime = await timelineNumberFact(timeline, "data-tadpole-current-time-ms");
  assert(loopedTime >= 208 && loopedTime < 704, `playback escaped work area loop: ${loopedTime}`);
  await page.getByRole("button", { name: "Stop" }).first().click();

  await workAreaControls.locator('[data-tadpole-command="timeline.clearWorkArea"]').click();
  assert((await timeline.getAttribute("data-tadpole-work-area-active")) === "false", "clear work area left active range");
  assert((await timeline.getAttribute("data-tadpole-loop-work-area")) === "false", "clear work area left loop active");

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runWorkAreaSmoke(browser);
  console.log("work area browser smoke passed");
} finally {
  await browser.close();
}
