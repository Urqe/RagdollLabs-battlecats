import { test, expect } from "@playwright/test";
test("start launches animated battlefield without JavaScript errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#hud")).toBeHidden();
  await page.getByRole("button", { name: "DEFEND THE CASTLE" }).click();
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("#blueCount")).not.toHaveText("0");
  await expect(page.locator("#result")).toBeHidden();
  expect(
    await page.locator("#game").evaluate((c) => c.width > 0 && c.height > 0),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("sound defaults to muted and remembers the menu toggle", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const toggle = page.locator("#menu [data-sound]");
  await expect(toggle).toHaveText("Sound off");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(toggle).toHaveText("Sound on");
  await page.getByRole("button", { name: "DEFEND THE CASTLE" }).click();
  await expect(page.locator("#blueCount")).not.toHaveText("0");
  await page.reload();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "DEFEND THE CASTLE" }).click();
  await expect(page.locator("[data-sound]").first()).toBeHidden();
  expect(errors).toEqual([]);
});
