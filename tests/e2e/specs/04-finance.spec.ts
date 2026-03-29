import { expect, test } from "@playwright/test";

import { GOLDEN_STORAGE_STATE_PATH, readGoldenRuntime } from "../support/golden-runtime";
import { waitForFinanceQueryReady, waitForPageReady } from "../support/golden-helpers";

test.use({ storageState: GOLDEN_STORAGE_STATE_PATH });

test.describe("04 Finance", () => {
  test("薪资结算、跨月核对与最终清理", async ({ page }) => {
    test.slow();

    const runtime = await readGoldenRuntime();
    const { scenario, caregiverDetailPath } = runtime;
    expect(caregiverDetailPath).toBeTruthy();

    await page.goto("/salary-settlement");
    await waitForPageReady(page);
    await page.locator('input[type="month"]').fill(scenario.currentMonth);
    await page.getByRole("button", { name: "查询" }).click();
    await waitForFinanceQueryReady(page);

    const candidateRow = page.locator("tr", { hasText: scenario.caregiverUpdatedName }).first();
    await expect(candidateRow).toBeVisible({ timeout: 30_000 });
    await candidateRow.getByRole("button", { name: "去结算" }).click();

    const settlementDialog = page.getByRole("dialog");
    await expect(settlementDialog.getByText(scenario.fullOrderClientName)).toBeVisible();
    await expect(settlementDialog.getByText(scenario.crossOrderClientName)).toBeVisible();
    await expect(settlementDialog.getByText("¥1,500.00")).toBeVisible();
    await settlementDialog.getByRole("button", { name: "确认生成结算单" }).click();
    await expect(page.getByText("结算单已生成", { exact: true })).toBeVisible();
    await expect(page.getByText(`${scenario.caregiverUpdatedName} ${scenario.currentMonth} 的结算单已生成`, { exact: false })).toBeVisible();

    await page.getByRole("tab", { name: /已生成记录/ }).click();
    await waitForFinanceQueryReady(page);
    const historyRow = page.locator("tr", { hasText: scenario.caregiverUpdatedName }).first();
    await expect(historyRow).toBeVisible({ timeout: 30_000 });
    await expect(historyRow.getByText("¥ 1,500.00")).toBeVisible();
    await expect(historyRow.getByText("已结算")).toBeVisible();

    await page.goto(caregiverDetailPath!);
    await page.locator("button").filter({ has: page.locator("svg.lucide-trash2") }).first().click();
    await expect(page.getByText("确认删除该护理员？")).toBeVisible();
    await page.getByRole("button", { name: "确认删除" }).click();
    await expect(page).toHaveURL(/\/caregivers$/);
    await expect(page.getByText(scenario.caregiverUpdatedName)).toHaveCount(0);
  });
});
