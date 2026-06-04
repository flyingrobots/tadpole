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

const animatedSvg = `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" aria-label="Animated Import Fixture">
  <style>
    @keyframes pulse { from { opacity: 0.2; } to { opacity: 1; } }
    #css-only { animation: pulse 900ms linear infinite; }
  </style>
  <script>
    document.querySelector("#box")?.animate([{ opacity: 0 }, { opacity: 1 }], 900);
  </script>
  <rect id="box" data-tadpole-name="Animated Box" x="16" y="20" width="48" height="28" fill="#0f766e">
    <animate attributeName="opacity" values="0;1;0.25" keyTimes="0;0.5;1" dur="900ms" repeatCount="indefinite" />
    <animate attributeName="fill" values="#0f766e;#2563eb" dur="900ms" />
    <animateTransform attributeName="transform" type="translate" values="0 0;24 12" dur="900ms" />
  </rect>
  <g id="needle" data-tadpole-name="Needle">
    <line x1="94" y1="58" x2="130" y2="28" stroke="#111827" stroke-width="4" />
    <animateTransform attributeName="transform" type="rotate" values="0;30" dur="900ms" />
  </g>
  <circle id="motion" data-tadpole-name="Motion Dot" cx="130" cy="62" r="7" fill="#f97316">
    <animateMotion dur="900ms" path="M0 0 L10 10" />
  </circle>
  <circle id="css-only" data-tadpole-name="CSS Only" cx="88" cy="22" r="7" fill="#64748b" />
</svg>`;

const unitlessDurationSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Unitless Duration Fixture">
  <rect id="clock" data-tadpole-name="Clock Box" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="2" />
  </rect>
</svg>`;

const discreteCalcModeSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Discrete CalcMode Fixture">
  <rect id="snap" data-tadpole-name="Snap Box" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="800ms" calcMode="discrete" />
  </rect>
</svg>`;

const unsafeHrefSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Unsafe Href Fixture">
  <rect id="safe-parent" data-tadpole-name="Safe Parent" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate href="https://example.invalid/#target" attributeName="opacity" values="0;1" dur="800ms" />
  </rect>
</svg>`;

const unsafeXlinkHrefSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-label="Unsafe XLink Href Fixture">
  <rect id="safe-parent-xlink" data-tadpole-name="Safe Parent XLink" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate xlink:href="https://example.invalid/#target" attributeName="opacity" values="0;1" dur="800ms" />
  </rect>
</svg>`;

const oneArgumentTranslateSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="One Argument Translate Fixture">
  <rect id="slider" data-tadpole-name="Slider" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animateTransform attributeName="transform" type="translate" values="0;24" dur="800ms" />
  </rect>
</svg>`;

const nonUniformScaleSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Non Uniform Scale Fixture">
  <rect id="scaler" data-tadpole-name="Scaler" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animateTransform attributeName="transform" type="scale" values="1 1;2 3" dur="800ms" />
  </rect>
</svg>`;

const pivotRotateSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Pivot Rotate Fixture">
  <rect id="spinner" data-tadpole-name="Spinner" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animateTransform attributeName="transform" type="rotate" values="0 40 20;90 40 20" dur="800ms" />
  </rect>
</svg>`;

const finiteRepeatSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Finite Repeat Fixture">
  <rect id="repeater" data-tadpole-name="Repeater" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="1s" repeatCount="2" />
  </rect>
</svg>`;

const malformedTransformSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Malformed Transform Fixture">
  <rect id="skewed" data-tadpole-name="Skewed" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animateTransform attributeName="transform" type="translate" values="0 0;24 nope" dur="800ms" />
  </rect>
</svg>`;

const rgbaColorSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="RGBA Color Fixture">
  <rect id="rgba-box" data-tadpole-name="RGBA Box" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="fill" values="rgba(0, 0, 0, 0);rgba(255, 255, 255, 1)" dur="800ms" />
  </rect>
</svg>`;

const extraTransformComponentSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Extra Transform Component Fixture">
  <rect id="extra" data-tadpole-name="Extra" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animateTransform attributeName="transform" type="translate" values="0 0 5;24 12 5" dur="800ms" />
  </rect>
</svg>`;

const additiveAnimationSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Additive Animation Fixture">
  <rect id="adder" data-tadpole-name="Adder" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animateTransform attributeName="transform" type="translate" values="0;24" dur="800ms" additive="sum" />
  </rect>
</svg>`;

const accumulatedAnimationSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Accumulated Animation Fixture">
  <rect id="accumulator" data-tadpole-name="Accumulator" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="800ms" accumulate="sum" />
  </rect>
</svg>`;

const oneShotAnimationSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="One Shot Animation Fixture">
  <rect id="oneshot" data-tadpole-name="One Shot" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="800ms" />
  </rect>
</svg>`;

const repeatedKeyTimesSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Repeated KeyTimes Fixture">
  <rect id="keydupe" data-tadpole-name="Key Dupe" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;0.5;1" keyTimes="0;0.5;0.5" dur="800ms" />
  </rect>
</svg>`;

const duplicatePropertyAnimationSvg = `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg" aria-label="Duplicate Property Animation Fixture">
  <rect id="dupe" data-tadpole-name="Duplicate" x="8" y="8" width="28" height="18" fill="#2563eb">
    <animate attributeName="opacity" values="0;1" dur="800ms" />
    <animate attributeName="opacity" values="1;0" dur="800ms" />
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
  assert(consoleErrors.length === 0, `browser console errors: ${consoleErrors.join(" | ")}`);
  assert(pageErrors.length === 0, `browser page errors: ${pageErrors.join(" | ")}`);
};

const openPanel = async (page, buttonName, selector) => {
  const panel = page.locator(selector);
  if (await panel.isVisible()) {
    return;
  }
  await page.getByRole("button", { name: buttonName }).click();
  await panel.waitFor({ state: "visible" });
};

const openSourcePanel = async (page) => openPanel(page, "Open SVG source panel", ".panel-svg-source");
const openExportPanel = async (page) => openPanel(page, "Open export panel", ".export-block");

const importSvgMarkup = async (page, svgMarkup) => {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".preview-svg-host svg");
  await openSourcePanel(page);
  await page.locator(".panel-svg-source textarea").fill(svgMarkup);
  await page.locator(".panel-svg-source button", { hasText: "Import Paste" }).click();
};

const projectPayload = async (page) => {
  await openExportPanel(page);
  const payloadText = await page.locator(".export-block pre code").textContent();
  assert(payloadText, "project export payload missing");
  return JSON.parse(payloadText);
};

const runAnimationImportSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, animatedSvg);
  await page.waitForSelector(".preview-svg-host #box");

  const sourcePanelText = await textOf(page.locator(".panel-svg-source"));
  assert(sourcePanelText.includes("Imported 5 animation tracks."), "SMIL tracks were not imported");
  assert(sourcePanelText.includes("3 unsupported animation notes reported."), "unsupported animation summary missing");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("CSS animation rules were not imported."), "CSS animation warning missing");
  assert(warningsText.includes("Web Animations script was not imported."), "Web Animations warning missing");
  assert(warningsText.includes("Unsupported animatemotion animation on #motion."), "animateMotion warning missing");

  const unsafeNodeCount = await page.locator(".preview-svg-host svg").evaluate((svg) =>
    svg.querySelectorAll("animate, animateTransform, animateMotion, style, script").length,
  );
  assert(unsafeNodeCount === 0, "sanitized preview retained executable animation nodes");

  assert((await page.locator(".track-card", { hasText: "Animated Box • opacity" }).count()) === 1, "opacity track missing");
  assert((await page.locator(".track-card", { hasText: "Animated Box • fill" }).count()) === 1, "fill track missing");
  assert((await page.locator(".track-card", { hasText: "Animated Box • x" }).count()) === 1, "translate-x track missing");
  assert((await page.locator(".track-card", { hasText: "Animated Box • y" }).count()) === 1, "translate-y track missing");
  assert((await page.locator(".track-card", { hasText: "Needle • rotation" }).count()) === 1, "rotation track missing");

  await page.locator(".timeline-controls .inline-label", { hasText: "Current" }).locator("input").fill("450");
  const boxStyle = await page.locator(".preview-svg-host #box").evaluate((element) => ({
    opacity: Number(element.style.opacity),
    fill: window.getComputedStyle(element).fill,
    transform: element.style.transform,
  }));
  assert(boxStyle.opacity > 0.9, `imported opacity track did not scrub near the midpoint: ${boxStyle.opacity}`);
  assert(boxStyle.fill === "rgb(26, 109, 172)", `imported fill track did not interpolate at midpoint: ${boxStyle.fill}`);
  assert(boxStyle.transform.includes("translate("), `imported translate track did not apply: ${boxStyle.transform}`);

  const opacityTrack = page.locator(".track-card", { hasText: "Animated Box • opacity" }).first();
  await opacityTrack.locator(".track-keys li").nth(1).locator("input").nth(1).fill("0.4");
  const payload = await projectPayload(page);
  assert(payload.timeline.duration === 900, `timeline duration was not imported from SMIL dur: ${payload.timeline.duration}`);
  assert(payload.timeline.isLooping === true, "indefinite SMIL import did not preserve looping");
  assert(!payload.svg.source.includes("<animate"), "project export retained SMIL animate nodes");
  assert(!payload.svg.source.includes("<style"), "project export retained style node");
  assert(!payload.svg.source.includes("<script"), "project export retained script node");
  assert(payload.timeline.tracks.length === 5, `project export track count mismatch: ${payload.timeline.tracks.length}`);

  const exportedOpacityTrack = payload.timeline.tracks.find(
    (track) => track.targetId === "box" && track.property === "opacity",
  );
  assert(exportedOpacityTrack, "edited opacity track missing from project export");
  assert(
    exportedOpacityTrack.keyframes.some((keyframe) => keyframe.time === 450 && keyframe.value === "0.4"),
    "edited imported keyframe did not persist to project export",
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runUnitlessDurationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, unitlessDurationSvg);
  await page.waitForSelector(".preview-svg-host #clock");

  const payload = await projectPayload(page);
  assert(payload.timeline.duration === 2000, `unitless SMIL dur should import as seconds: ${payload.timeline.duration}`);
  const opacityTrack = payload.timeline.tracks.find(
    (track) => track.targetId === "clock" && track.property === "opacity",
  );
  assert(opacityTrack, "unitless duration opacity track missing");
  assert(
    opacityTrack.keyframes.some((keyframe) => keyframe.time === 2000 && keyframe.value === "1"),
    `unitless duration keyframe was not placed at 2000ms: ${JSON.stringify(opacityTrack.keyframes)}`,
  );

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runResetSampleDurationSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, unitlessDurationSvg);
  await page.waitForSelector(".preview-svg-host #clock");
  let payload = await projectPayload(page);
  assert(payload.timeline.duration === 2000, `setup import did not use the long duration: ${payload.timeline.duration}`);

  await openSourcePanel(page);
  await page.getByRole("button", { name: "Reset Sample" }).click();
  const sourcePanelText = await textOf(page.locator(".panel-svg-source"));
  assert(sourcePanelText.includes("Restored 3 sample tracks."), "reset sample status missing");
  payload = await projectPayload(page);
  assert(payload.timeline.duration === 1200, `reset sample did not restore sample duration: ${payload.timeline.duration}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runDiscreteCalcModeWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, discreteCalcModeSvg);
  await page.waitForSelector(".preview-svg-host #snap");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes('Unsupported calcMode "discrete" on #snap.'), "discrete calcMode warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `discrete calcMode should not import as linear tracks: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runFailedFileClearsWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, animatedSvg);
  await page.waitForSelector("[data-tadpole-animation-import-warnings]");

  await page.locator(".panel-svg-source input[type=file]").setInputFiles({
    name: "not-svg.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an svg"),
  });
  await page.locator(".panel-svg-source .error", { hasText: "Import failed: choose an SVG file." }).waitFor();
  const warningCount = await page.locator("[data-tadpole-animation-import-warnings]").count();
  assert(warningCount === 0, "failed file import left stale animation warnings visible");

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runUnsafeHrefWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, unsafeHrefSvg);
  await page.waitForSelector(".preview-svg-host #safe-parent");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported animate without a local target ID."), "unsafe href warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `unsafe href animation retargeted to parent: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runUnsafeXlinkHrefWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, unsafeXlinkHrefSvg);
  await page.waitForSelector(".preview-svg-host #safe-parent-xlink");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported animate without a local target ID."), "unsafe xlink:href warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `unsafe xlink:href animation retargeted to parent: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runOneArgumentTranslateSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, oneArgumentTranslateSvg);
  await page.waitForSelector(".preview-svg-host #slider");

  const payload = await projectPayload(page);
  const xTrack = payload.timeline.tracks.find((track) => track.targetId === "slider" && track.property === "x");
  const yTrack = payload.timeline.tracks.find((track) => track.targetId === "slider" && track.property === "y");
  assert(xTrack, "one-argument translate x track missing");
  assert(!yTrack, `one-argument translate created a y track: ${JSON.stringify(yTrack)}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runNonUniformScaleWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, nonUniformScaleSvg);
  await page.waitForSelector(".preview-svg-host #scaler");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported non-uniform scale values on #scaler."), "non-uniform scale warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `non-uniform scale imported as uniform track: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runPivotRotateWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, pivotRotateSvg);
  await page.waitForSelector(".preview-svg-host #spinner");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported pivoted rotate values on #spinner."), "pivoted rotate warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `pivoted rotate imported without pivot semantics: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runFiniteRepeatWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, finiteRepeatSvg);
  await page.waitForSelector(".preview-svg-host #repeater");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported repeatCount on #repeater."), "finite repeatCount warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `finite repeatCount imported as a single cycle: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runMalformedTransformWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, malformedTransformSvg);
  await page.waitForSelector(".preview-svg-host #skewed");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported malformed transform values on #skewed."), "malformed transform warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `malformed transform imported as motion: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runRgbaColorWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, rgbaColorSvg);
  await page.waitForSelector(".preview-svg-host #rgba-box");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported fill values on #rgba-box."), "rgba color warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `rgba color imported without alpha semantics: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runExtraTransformComponentWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, extraTransformComponentSvg);
  await page.waitForSelector(".preview-svg-host #extra");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported translate value arity on #extra."), "extra transform component warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `extra transform component imported as motion: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runCompositionWarningSmoke = async (browser) => {
  const additivePage = await createPage(browser);
  await importSvgMarkup(additivePage.page, additiveAnimationSvg);
  await additivePage.page.waitForSelector(".preview-svg-host #adder");

  const additiveWarnings = await textOf(additivePage.page.locator("[data-tadpole-animation-import-warnings]"));
  assert(additiveWarnings.includes('Unsupported additive "sum" on #adder.'), "additive warning missing");
  const additivePayload = await projectPayload(additivePage.page);
  assert(additivePayload.timeline.tracks.length === 0, `additive animation imported as absolute motion: ${additivePayload.timeline.tracks.length}`);
  assertCleanBrowser(additivePage.consoleErrors, additivePage.pageErrors);
  await additivePage.page.close();

  const accumulatedPage = await createPage(browser);
  await importSvgMarkup(accumulatedPage.page, accumulatedAnimationSvg);
  await accumulatedPage.page.waitForSelector(".preview-svg-host #accumulator");

  const accumulatedWarnings = await textOf(accumulatedPage.page.locator("[data-tadpole-animation-import-warnings]"));
  assert(accumulatedWarnings.includes('Unsupported accumulate "sum" on #accumulator.'), "accumulate warning missing");
  const accumulatedPayload = await projectPayload(accumulatedPage.page);
  assert(
    accumulatedPayload.timeline.tracks.length === 0,
    `accumulated animation imported without repeat accumulation semantics: ${accumulatedPayload.timeline.tracks.length}`,
  );
  assertCleanBrowser(accumulatedPage.consoleErrors, accumulatedPage.pageErrors);
  await accumulatedPage.page.close();
};

const runOneShotLoopingSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, oneShotAnimationSvg);
  await page.waitForSelector(".preview-svg-host #oneshot");

  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 1, `one-shot animation track was not imported: ${payload.timeline.tracks.length}`);
  assert(payload.timeline.isLooping === false, "one-shot SMIL import should not loop by default");

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runRepeatedKeyTimesWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, repeatedKeyTimesSvg);
  await page.waitForSelector(".preview-svg-host #keydupe");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Unsupported keyTimes or value count for opacity on #keydupe."), "repeated keyTimes warning missing");
  const payload = await projectPayload(page);
  assert(payload.timeline.tracks.length === 0, `repeated keyTimes imported zero-length segment: ${payload.timeline.tracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const runDuplicatePropertyWarningSmoke = async (browser) => {
  const { page, consoleErrors, pageErrors } = await createPage(browser);
  await importSvgMarkup(page, duplicatePropertyAnimationSvg);
  await page.waitForSelector(".preview-svg-host #dupe");

  const warningsText = await textOf(page.locator("[data-tadpole-animation-import-warnings]"));
  assert(warningsText.includes("Skipped duplicate opacity animation on #dupe."), "duplicate property warning missing");
  const payload = await projectPayload(page);
  const opacityTracks = payload.timeline.tracks.filter((track) => track.targetId === "dupe" && track.property === "opacity");
  assert(opacityTracks.length === 1, `duplicate property imported conflicting tracks: ${opacityTracks.length}`);

  assertCleanBrowser(consoleErrors, pageErrors);
  await page.close();
};

const browser = await chromium.launch({ headless: true });
try {
  await runAnimationImportSmoke(browser);
  await runUnitlessDurationSmoke(browser);
  await runResetSampleDurationSmoke(browser);
  await runDiscreteCalcModeWarningSmoke(browser);
  await runFailedFileClearsWarningSmoke(browser);
  await runUnsafeHrefWarningSmoke(browser);
  await runUnsafeXlinkHrefWarningSmoke(browser);
  await runOneArgumentTranslateSmoke(browser);
  await runNonUniformScaleWarningSmoke(browser);
  await runPivotRotateWarningSmoke(browser);
  await runFiniteRepeatWarningSmoke(browser);
  await runMalformedTransformWarningSmoke(browser);
  await runRgbaColorWarningSmoke(browser);
  await runExtraTransformComponentWarningSmoke(browser);
  await runCompositionWarningSmoke(browser);
  await runOneShotLoopingSmoke(browser);
  await runRepeatedKeyTimesWarningSmoke(browser);
  await runDuplicatePropertyWarningSmoke(browser);
  console.log("animation import browser smoke passed");
} finally {
  await browser.close();
}
