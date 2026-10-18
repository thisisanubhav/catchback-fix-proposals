import { expect, test, type Locator, type TestInfo } from "@playwright/test";

function viewports(info: TestInfo) {
  return info.project.name === "mobile" ? [{ width: 390, height: 844 }]
    : [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }];
}

async function assertPointerTarget(button: Locator) {
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  expect(await button.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return !!hit && element.contains(hit) && rect.left >= 0 && rect.right <= innerWidth;
  })).toBe(true);
}

test("both pagers are independently clickable and preserve selections at every target width", async ({ page }, info) => {
  for (const size of viewports(info)) {
    await page.setViewportSize(size);
    await page.goto(`/?demo=true&viewport=${size.width}#catalog-preview`);
    const catalog = page.getByRole("region", { name: "Custom pack catalog", exact: true });
    const top = catalog.getByRole("navigation", { name: "Top catalog pagination" });
    const bottom = catalog.getByRole("navigation", { name: "Bottom catalog pagination" });
    const next = top.getByRole("button", { name: "Next page" });
    const previous = top.getByRole("button", { name: "Previous page" });
    const bottomNext = bottom.getByRole("button", { name: "Next page" });
    const bottomPrevious = bottom.getByRole("button", { name: "Previous page" });
    const activate = async (button: Locator) => {
      await assertPointerTarget(button);
      if (info.project.name === "mobile") await button.tap(); else await button.click();
    };
    const expectPage = async (value: number) => {
      await expect(top).toContainText(`Page ${value} of 3`);
      await expect(bottom).toContainText(`Page ${value} of 3`);
    };
    await expectPage(1);
    await expect(previous).toBeDisabled();
    await expect(bottomPrevious).toBeDisabled();
    const first = catalog.getByRole("button", { name: "Select Example card 01", exact: true });
    await activate(first);
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(catalog.getByRole("complementary", { name: "Selected cards" })).toContainText("1 selected");

    await next.scrollIntoViewIfNeeded();
    const filtersBox = (await catalog.getByRole("group", { name: "Catalog filters" }).boundingBox())!;
    const pagerBox = (await top.boundingBox())!;
    expect(pagerBox.y).toBeGreaterThanOrEqual(filtersBox.y + filtersBox.height);
    await activate(next);
    await expectPage(2);
    await expect(catalog.getByRole("button", { name: "Select Example card 07", exact: true })).toBeVisible();
    await activate(bottomNext);
    await expectPage(3);
    await expect(next).toBeDisabled();
    await expect(bottomNext).toBeDisabled();
    await expect(catalog.getByRole("button", { name: "Select Example card 13", exact: true })).toBeVisible();
    await activate(bottomPrevious);
    await expectPage(2);
    await activate(previous);
    await expectPage(1);
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(catalog.getByRole("combobox", { name: "Sort", exact: true })).toHaveValue("asc");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await catalog.screenshot({ path: info.outputPath(`catalog-${size.width}.png`) });
  }
});

test("sorting and filters reset the page without clearing selected card IDs", async ({ page }, info) => {
  for (const size of viewports(info)) {
    await page.setViewportSize(size);
    await page.goto(`/?demo=true&viewport=${size.width}#catalog-preview`);
    const catalog = page.getByRole("region", { name: "Custom pack catalog", exact: true });
    const top = catalog.getByRole("navigation", { name: "Top catalog pagination" });
    const bottom = catalog.getByRole("navigation", { name: "Bottom catalog pagination" });
    await catalog.getByRole("button", { name: "Select Example card 01", exact: true }).click();
    await top.getByRole("button", { name: "Next page" }).click();
    await catalog.getByRole("combobox", { name: "Sort", exact: true }).selectOption("desc");
    await expect(top).toContainText("Page 1 of 3");
    await expect(bottom).toContainText("Page 1 of 3");
    await expect(catalog.getByRole("list", { name: "Card results" }).getByRole("button").first()).toHaveAccessibleName("Select Example card 18");
    await catalog.getByRole("combobox", { name: "Category", exact: true }).selectOption("Sports");
    await expect(top).toContainText("Page 1 of 1");
    await expect(top.getByRole("button", { name: "Next page" })).toBeDisabled();
    await catalog.getByLabel("Search cards", { exact: true }).fill("no-matching-card");
    await expect(top).toContainText("Page 0 of 0");
    await expect(bottom).toContainText("Page 0 of 0");
    for (const button of await catalog.getByRole("navigation").getByRole("button").all()) await expect(button).toBeDisabled();
    await catalog.getByRole("button", { name: "Reset filters" }).click();
    await catalog.getByRole("combobox", { name: "Sort", exact: true }).selectOption("asc");
    await expect(catalog.getByRole("button", { name: "Select Example card 01", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(catalog.getByRole("complementary", { name: "Selected cards" })).toContainText("1 selected");
  }
});

test("both pagers support keyboard activation and announce the shared page", async ({ page }, info) => {
  for (const size of viewports(info)) {
    await page.setViewportSize(size);
    await page.goto(`/?demo=true&viewport=${size.width}#catalog-preview`);
    const catalog = page.getByRole("region", { name: "Custom pack catalog", exact: true });
    const next = catalog.getByRole("navigation", { name: "Top catalog pagination" }).getByRole("button", { name: "Next page" });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(catalog.getByRole("status").filter({ hasText: "Showing" })).toHaveText("Showing 7–12 of 18 cards. Page 2 of 3.");
    const previous = catalog.getByRole("navigation", { name: "Bottom catalog pagination" }).getByRole("button", { name: "Previous page" });
    await previous.focus();
    await page.keyboard.press("Space");
    await expect(catalog.getByRole("status").filter({ hasText: "Showing" })).toHaveText("Showing 1–6 of 18 cards. Page 1 of 3.");
  }
});
