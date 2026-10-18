import { expect, test, type Locator } from "@playwright/test";

const numberName = (index: number) => `Odds for Example card ${index} (%)`;
const sliderName = (index: number) => `Adjust odds for Example card ${index}`;
async function assertTotal(editor: Locator) {
  const values = await editor.getByRole("spinbutton").evaluateAll(inputs =>
    inputs.map(input => Math.round(Number((input as HTMLInputElement).value) * 100)));
  expect(values.reduce((sum, value) => sum + value, 0)).toBe(10000);
}

test("keyboard reaches number then slider then lock and announces recalculated odds", async ({ page }) => {
  await page.goto("/#custom-odds");
  const editor = page.getByRole("region", { name: "Custom odds editor" });
  await editor.getByRole("button", { name: "Reset odds" }).focus();
  await page.keyboard.press("Tab");
  const number = editor.getByRole("spinbutton", { name: numberName(1), exact: true });
  await expect(number).toBeFocused();
  await expect(number).toHaveAccessibleDescription(/Press Enter or leave the field to apply/);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("30");
  await page.keyboard.press("Tab");
  const slider = editor.getByRole("slider", { name: sliderName(1), exact: true });
  await expect(slider).toBeFocused();
  await expect(number).toHaveValue("30.00");
  for (let index = 2; index <= 5; index++) {
    await expect(editor.getByRole("spinbutton", { name: numberName(index), exact: true })).toHaveValue("17.50");
  }
  await expect(editor.getByRole("status")).toContainText("Example card 2: 17.50%");
  await page.keyboard.press("ArrowRight");
  await expect(number).toHaveValue("30.01");
  await expect(slider).toHaveAttribute("aria-valuetext", "30.01 percent");
  await page.keyboard.press("Tab");
  const lock = editor.getByRole("button", { name: "Lock odds for Example card 1", exact: true });
  await expect(lock).toBeFocused();
  await page.keyboard.press("Space");
  await expect(lock).toHaveAttribute("aria-pressed", "true");
  await expect(number).toBeDisabled();
  await expect(slider).toBeDisabled();
  await expect(editor.getByRole("status")).toContainText("Example card 1 locked at 30.01%");
  await assertTotal(editor);
});

test("slider Home and End preserve totals and recover from zero-weight peers", async ({ page }) => {
  await page.goto("/#custom-odds");
  const editor = page.getByRole("region", { name: "Custom odds editor" });
  const slider = editor.getByRole("slider", { name: sliderName(1), exact: true });
  const number = editor.getByRole("spinbutton", { name: numberName(1), exact: true });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(number).toHaveValue("100.00");
  await assertTotal(editor);
  await page.keyboard.press("Home");
  await expect(number).toHaveValue("0.00");
  for (let index = 2; index <= 5; index++) {
    await expect(editor.getByRole("spinbutton", { name: numberName(index), exact: true })).toHaveValue("25.00");
  }
  await assertTotal(editor);
});

test("invalid and empty inputs explain the error without changing the distribution", async ({ page }) => {
  await page.goto("/#custom-odds");
  const editor = page.getByRole("region", { name: "Custom odds editor" });
  const number = editor.getByRole("spinbutton", { name: numberName(1), exact: true });
  const slider = editor.getByRole("slider", { name: sliderName(1), exact: true });
  for (const invalid of ["", "101", "-1", "20.001"]) {
    await number.fill(invalid);
    await number.press("Tab");
    await expect(number).toHaveAttribute("aria-invalid", "true");
    await expect(number).toHaveAccessibleDescription(/Odds have not changed/);
    await expect(editor.getByRole("alert")).toBeVisible();
    await expect(slider).toHaveValue("20");
    await expect(editor.getByRole("spinbutton", { name: numberName(2), exact: true })).toHaveValue("20.00");
  }
  await number.focus();
  await number.press("Escape");
  await expect(number).toHaveValue("20.00");
  await expect(number).toHaveAttribute("aria-invalid", "false");
  await number.fill("30");
  await number.press("Enter");
  await expect(number).toHaveValue("30.00");
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await assertTotal(editor);
});

test("locks constrain redistribution and reset restores editable odds", async ({ page }) => {
  await page.goto("/#custom-odds");
  const editor = page.getByRole("region", { name: "Custom odds editor" });
  for (let index = 2; index <= 5; index++) {
    await editor.getByRole("button", { name: `Lock odds for Example card ${index}`, exact: true }).click();
  }
  const number = editor.getByRole("spinbutton", { name: numberName(1), exact: true });
  await expect(number).toBeDisabled();
  await expect(number).toHaveAccessibleDescription("Unlock another card to redistribute the odds.");
  await editor.getByRole("button", { name: "Lock odds for Example card 2", exact: true }).click();
  await expect(number).toBeEnabled();
  await expect(number).toHaveAttribute("max", "40");
  await number.fill("30");
  await number.press("Enter");
  await expect(editor.getByRole("spinbutton", { name: numberName(2), exact: true })).toHaveValue("10.00");
  for (let index = 3; index <= 5; index++) {
    await expect(editor.getByRole("spinbutton", { name: numberName(index), exact: true })).toHaveValue("20.00");
  }
  await assertTotal(editor);
  const reset = editor.getByRole("button", { name: "Reset odds" });
  await reset.click();
  await expect(reset).toBeFocused();
  await expect(editor.getByRole("status")).toContainText("All cards unlocked");
  for (const input of await editor.getByRole("spinbutton").all()) {
    await expect(input).toHaveValue("20.00");
    await expect(input).toBeEnabled();
  }
});

test("pointer or touch can adjust native sliders without overflow", async ({ page }, testInfo) => {
  await page.goto("/#custom-odds");
  const editor = page.getByRole("region", { name: "Custom odds editor" });
  const slider = editor.getByRole("slider", { name: sliderName(1), exact: true });
  await slider.scrollIntoViewIfNeeded();
  const bounds = (await slider.boundingBox())!;
  const x = bounds.x + bounds.width * 0.7;
  const y = bounds.y + bounds.height / 2;
  if (testInfo.project.name === "mobile") await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(editor.getByRole("spinbutton", { name: numberName(1), exact: true })).not.toHaveValue("20.00");
  await assertTotal(editor);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await editor.screenshot({ path: testInfo.outputPath("custom-odds.png") });
});
