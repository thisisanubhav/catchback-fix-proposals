import { expect, test } from "@playwright/test";

test("promotional surfaces share visible rates, accessible definitions, and versions", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  for (const surface of ["homepage promotion", "selector promotion", "Pack odds"]) {
    const region = page.getByRole("region", { name: surface, exact: true });
    await expect(region).toHaveAttribute("data-version", "example-v1");
    await expect(region).toContainText("67%");
  }
  for (const rate of await page.getByTestId("win-rate").all()) {
    await expect(rate).toHaveAccessibleDescription(/reference value is at least the pack price/);
  }
  await page.getByLabel("Pack configuration").selectOption("updated");
  for (const surface of ["homepage promotion", "selector promotion", "Pack odds"]) {
    const region = page.getByRole("region", { name: surface, exact: true });
    await expect(region).toHaveAttribute("data-version", "example-v2");
    await expect(region).toContainText("60%");
    await expect(region).not.toContainText("67%");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("proposal.png"), fullPage: true });
  expect(errors).toEqual([]);
});

for (const scenario of ["loading", "error", "expired", "mismatch"]) {
  test(`${scenario} hides numeric rates and odds across all promotional surfaces`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("win-rate")).toHaveCount(2);
    await page.getByLabel("Pack configuration").selectOption(scenario);
    for (const surface of ["homepage promotion", "selector promotion", "Pack odds"]) {
      const region = page.getByRole("region", { name: surface, exact: true });
      await expect(region).not.toHaveAttribute("data-version");
      await expect(region).not.toContainText(/\d+\s*%/);
      await expect(region.getByRole("status")).toHaveText(scenario === "loading"
        ? "Loading current odds…" : "Current odds unavailable. Please retry.");
    }
    await page.getByLabel("Pack configuration").selectOption("current");
    await expect(page.getByTestId("win-rate")).toHaveCount(2);
  });
}

test("an already rendered snapshot loses its claims when it expires", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(250);
  await expect(page.getByTestId("win-rate")).toHaveCount(2);
  await page.clock.fastForward(301_000);
  await expect(page.getByTestId("win-rate")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Pack odds", exact: true })).not.toContainText(/\d+\s*%/);
});

for (const action of ["Skip", "Reveal demo result"]) {
  test(`Open Demo → ${action} cannot claim ownership`, async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open Demo", exact: true }).click();
    await page.getByRole("button", { name: action, exact: true }).click();
    const result = page.getByRole("region", { name: "Opening result", exact: true });
    const heading = result.getByRole("heading", { name: "Demo — no card awarded", exact: true });
    await expect(heading).toBeVisible();
    await expect(result).toContainText("No purchase was made");
    await expect(result).toContainText("estimated reference value");
    await expect(result).not.toContainText("Your pull has been added to your vault");
    await expect(result.getByRole("link", { name: "View My Vault" })).toHaveCount(0);
    await expect(result.getByRole("link", { name: "Explore Packs" })).toBeVisible();
    const headingBox = await heading.boundingBox();
    const cardBox = await result.locator(".sample-card").boundingBox();
    expect(headingBox!.y + headingBox!.height).toBeLessThan(cardBox!.y);
    await result.screenshot({ path: testInfo.outputPath("demo-result.png") });
  });
}

test("paid fixture preserves the award confirmation and pending/error states do not", async ({ page }, testInfo) => {
  await page.goto("/");
  const result = page.getByRole("region", { name: "Opening result", exact: true });
  await page.getByRole("button", { name: "Paid success fixture" }).click();
  await expect(result.getByRole("heading")).toHaveText("Your pull has been added to your vault");
  await expect(result.getByRole("link", { name: "View My Vault" })).toHaveAttribute("href", "/vault");
  await expect(result).not.toContainText("Demo — no card awarded");
  await result.screenshot({ path: testInfo.outputPath("paid-result.png") });
  await page.getByRole("button", { name: "Pending fixture" }).click();
  await expect(result.getByRole("heading")).toHaveText("Your opening is still processing");
  await expect(result.getByRole("link", { name: "View My Vault" })).toHaveCount(0);
  await page.getByRole("button", { name: "Unverified fixture" }).click();
  await expect(result.getByRole("heading")).toHaveText("We couldn’t verify this opening");
  await expect(result.getByRole("link", { name: "View My Vault" })).toHaveCount(0);
});

test("URL parameters cannot enable paid success", async ({ page }) => {
  for (const query of ["demo=false&paid=true", "demo=false&opening_id=forged&payment_status=paid", "demo=true&opening_id=forged&paid=true"]) {
    await page.goto(`/?${query}`);
    const result = page.getByRole("region", { name: "Opening result", exact: true });
    await expect(result.getByRole("heading")).toHaveText(query.startsWith("demo=true")
      ? "Demo — no card awarded" : "We couldn’t verify this opening");
    await expect(result.getByRole("link", { name: "View My Vault" })).toHaveCount(0);
  }
});
