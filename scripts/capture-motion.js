import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createAim } from "../tests/helpers/strategies.js";

const output = resolve(process.argv[2] ?? "test-results/motion");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: output, size: { width: 390, height: 844 } },
});
const origin = performance.now();
const elapsed = () => (performance.now() - origin) / 1000;
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const marks = {};
const victoryFrame = resolve(output, "victory-frame.png");
let master;
try {
  await page.goto("http://127.0.0.1:4173");
  await page.addStyleTag({
    content: "#hud, #banner { visibility: hidden !important; }",
  });
  await page.locator("#play").click();
  marks.start = elapsed();
  const box = await page.locator("#game").boundingBox();
  const client = await context.newCDPSession(page);
  const aim = createAim("C");
  const snapshot = () =>
    page.evaluate(async () => (await import("/src/main.js")).getSnapshot());
  let target = 210;
  while (elapsed() < 140) {
    const state = await snapshot();
    if (state.squads.some((q) => q.mult === 99)) marks.gate99 ??= elapsed();
    if (state.squads.some((q) => q.mult === 999)) marks.gate999 ??= elapsed();
    if (state.mode === "victory") marks.cleared ??= elapsed();
    if (state.mode === "end") {
      marks.result = elapsed();
      break;
    }
    if (state.mode === "playing") {
      const next = aim(state);
      if (next !== target) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height * 0.88;
        await client.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + ((next - state.gunX) / 420) * box.width, y }],
        });
        await client.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        target = next;
      }
    }
    await new Promise((done) => setTimeout(done, 23));
  }
  if (!marks.result || !marks.cleared || errors.length) {
    throw new Error(
      `Recording did not reach a clean victory: ${JSON.stringify({ marks, errors })}`,
    );
  }
  await page.getByRole("heading", { name: "The castle stands!" }).waitFor();
  await page.screenshot({ path: victoryFrame, scale: "css" });
  await new Promise((done) => setTimeout(done, 400));
  const video = page.video();
  await context.close();
  master = await video.path();
} finally {
  await browser.close();
}

function clip(name, segments, ending = null) {
  const filter = segments.map(
    ([start, end, speed = 1], i) =>
      `[0:v]trim=start=${start}:end=${end},setpts=(PTS-STARTPTS)/${speed},setsar=1,format=yuv420p[v${i}]`,
  );
  if (ending)
    filter.push(
      "[1:v]trim=duration=1.3,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[victory]",
    );
  const inputs =
    segments.map((_, i) => `[v${i}]`).join("") + (ending ? "[victory]" : "");
  filter.push(
    `${inputs}concat=n=${segments.length + Number(Boolean(ending))}:v=1:a=0[out]`,
  );
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      master,
      ...(ending ? ["-loop", "1", "-framerate", "25", "-i", ending] : []),
      "-filter_complex_threads",
      "1",
      "-filter_complex",
      filter.join(";"),
      "-map",
      "[out]",
      "-r",
      "25",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "24",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      resolve(output, name),
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0)
    throw new Error(`FFmpeg failed for ${name}`, { cause: result.error });
}

clip("a-gate-multiplication.mp4", [
  [marks.start + 1.7, marks.start + 5.8],
  [marks.gate99 - 0.65, marks.gate99 + 4.8],
  [marks.gate999 - 0.7, marks.gate999 + 5.3],
]);
clip("b-frontline-reversal.mp4", [[marks.gate99 - 5.3, marks.gate99 + 11.4]]);
clip(
  "c-final-counterattack.mp4",
  [
    [marks.gate999 - 0.6, marks.gate999 + 6.5],
    [marks.gate999 + 12, marks.cleared - 6.5, 2.2],
    [marks.cleared - 6.5, marks.result],
  ],
  victoryFrame,
);
await writeFile(resolve(output, "timing.json"), JSON.stringify(marks, null, 2));
console.log(`Recorded three clips in ${output}`);
